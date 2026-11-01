import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import { airuDocumentsTable as documents, airuFoldersTable as folders, airuLensesTable as lenses } from '../../infrastructure/db/drizzle/schema';
import { AppError } from '../../core/errors/AppError';
import { bookConfigSchema, readBookConfig } from '../book/contract';

export type LifecycleState = 'active' | 'archived' | 'trashed';
type Scope = { orgId: string; userId: string };
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {}; }
function state(metadata: unknown): LifecycleState {
  const value = record(record(metadata).airunoteLifecycle).state;
  return value === 'archived' || value === 'trashed' ? value : 'active';
}
function conflict(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') throw new AppError('The parent already contains an item with the same name. Rename it first. Nothing was moved or deleted.', 409, 'NAME_CONFLICT');
  if (error && typeof error === 'object' && 'cause' in error && error.cause !== error) return conflict(error.cause);
  throw error;
}
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function requireActiveAncestors(tx: Transaction, scope: Scope, id: string) {
  const rows = await tx.execute<{ metadata: unknown }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_folder_id, metadata FROM airu_folders
      WHERE id=${id}::uuid AND org_id=${scope.orgId}::uuid AND owner_user_id=${scope.userId}::uuid
      UNION
      SELECT p.id, p.parent_folder_id, p.metadata FROM airu_folders p JOIN ancestors a ON p.id=a.parent_folder_id
      WHERE p.org_id=${scope.orgId}::uuid AND p.owner_user_id=${scope.userId}::uuid
    ) SELECT metadata FROM ancestors`);
  if (!rows.length || rows.some(row => state(row.metadata) !== 'active')) throw new AppError('Restore the parent folder first.', 409, 'PARENT_INACTIVE');
}

/** Owner-scoped lifecycle changes. Promotion and trashing commit together or roll back together. */
export class AirunoteLifecycleRepository {
  async folder(scope: Scope, id: string, next: LifecycleState, expected: LifecycleState) {
    try {
      return await db.transaction(async tx => {
        const owner = and(eq(folders.orgId, scope.orgId), eq(folders.ownerUserId, scope.userId));
        // Serialize lifecycle operations for this owner without locking unrelated workspaces.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scope.orgId + ':' + scope.userId}, 0))`);
        const [folder] = await tx.select().from(folders).where(and(owner, eq(folders.id, id))).for('update');
        if (!folder) throw new AppError('Folder not found or access denied.', 404, 'NOT_FOUND');
        if (folder.id === folder.parentFolderId || ['__user_root__', '__org_root__'].includes(folder.humanId)) throw new AppError('Workspace roots cannot be archived or deleted.', 400, 'ROOT_PROTECTED');
        if (state(folder.metadata) !== expected) throw new AppError('This folder changed. Refresh before trying again.', 409, 'CONFLICT');
        const [parent] = await tx.select().from(folders).where(and(owner, eq(folders.id, folder.parentFolderId))).for('update');
        if (!parent) throw new AppError('Parent folder not found or access denied.', 404, 'NOT_FOUND');
        await requireActiveAncestors(tx, scope, parent.id);
        const promotedFolders: Array<{ id: string; parentFolderId: string; metadata?: Record<string, unknown> }> = [];
        const promotedDocuments: Array<{ id: string; folderId: string; updatedAt: Date }> = [];
        if (next === 'trashed' && expected !== 'trashed') {
          // Preserve inherited sprint identities when their defining folder is removed.
          const source = readBookConfig(folder.metadata), destination = readBookConfig(parent.metadata);
          if (!source || !destination) throw new AppError('This folder has an unsupported planning configuration. Nothing was moved.', 409, 'UNSUPPORTED_BOOK_VERSION');
          if (source.sprints.length) {
            const merged = new Map(destination.sprints.map(sprint => [sprint.id, sprint]));
            for (const sprint of source.sprints) {
              const existing = merged.get(sprint.id);
              if (existing && JSON.stringify(existing) !== JSON.stringify(sprint)) throw new AppError('The parent has a conflicting sprint definition. Nothing was moved.', 409, 'SPRINT_CONFLICT');
              merged.set(sprint.id, sprint);
            }
            const config = bookConfigSchema.safeParse({ ...destination, revision: destination.revision + 1, sprints: [...merged.values()] });
            if (!config.success) throw new AppError('The parent cannot hold these sprint definitions. Nothing was moved.', 409, 'CONFIG_LIMIT');
            const metadata = { ...record(parent.metadata), airunoteBook: config.data };
            await tx.update(folders).set({ metadata: sql`${JSON.stringify(metadata)}::text::jsonb` }).where(eq(folders.id, parent.id));
            promotedFolders.push({ id: parent.id, parentFolderId: parent.parentFolderId, metadata });
          }
          // No cascade: direct children move one level up; nested branches and lens ownership stay intact.
          promotedFolders.push(...await tx.update(folders).set({ parentFolderId: parent.id }).where(and(owner, eq(folders.parentFolderId, id))).returning({ id: folders.id, parentFolderId: folders.parentFolderId }));
          promotedDocuments.push(...await tx.update(documents).set({ folderId: parent.id, updatedAt: new Date() }).where(and(eq(documents.folderId, id), eq(documents.ownerUserId, scope.userId))).returning({ id: documents.id, folderId: documents.folderId, updatedAt: documents.updatedAt }));
        }
        if (next === 'trashed' && expected !== 'trashed') await tx.update(lenses).set({ folderId: parent.id, updatedAt: new Date() }).where(and(eq(lenses.folderId, id), eq(lenses.type, 'collection')));
        const metadata = { ...record(folder.metadata), airunoteLifecycle: { state: next, changedAt: new Date().toISOString() } };
        await tx.update(folders).set({ metadata: sql`${JSON.stringify(metadata)}::text::jsonb` }).where(and(owner, eq(folders.id, id)));
        return { folder: { id, parentFolderId: parent.id, metadata }, folders: promotedFolders, documents: promotedDocuments };
      });
    } catch (error) { return conflict(error); }
  }

  async document(scope: Scope, id: string, next: LifecycleState, expectedUpdatedAt: string) {
    return db.transaction(async tx => {
      const [row] = await tx.select({ id: documents.id, folderId: documents.folderId, updatedAt: documents.updatedAt }).from(documents).innerJoin(folders, eq(documents.folderId, folders.id))
        .where(and(eq(documents.id, id), eq(documents.ownerUserId, scope.userId), eq(folders.orgId, scope.orgId), eq(folders.ownerUserId, scope.userId))).for('update', { of: documents });
      if (!row) throw new AppError('Note not found or access denied.', 404, 'NOT_FOUND');
      if (row.updatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) throw new AppError('This note changed. Refresh before trying again.', 409, 'CONFLICT');
      if (next === 'active') await requireActiveAncestors(tx, scope, row.folderId);
      const [saved] = await tx.update(documents).set({ state: next, updatedAt: new Date() }).where(eq(documents.id, id)).returning({ id: documents.id, state: documents.state, updatedAt: documents.updatedAt });
      if (!saved) throw new AppError('Note not found.', 404, 'NOT_FOUND');
      return saved;
    });
  }
}
