import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../infrastructure/db/drizzle/client';
import { airuDocumentsTable as documents, airuFoldersTable as folders, airuLensesTable as lenses } from '../../infrastructure/db/drizzle/schema';
import { collectionConfigSchema } from './collections.contract';
import { AppError } from '../../core/errors/AppError';

export const spaceLinkSchema = z.object({ entityId: z.string().uuid(), entityType: z.enum(['document', 'folder', 'collection']) }).strict();
export type SpaceLink = z.infer<typeof spaceLinkSchema>;
type Scope = { orgId: string; userId: string };
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {}; }

async function requireActiveSpace(tx: Transaction, scope: Scope, id: string) {
  const rows = await tx.execute<{ metadata: unknown }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_folder_id, metadata FROM airu_folders
      WHERE id=${id}::uuid AND org_id=${scope.orgId}::uuid AND owner_user_id=${scope.userId}::uuid
      UNION
      SELECT p.id, p.parent_folder_id, p.metadata FROM airu_folders p JOIN ancestors a ON p.id=a.parent_folder_id
      WHERE p.org_id=${scope.orgId}::uuid AND p.owner_user_id=${scope.userId}::uuid
    ) SELECT metadata FROM ancestors`);
  if (!rows.length || rows.some(row => ['archived', 'trashed'].includes(String(record(record(row.metadata).airunoteLifecycle).state)))) {
    throw new AppError('This Space is unavailable. Restore it before adding links.', 409, 'SPACE_UNAVAILABLE');
  }
}

/** References only: the target's home, contents and access never change. */
export class SpaceLinksRepository {
  async change(scope: Scope, folderId: string, link: SpaceLink, remove = false) {
    return db.transaction(async tx => {
      // Share the lifecycle lock so archiving and linking cannot race each other.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scope.orgId + ':' + scope.userId}, 0))`);
      const [space] = await tx.select().from(folders).where(and(eq(folders.id, folderId), eq(folders.orgId, scope.orgId), eq(folders.ownerUserId, scope.userId))).for('update');
      if (!space) throw new AppError('Space not found or access denied.', 404, 'NOT_FOUND');
      await requireActiveSpace(tx, scope, folderId);
      if (space.metadata !== null && (typeof space.metadata !== 'object' || Array.isArray(space.metadata))) throw new AppError('Existing Space settings could not be read. They have been preserved.', 409, 'INVALID_METADATA');
      const metadata = record(space.metadata);
      const parsed = z.array(spaceLinkSchema).safeParse(metadata.airunoteSpaceLinks ?? []);
      if (!parsed.success) throw new AppError('Existing links could not be read. They have been preserved.', 409, 'INVALID_LINKS');
      const current = parsed.data;
      const matches = (value: SpaceLink) => value.entityId === link.entityId && value.entityType === link.entityType;
      if (!remove) {
        let home: string;
        if (link.entityType === 'folder') {
          const [target] = await tx.select().from(folders).where(and(eq(folders.id, link.entityId), eq(folders.orgId, scope.orgId), eq(folders.ownerUserId, scope.userId)));
          if (!target) throw new AppError('Linked Space not found or access denied.', 404, 'NOT_FOUND');
          if (target.id === folderId || target.id === target.parentFolderId) throw new AppError('Choose another Space.', 400, 'INVALID_TARGET');
          home = target.id;
          if (target.parentFolderId === folderId) throw new AppError('This Space is already here.', 409, 'ALREADY_HERE');
        } else if (link.entityType === 'collection') {
          const [target] = await tx.select().from(lenses).where(and(eq(lenses.id, link.entityId), eq(lenses.type, 'collection')));
          const parsed = collectionConfigSchema.safeParse(record(target?.metadata).airunoteCollection);
          if (!target?.folderId || !parsed.success || parsed.data.orgId !== scope.orgId || parsed.data.ownerUserId !== scope.userId) throw new AppError('Collection not found or access denied.', 404, 'NOT_FOUND');
          home = target.folderId;
          if (home === folderId) throw new AppError('This collection is already here.', 409, 'ALREADY_HERE');
        } else {
          const [target] = await tx.select({ folderId: documents.folderId, state: documents.state }).from(documents).innerJoin(folders, eq(documents.folderId, folders.id)).where(and(eq(documents.id, link.entityId), eq(documents.ownerUserId, scope.userId), eq(folders.ownerUserId, scope.userId), eq(folders.orgId, scope.orgId)));
          if (!target) throw new AppError('Linked note not found or access denied.', 404, 'NOT_FOUND');
          if (target.state !== 'active') throw new AppError('Restore this note before linking it.', 409, 'NOTE_UNAVAILABLE');
          home = target.folderId;
          if (home === folderId) throw new AppError('This note is already here.', 409, 'ALREADY_HERE');
        }
        await requireActiveSpace(tx, scope, home);
        if (!current.some(matches) && current.length >= 500) throw new AppError('This Space has reached its 500-link limit.', 409, 'LINK_LIMIT');
      }
      const links = remove ? current.filter(value => !matches(value)) : current.some(matches) ? current : [...current, link];
      // Explicit text→jsonb matches existing metadata writes and avoids driver double encoding.
      const nextMetadata = { ...metadata, airunoteSpaceLinks: links };
      const [updated] = await tx.update(folders).set({ metadata: sql`${JSON.stringify(nextMetadata)}::text::jsonb` }).where(eq(folders.id, folderId)).returning();
      if (!updated) throw new AppError('Space could not be updated.', 409, 'CONFLICT');
      return { id: updated.id, metadata: updated.metadata };
    });
  }
}
