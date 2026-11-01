import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../infrastructure/db/drizzle/client';
import { airuDocumentsTable as documents, airuFoldersTable as folders, airuLensesTable as lenses, airuLensItemsTable as placements } from '../../infrastructure/db/drizzle/schema';
import { AppError } from '../../core/errors/AppError';
import { readPlanning } from '../book/contract';
import { collectionConfigSchema, createCollectionSchema, updateCollectionSchema, addReferencesSchema, placementPatchSchema, type Collection, type CollectionConfig, type CollectionReference, type CollectionDetail, type Placement } from './collections.contract';

type Scope = { orgId: string; userId: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Lens = typeof lenses.$inferSelect;
type ActiveFolder = { id: string; parentFolderId: string; humanId: string; metadata: unknown };
type CatalogDocument = { id: string; folderId: string; name: string; attributes: unknown; state: string };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const json = (value: unknown) => sql`${JSON.stringify(value)}::text::jsonb`;
const unavailable = () => new AppError('Item not found or unavailable in this workspace.', 404, 'NOT_FOUND');
function config(row: Lens): CollectionConfig { const parsed = collectionConfigSchema.safeParse(record(row.metadata).airunoteCollection); if (!parsed.success) throw new AppError('Collection settings could not be read. They have been preserved.', 409, 'INVALID_COLLECTION'); return parsed.data; }
function present(row: Lens): Collection { return { id: row.id, homeFolderId: row.folderId!, name: row.name, config: config(row), updatedAt: row.updatedAt.toISOString() }; }
async function lock(tx: Tx, scope: Scope) { await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scope.orgId + ':' + scope.userId}, 0))`); }
async function activeFolders(tx: Tx, scope: Scope) {
  const rows = await tx.select().from(folders).where(and(eq(folders.orgId, scope.orgId), eq(folders.ownerUserId, scope.userId))) as ActiveFolder[];
  const byId = new Map(rows.map(row => [row.id, row]));
  return rows.filter(row => {
    const seen = new Set<string>(); let current: typeof row | undefined = row;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (['archived', 'trashed'].includes(String(record(record(current.metadata).airunoteLifecycle).state))) return false;
      if (current.id === current.parentFolderId) return true;
      current = byId.get(current.parentFolderId);
    }
    return false;
  });
}
async function owned(tx: Tx, scope: Scope, id: string, revision?: number) {
  const [row] = await tx.select().from(lenses).where(and(eq(lenses.id, id), eq(lenses.type, 'collection'))).for('update');
  if (!row) throw unavailable();
  const c = config(row);
  if (c.orgId !== scope.orgId || c.ownerUserId !== scope.userId || !(await activeFolders(tx, scope)).some(folder => folder.id === row.folderId)) throw unavailable();
  if (revision !== undefined && revision !== c.revision) throw new AppError('This collection changed elsewhere. Refresh it before saving again.', 409, 'CONFLICT');
  return row;
}
async function save(tx: Tx, row: Lens, c: CollectionConfig, changes: { name?: string; folderId?: string } = {}) {
  const [updated] = await tx.update(lenses).set({ ...changes, metadata: json({ ...record(row.metadata), airunoteCollection: { ...c, revision: c.revision + 1 } }), updatedAt: new Date() }).where(eq(lenses.id, row.id)).returning();
  return updated!;
}
async function catalog(tx: Tx, scope: Scope) {
  const active = await activeFolders(tx, scope);
  if (!active.length) return { folders: active, documents: [] as CatalogDocument[], collections: [] as Lens[] };
  const ids = active.map(folder => folder.id);
  const docs = await tx.select({ id: documents.id, folderId: documents.folderId, name: documents.name, attributes: documents.attributes, state: documents.state }).from(documents).where(and(inArray(documents.folderId, ids), eq(documents.ownerUserId, scope.userId), eq(documents.state, 'active')));
  const rows = await tx.select().from(lenses).where(and(inArray(lenses.folderId, ids), eq(lenses.type, 'collection')));
  return { folders: active, documents: docs, collections: rows.filter(row => { const c = collectionConfigSchema.safeParse(record(row.metadata).airunoteCollection); return c.success && c.data.orgId === scope.orgId && c.data.ownerUserId === scope.userId; }) };
}
function catalogKeys(data: Awaited<ReturnType<typeof catalog>>) { return new Set([...data.folders.map(row => 'folder:' + row.id), ...data.documents.map(row => 'document:' + row.id), ...data.collections.map(row => 'collection:' + row.id)]); }
function requireMembership(c: CollectionConfig, active: Array<{ id: string }>) {
  if (c.kind === 'pages' && c.membership.mode !== 'chosen') throw new AppError('Books use chosen references on ordered pages.', 400, 'INVALID_MEMBERSHIP');
  const rule = c.membership;
  if (rule.mode === 'matching' && rule.folderId && !active.some(folder => folder.id === rule.folderId)) throw unavailable();
}
async function detail(tx: Tx, scope: Scope, row: Lens): Promise<CollectionDetail> {
  const c = config(row), data = await catalog(tx, scope), keys = catalogKeys(data);
  const stored = await tx.select().from(placements).where(eq(placements.lensId, row.id));
  let result: Placement[] = stored.map(item => ({ id: item.id, entityId: item.entityId, entityType: item.entityType as CollectionReference['entityType'], pageId: String(record(item.metadata).pageId ?? c.pages[0]!.id), order: Number(item.order ?? 0), x: item.x === null ? null : Number(item.x), y: item.y === null ? null : Number(item.y), columnId: item.columnId, viewMode: item.viewMode as Placement['viewMode'], metadata: record(item.metadata), available: keys.has(item.entityType + ':' + item.entityId) }));
  if (c.membership.mode === 'matching') {
    const rule = c.membership, source = new Set<string>();
    if (rule.folderId) source.add(rule.folderId);
    else data.folders.forEach(folder => source.add(folder.id));
    if (rule.descendants && rule.folderId) { let changed = true; while (changed) { changed = false; for (const folder of data.folders) if (source.has(folder.parentFolderId) && !source.has(folder.id)) { source.add(folder.id); changed = true; } } }
    const matches = data.documents.filter(item => source.has(item.folderId) && item.name.toLowerCase().includes(rule.query.toLowerCase()) && (rule.status === 'all' || (readPlanning(record(item.attributes))?.status ?? 'open') === (rule.status === 'done' ? 'complete' : rule.status)));
    result = matches.map((item, index) => result.find(value => value.entityType === 'document' && value.entityId === item.id) ?? ({ id: item.id, entityId: item.id, entityType: 'document', pageId: c.pages[0]!.id, order: index, x: null, y: null, columnId: null, viewMode: null, metadata: {}, available: true }));
  }
  return { collection: present(row), placements: result.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)) };
}

/** Independent workspace-owned identities in additive, tagged storage. Legacy lenses remain unchanged. */
export class CollectionsRepository {
  async list(scope: Scope) { return db.transaction(async tx => (await catalog(tx, scope)).collections.map(present)); }
  async get(scope: Scope, id: string) { return db.transaction(async tx => detail(tx, scope, await owned(tx, scope, id))); }
  async create(scope: Scope, input: z.infer<typeof createCollectionSchema>) {
    return db.transaction(async tx => {
      await lock(tx, scope);
      const active = await activeFolders(tx, scope);
      if (!active.some(folder => folder.id === input.homeFolderId)) throw unavailable();
      const c: CollectionConfig = { version: 1, orgId: scope.orgId, ownerUserId: scope.userId, kind: input.kind, revision: 1, membership: input.membership, pages: [{ id: randomUUID(), name: 'Page 1' }] };
      requireMembership(c, active);
      const [row] = await tx.insert(lenses).values({ name: input.name, folderId: input.homeFolderId, type: 'collection', isDefault: false, metadata: json({ airunoteCollection: c }) }).returning();
      return detail(tx, scope, row!);
    });
  }
  async update(scope: Scope, id: string, input: z.infer<typeof updateCollectionSchema>) {
    return db.transaction(async tx => {
      await lock(tx, scope); const row = await owned(tx, scope, id, input.revision), c = config(row), active = await activeFolders(tx, scope);
      if (input.homeFolderId && !active.some(folder => folder.id === input.homeFolderId)) throw unavailable();
      // Membership is explicit. Switching to matching would conceal chosen references: require a fresh collection instead.
      if (input.membership && c.membership.mode !== input.membership.mode) throw new AppError('Create another collection to use a different membership mode. Existing references are preserved.', 409, 'MEMBERSHIP_MODE');
      const next = { ...c, membership: input.membership ?? c.membership, pages: input.pages ?? c.pages };
      requireMembership(next, active);
      if (input.pages) {
        const rows = await tx.select().from(placements).where(eq(placements.lensId, id));
        if (rows.some(item => !next.pages.some(page => page.id === record(item.metadata).pageId))) throw new AppError('Remove or move references before deleting their page.', 409, 'PAGE_NOT_EMPTY');
      }
      return detail(tx, scope, await save(tx, row, next, { ...(input.name ? { name: input.name } : {}), ...(input.homeFolderId ? { folderId: input.homeFolderId } : {}) }));
    });
  }
  async duplicate(scope: Scope, id: string, name: string, homeFolderId?: string) {
    return db.transaction(async tx => {
      await lock(tx, scope); const row = await owned(tx, scope, id), c = config(row);
      if (homeFolderId && !(await activeFolders(tx, scope)).some(folder => folder.id === homeFolderId)) throw unavailable();
      const [copy] = await tx.insert(lenses).values({ name, folderId: homeFolderId ?? row.folderId, type: 'collection', isDefault: false, metadata: json({ ...record(row.metadata), airunoteCollection: { ...c, revision: 1 } }) }).returning();
      const items = await tx.select().from(placements).where(eq(placements.lensId, id));
      if (items.length) await tx.insert(placements).values(items.map(({ id: _id, createdAt: _created, updatedAt: _updated, ...item }) => ({ ...item, lensId: copy!.id, metadata: json(item.metadata) })));
      return detail(tx, scope, copy!);
    });
  }
  async add(scope: Scope, id: string, input: z.infer<typeof addReferencesSchema>) {
    return db.transaction(async tx => {
      await lock(tx, scope); const row = await owned(tx, scope, id, input.revision), c = config(row);
      if (c.membership.mode !== 'chosen') throw new AppError('This collection follows its matching rule. Edit the source or filter to change membership.', 409, 'MATCHING_MEMBERSHIP');
      const data = await catalog(tx, scope), keys = catalogKeys(data);
      const current = await tx.select().from(placements).where(eq(placements.lensId, id));
      const seen = new Set(current.map(item => `${record(item.metadata).pageId}:${item.entityType}:${item.entityId}`));
      const values: Array<typeof placements.$inferInsert> = [];
      for (const ref of input.items) {
        if (!keys.has(ref.entityType + ':' + ref.entityId) || ref.entityId === id) throw unavailable();
        const pageId = ref.pageId ?? c.pages[0]!.id;
        if (!c.pages.some(page => page.id === pageId)) throw new AppError('Page not found.', 400, 'INVALID_PAGE');
        const key = `${pageId}:${ref.entityType}:${ref.entityId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        values.push({ lensId: id, entityId: ref.entityId, entityType: ref.entityType, order: String(current.length + values.length), metadata: json({ pageId }) });
      }
      if (current.length + values.length > 10000) throw new AppError('This collection has reached its 10,000-reference limit.', 409, 'REFERENCE_LIMIT');
      if (values.length) await tx.insert(placements).values(values);
      return detail(tx, scope, await save(tx, row, c));
    });
  }
  async arrange(scope: Scope, id: string, revision: number, inputs: Array<z.infer<typeof placementPatchSchema>>) {
    return db.transaction(async tx => {
      await lock(tx, scope); const row = await owned(tx, scope, id, revision), c = config(row), current = await detail(tx, scope, row);
      for (const input of inputs) {
        const item = current.placements.find(value => value.id === input.id);
        if (!item?.available) throw unavailable();
        const pageId = input.pageId ?? item.pageId;
        if (!c.pages.some(page => page.id === pageId)) throw new AppError('Page not found.', 400, 'INVALID_PAGE');
        const values = { lensId: id, entityId: item.entityId, entityType: item.entityType, order: String(input.order ?? item.order), x: input.x === undefined ? item.x === null ? null : String(item.x) : String(input.x), y: input.y === undefined ? item.y === null ? null : String(item.y) : String(input.y), columnId: input.columnId === undefined ? item.columnId : input.columnId, viewMode: input.viewMode ?? item.viewMode, metadata: json({ ...item.metadata, ...input.metadata, pageId }), updatedAt: new Date() };
        const [existing] = await tx.select({ id: placements.id }).from(placements).where(and(eq(placements.id, input.id), eq(placements.lensId, id)));
        if (existing) await tx.update(placements).set(values).where(eq(placements.id, existing.id));
        else await tx.insert(placements).values(values); // Matching references acquire an independent placement on first arrangement.
      }
      return detail(tx, scope, await save(tx, row, c));
    });
  }
  async remove(scope: Scope, id: string, revision: number, placementId: string) {
    return db.transaction(async tx => {
      await lock(tx, scope); const row = await owned(tx, scope, id, revision), c = config(row);
      if (c.membership.mode !== 'chosen') throw new AppError('Edit the matching rule to change this collection’s membership.', 409, 'MATCHING_MEMBERSHIP');
      const removed = await tx.delete(placements).where(and(eq(placements.id, placementId), eq(placements.lensId, id))).returning({ id: placements.id });
      if (!removed.length) throw unavailable();
      return detail(tx, scope, await save(tx, row, c));
    });
  }
}
