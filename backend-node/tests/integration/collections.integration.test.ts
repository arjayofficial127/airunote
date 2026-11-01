/// <reference types="jest" />
import type postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import type { CollectionsRepository } from '../../src/modules/airunote/collections.repository';
import type { SpaceLinksRepository } from '../../src/modules/airunote/space-links.repository';
import { defaultPlanning } from '../../src/modules/book/contract';
const integration = process.env.COLLECTIONS_TEST_DATABASE_URL ? describe : describe.skip;
integration('Independent collections in isolated PostgreSQL', () => {
  let client: ReturnType<typeof postgres>, repository: CollectionsRepository, links: SpaceLinksRepository;
  const org = randomUUID(), user = randomUUID(), outsider = randomUUID(), root = randomUUID(), a = randomUUID(), b = randomUUID(), child = randomUUID();
  const scope = { orgId: org, userId: user };
  let noteIds: string[];
  const plan = { ...defaultPlanning('task'), plan: { kind: 'day', date: '2026-11-02', time: '09:00', duration: 30 } };
  beforeAll(async () => {
    const url = process.env.COLLECTIONS_TEST_DATABASE_URL!;
    const parsed = new URL(url);
    if (parsed.hostname !== '127.0.0.1' || parsed.port !== '54329' || parsed.pathname !== '/collections_test') throw new Error('Refusing fixtures outside loopback collections_test');
    process.env.DATABASE_URL = url;
    const pg = (await import('postgres')).default; client = pg(url, { prepare: false });
    await client.unsafe(`CREATE TABLE IF NOT EXISTS airu_folders (id uuid PRIMARY KEY, org_id uuid NOT NULL, owner_user_id uuid NOT NULL, parent_folder_id uuid NOT NULL REFERENCES airu_folders(id), human_id varchar(255) NOT NULL, visibility varchar(20) NOT NULL DEFAULT 'private', type varchar(50) NOT NULL DEFAULT 'box', metadata jsonb DEFAULT '{}', default_lens_id uuid, created_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS airu_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), folder_id uuid NOT NULL REFERENCES airu_folders(id), owner_user_id uuid NOT NULL, type varchar(5) NOT NULL DEFAULT 'MD', name varchar(255) NOT NULL, content text, canonical_content text NOT NULL DEFAULT '', shared_content text, visibility varchar(20) NOT NULL DEFAULT 'private', state varchar(20) NOT NULL DEFAULT 'active', attributes jsonb NOT NULL DEFAULT '{}', created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS airu_lenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), folder_id uuid REFERENCES airu_folders(id), name varchar(120) NOT NULL, type varchar(20) NOT NULL, is_default boolean NOT NULL DEFAULT false, metadata jsonb NOT NULL DEFAULT '{}', query jsonb, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS airu_lens_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lens_id uuid NOT NULL REFERENCES airu_lenses(id) ON DELETE CASCADE, entity_id uuid NOT NULL, entity_type varchar(20) NOT NULL, column_id varchar(100), "order" numeric, x numeric, y numeric, view_mode varchar(20), metadata jsonb NOT NULL DEFAULT '{}', created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());`);
    repository = new (await import('../../src/modules/airunote/collections.repository')).CollectionsRepository();
    links = new (await import('../../src/modules/airunote/space-links.repository')).SpaceLinksRepository();
  });
  beforeEach(async () => {
    await client`TRUNCATE airu_lens_items, airu_lenses, airu_documents, airu_folders`;
    for (const [id, parent, name] of [[root, root, '__user_root__'], [a, root, 'A'], [b, root, 'B'], [child, a, 'Child']]) await client`INSERT INTO airu_folders(id,org_id,owner_user_id,parent_folder_id,human_id) VALUES (${id},${org},${user},${parent},${name})`;
    const rows = await client`INSERT INTO airu_documents(folder_id,owner_user_id,name,canonical_content,attributes) SELECT CASE WHEN i%3=0 THEN ${a}::uuid WHEN i%3=1 THEN ${b}::uuid ELSE ${child}::uuid END,${user}::uuid,'File '||i,'Original body '||i,${client.json({ airunoteBook: plan })} FROM generate_series(1,1000) AS i RETURNING id`;
    noteIds = rows.map(row => row.id);
  });
  afterAll(async () => { await client?.end(); });
  const make = (kind: 'pages' | 'canvas' | 'board' | 'study' = 'pages') => repository.create(scope, { name: 'Collection', kind, homeFolderId: a, membership: { mode: 'chosen' } });
  test('13 pages of 20 cross-folder references from 1,000 originals survive move and reload', async () => {
    let value = await make(); const id = value.collection.id;
    const pages = Array.from({ length: 13 }, (_, i) => ({ id: randomUUID(), name: `Page ${i + 1}` }));
    value = await repository.update(scope, id, { revision: 1, pages });
    for (let page = 0; page < 13; page++) value = await repository.add(scope, id, { revision: value.collection.config.revision, items: noteIds.slice(page * 20, page * 20 + 20).map(entityId => ({ entityId, entityType: 'document', pageId: pages[page]!.id })) });
    expect(value.placements).toHaveLength(260);
    for (const page of pages) expect(value.placements.filter(item => item.pageId === page.id)).toHaveLength(20);
    const identities = value.placements.map(item => item.id);
    value = await repository.update(scope, id, { revision: value.collection.config.revision, homeFolderId: b });
    expect(value.collection.id).toBe(id); expect(value.collection.homeFolderId).toBe(b);
    expect((await repository.get(scope, id)).placements.map(item => item.id)).toEqual(identities);
    expect((await client`SELECT count(*)::int AS n FROM airu_documents`)[0]?.n).toBe(1000);
    expect((await client`SELECT count(*)::int AS n FROM airu_documents WHERE attributes->'airunoteBook'=${client.json(plan)}::jsonb`)[0]?.n).toBe(1000);
  });
  test('duplicates have independent placement identities but reference the same original', async () => {
    let first = await make('canvas'); first = await repository.add(scope, first.collection.id, { revision: 1, items: [{ entityId: noteIds[0]!, entityType: 'document' }] });
    first = await repository.arrange(scope, first.collection.id, 2, [{ id: first.placements[0]!.id, x: 42, y: 80, viewMode: 'preview' }]);
    const copy = await repository.duplicate(scope, first.collection.id, 'Copy', b);
    expect(copy.collection.id).not.toBe(first.collection.id); expect(copy.placements[0]!.id).not.toBe(first.placements[0]!.id);
    expect(copy.placements[0]).toMatchObject({ entityId: noteIds[0], x: 42, y: 80, viewMode: 'preview' });
    await repository.arrange(scope, copy.collection.id, 1, [{ id: copy.placements[0]!.id, x: 200 }]);
    expect((await repository.get(scope, first.collection.id)).placements[0]!.x).toBe(42);
    await client`UPDATE airu_documents SET canonical_content='Shared edit',folder_id=${b} WHERE id=${noteIds[0]!}`;
    expect((await repository.get(scope, copy.collection.id)).placements[0]!.entityId).toBe(noteIds[0]);
    expect((await repository.get(scope, first.collection.id)).placements[0]!.available).toBe(true);
    await repository.remove(scope, first.collection.id, 3, first.placements[0]!.id);
    expect((await client`SELECT canonical_content,attributes FROM airu_documents WHERE id=${noteIds[0]!}`)[0]).toMatchObject({ canonical_content: 'Shared edit', attributes: { airunoteBook: plan } });
  });
  test('folder link is another entrance; unlink leaves collection, pages and originals intact', async () => {
    const value = await make(); const ref = { entityId: value.collection.id, entityType: 'collection' as const };
    await links.change(scope, b, ref); await links.change(scope, b, ref, true);
    expect((await repository.get(scope, ref.entityId)).collection.id).toBe(ref.entityId);
    expect((await client`SELECT count(*)::int AS n FROM airu_documents`)[0]?.n).toBe(1000);
  });
  test('chosen membership remains after source move; matching membership follows visible source and status', async () => {
    const entityId = noteIds[0]!; await client`UPDATE airu_documents SET folder_id=${a} WHERE id=${entityId}`;
    const chosen = await make('study'); await repository.add(scope, chosen.collection.id, { revision: 1, items: [{ entityId, entityType: 'document' }] });
    const matching = await repository.create(scope, { name: 'Open A', kind: 'study', homeFolderId: b, membership: { mode: 'matching', folderId: a, descendants: false, status: 'open', query: 'File 1' } });
    expect(matching.placements.some(item => item.entityId === entityId)).toBe(true);
    await client`UPDATE airu_documents SET folder_id=${b} WHERE id=${entityId}`;
    expect((await repository.get(scope, chosen.collection.id)).placements[0]!.entityId).toBe(entityId);
    expect((await repository.get(scope, matching.collection.id)).placements.some(item => item.entityId === entityId)).toBe(false);
    await expect(repository.add(scope, matching.collection.id, { revision: 1, items: [{ entityId, entityType: 'document' }] })).rejects.toMatchObject({ code: 'MATCHING_MEMBERSHIP' });
  });
  test('foreign owner/org, foreign reference, archived ancestor and invalid home are rejected atomically', async () => {
    const value = await make();
    for (const denied of [{ ...scope, orgId: outsider }, { ...scope, userId: outsider }]) { await expect(repository.get(denied, value.collection.id)).rejects.toMatchObject({ statusCode: 404 }); expect(await repository.list(denied)).toEqual([]); }
    await client`UPDATE airu_documents SET owner_user_id=${outsider} WHERE id=${noteIds[1]!}`;
    await expect(repository.add(scope, value.collection.id, { revision: 1, items: [{ entityId: noteIds[0]!, entityType: 'document' }, { entityId: noteIds[1]!, entityType: 'document' }] })).rejects.toMatchObject({ statusCode: 404 });
    expect((await repository.get(scope, value.collection.id)).placements).toHaveLength(0);
    await expect(repository.update(scope, value.collection.id, { revision: 1, homeFolderId: outsider })).rejects.toMatchObject({ statusCode: 404 });
    await client`UPDATE airu_folders SET metadata=${client.json({ airunoteLifecycle: { state: 'archived' } })} WHERE id=${a}`;
    await expect(repository.get(scope, value.collection.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(links.change(scope, b, { entityId: value.collection.id, entityType: 'collection' })).rejects.toMatchObject({ code: 'SPACE_UNAVAILABLE' });
  });
  test('stale writes and nonempty-page removal preserve references', async () => {
    let value = await make(); const id = value.collection.id;
    value = await repository.add(scope, id, { revision: 1, items: [{ entityId: noteIds[0]!, entityType: 'document' }] });
    await expect(repository.update(scope, id, { revision: 1, name: 'Stale' })).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(repository.update(scope, id, { revision: 2, pages: [{ id: randomUUID(), name: 'Replacement' }] })).rejects.toMatchObject({ code: 'PAGE_NOT_EMPTY' });
    expect((await repository.get(scope, id)).placements).toHaveLength(1);
  });
  test('unavailable originals retain references for recovery and can be unlinked without deleting originals', async () => {
    let value = await make(); value = await repository.add(scope, value.collection.id, { revision: 1, items: [{ entityId: noteIds[0]!, entityType: 'document' }] });
    await client`UPDATE airu_documents SET state='trashed' WHERE id=${noteIds[0]!}`;
    expect((await repository.get(scope, value.collection.id)).placements[0]!.available).toBe(false);
    await client`UPDATE airu_documents SET state='active' WHERE id=${noteIds[0]!}`;
    expect((await repository.get(scope, value.collection.id)).placements[0]!.available).toBe(true);
  });
  test('trashing a home folder promotes collections with identity and contents intact', async () => {
    let value = await make('board'); value = await repository.add(scope, value.collection.id, { revision: 1, items: [{ entityId: noteIds[0]!, entityType: 'document' }] });
    const lifecycle = new (await import('../../src/modules/airunote/lifecycle.repository')).AirunoteLifecycleRepository();
    await lifecycle.folder(scope, a, 'trashed', 'active');
    const reloaded = await repository.get(scope, value.collection.id);
    expect(reloaded.collection.homeFolderId).toBe(root);
    expect(reloaded.placements.map(item => item.id)).toEqual(value.placements.map(item => item.id));
    expect((await client`SELECT count(*)::int AS n FROM airu_documents WHERE attributes->'airunoteBook'=${client.json(plan)}::jsonb`)[0]?.n).toBe(1000);
  });

});
