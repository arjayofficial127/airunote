import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import { airuDocumentsTable, airuFoldersTable, airuDocumentRevisionsTable, orgsTable } from '../../infrastructure/db/drizzle/schema';
import { NotFoundError } from '../../core/errors/AppError';
import { readBookConfig } from './contract';

export type BookScope = { orgId: string; userId: string };
export type BookTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type StoredBookDocument = typeof airuDocumentsTable.$inferSelect;
export class BookRepository {
  transaction<T>(work: (tx: BookTransaction) => Promise<T>): Promise<T> { return db.transaction(work); }

  async hasSprint(tx: BookTransaction, scope: BookScope, folderId: string, rootId: string, sprintId: string) {
    // A root Notes workspace can edit an existing nested Book without copying its configuration.
    // Only ancestors of the target folder, up to this workspace root, can supply its sprint.
    const rows = await tx.execute<{ metadata: unknown }>(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_folder_id, metadata FROM airu_folders
        WHERE id = ${folderId}::uuid AND org_id = ${scope.orgId}::uuid AND owner_user_id = ${scope.userId}::uuid
        UNION
        SELECT p.id, p.parent_folder_id, p.metadata FROM airu_folders p JOIN ancestors a ON p.id = a.parent_folder_id
        WHERE a.id <> ${rootId}::uuid AND p.org_id = ${scope.orgId}::uuid AND p.owner_user_id = ${scope.userId}::uuid
      ) SELECT metadata FROM ancestors`);
    return rows.some(row => readBookConfig(row.metadata)?.sprints.some(sprint => sprint.id === sprintId));
  }

  async folder(tx: BookTransaction, scope: BookScope, id: string, lock = false) {
    const query = tx.select().from(airuFoldersTable).where(and(eq(airuFoldersTable.id, id), eq(airuFoldersTable.orgId, scope.orgId), eq(airuFoldersTable.ownerUserId, scope.userId)));
    const [folder] = await (lock ? query.for('update') : query);
    if (!folder) throw new NotFoundError('Folder');
    return folder;
  }

  async withinRoot(tx: BookTransaction, scope: BookScope, folderId: string, rootFolderId: string) {
    // Resolve ancestors in one query. UNION also terminates corrupt cyclic ancestry.
    const rows = await tx.execute<{ id: string }>(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_folder_id FROM airu_folders
        WHERE id = ${folderId}::uuid AND org_id = ${scope.orgId}::uuid AND owner_user_id = ${scope.userId}::uuid
        UNION
        SELECT p.id, p.parent_folder_id FROM airu_folders p JOIN ancestors a ON p.id = a.parent_folder_id
        WHERE p.org_id = ${scope.orgId}::uuid AND p.owner_user_id = ${scope.userId}::uuid
      ) SELECT id FROM ancestors WHERE id = ${rootFolderId}::uuid`);
    if (!rows.length) throw new NotFoundError('Folder in this Book');
  }

  async document(tx: BookTransaction, scope: BookScope, id: string): Promise<StoredBookDocument> {
    const [row] = await tx.select({ document: airuDocumentsTable }).from(airuDocumentsTable)
      .innerJoin(airuFoldersTable, eq(airuDocumentsTable.folderId, airuFoldersTable.id))
      .where(and(eq(airuDocumentsTable.id, id), eq(airuDocumentsTable.ownerUserId, scope.userId), eq(airuFoldersTable.ownerUserId, scope.userId), eq(airuFoldersTable.orgId, scope.orgId)))
      .for('update', { of: airuDocumentsTable });
    if (!row) throw new NotFoundError('Document');
    return row.document;
  }

  async lockDaily(tx: BookTransaction, scope: BookScope, date: string) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scope.orgId + ':' + scope.userId + ':' + date}, 0))`);
  }

  async daily(tx: BookTransaction, scope: BookScope, rootFolderId: string, date: string, names: string[]) {
    const rows = await tx.select({ document: airuDocumentsTable }).from(airuDocumentsTable)
      .innerJoin(airuFoldersTable, eq(airuDocumentsTable.folderId, airuFoldersTable.id))
      .where(and(
        eq(airuDocumentsTable.ownerUserId, scope.userId),
        eq(airuFoldersTable.ownerUserId, scope.userId),
        eq(airuFoldersTable.orgId, scope.orgId),
        sql`(${airuDocumentsTable.attributes}->'airunoteDaily'->>'date' = ${date}
          OR (${airuDocumentsTable.folderId} = ${rootFolderId}::uuid AND ${airuDocumentsTable.name} = ${names[0]})
          OR (${inArray(airuDocumentsTable.name, names)}
            AND ${airuDocumentsTable.attributes}->'airunoteBook'->>'kind' = 'note'
            AND ${airuDocumentsTable.attributes}->'airunoteBook'->'plan'->>'kind' = 'day'
            AND ${airuDocumentsTable.attributes}->'airunoteBook'->'plan'->>'date' = ${date}))`,
      ))
      .orderBy(sql`CASE WHEN ${airuDocumentsTable.attributes}->'airunoteDaily'->>'date' = ${date} THEN 0 ELSE 1 END`)
      .limit(2).for('update', { of: airuDocumentsTable });
    return rows.map(row => row.document);
  }

  async saveDocument(tx: BookTransaction, id: string, changes: Partial<Pick<StoredBookDocument, 'name' | 'content' | 'canonicalContent' | 'folderId' | 'attributes'>>) {
    // Force text encoding before the JSONB cast. This driver pair otherwise double-encodes JSON parameters.
    const [document] = await tx.update(airuDocumentsTable).set({ ...changes, ...(changes.attributes !== undefined ? { attributes: sql`${JSON.stringify(changes.attributes)}::text::jsonb` } : {}), updatedAt: new Date() }).where(eq(airuDocumentsTable.id, id)).returning();
    if (!document) throw new NotFoundError('Document');
    return document;
  }

  async revision(tx: BookTransaction, documentId: string, content: string, userId: string) {
    await tx.insert(airuDocumentRevisionsTable).values({ documentId, contentType: 'canonical', content, createdByUserId: userId });
  }

  async saveConfig(tx: BookTransaction, id: string, metadata: Record<string, unknown>) {
    const [folder] = await tx.update(airuFoldersTable).set({ metadata: sql`${JSON.stringify(metadata)}::text::jsonb` }).where(eq(airuFoldersTable.id, id)).returning();
    if (!folder) throw new NotFoundError('Folder');
    return folder;
  }

  async quota(tx: BookTransaction, scope: BookScope) {
    const [org] = await tx.select({ id: orgsTable.id, plan: orgsTable.plan }).from(orgsTable).where(eq(orgsTable.id, scope.orgId)).for('update');
    if (!org) throw new NotFoundError('Organization');
    const [row] = await tx.select({ count: sql<number>`count(*)::int` }).from(airuDocumentsTable).innerJoin(airuFoldersTable, eq(airuDocumentsTable.folderId, airuFoldersTable.id)).where(eq(airuFoldersTable.orgId, scope.orgId));
    return { plan: org.plan, count: row?.count ?? 0 };
  }

  async create(tx: BookTransaction, scope: BookScope, folderId: string, name: string, content: string, attributes: Record<string, unknown>) {
    const [document] = await tx.insert(airuDocumentsTable).values({ folderId, ownerUserId: scope.userId, type: 'MD', name, content, canonicalContent: content, visibility: 'private', state: 'active', attributes: sql`${JSON.stringify(attributes)}::text::jsonb` }).returning();
    if (!document) throw new Error('Capture did not return an item');
    return document;
  }
}
