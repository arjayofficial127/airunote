/// <reference types="jest" />
import type postgres from 'postgres';
import type { SpaceLinksRepository } from '../../src/modules/airunote/space-links.repository';
import { defaultPlanning, editablePlanning } from '../../src/modules/book/contract';

const integration = process.env.SPACE_LINKS_TEST_DATABASE_URL ? describe : describe.skip;
integration('Space links in isolated PostgreSQL', () => {
  let repository: SpaceLinksRepository;
  let client: ReturnType<typeof postgres>;
  const org = '10000000-0000-4000-8000-000000000001', user = '20000000-0000-4000-8000-000000000001';
  const other = '20000000-0000-4000-8000-000000000002';
  const root = '30000000-0000-4000-8000-000000000001', folder = '30000000-0000-4000-8000-000000000002';
  const child = '30000000-0000-4000-8000-000000000003', grandchild = '30000000-0000-4000-8000-000000000004';
  const note = '40000000-0000-4000-8000-000000000001', nested = '40000000-0000-4000-8000-000000000002';
  const lens = '50000000-0000-4000-8000-000000000001', sprint = '60000000-0000-4000-8000-000000000001';
  const scope = { orgId: org, userId: user }, at = '2026-11-01T00:00:00.000Z';
  const plan = { ...defaultPlanning('task'), plan: { kind: 'sprint', sprintId: sprint } };
  const config = { version: 1, revision: 2, sprints: [{ id: sprint, name: 'Current sprint', start: '2026-11-01', end: '2026-11-14', closed: false }], views: [], templates: [] };

  beforeAll(async () => {
    const url = process.env.SPACE_LINKS_TEST_DATABASE_URL;
    if (!url) throw new Error('Missing disposable database');
    const target = new URL(url);
    if (target.hostname !== '127.0.0.1' || target.port !== '54329' || target.pathname !== '/space_links_test') throw new Error('Refusing fixtures outside loopback space_links_test');
    process.env.DATABASE_URL = url;
    const pg = (await import('postgres')).default; client = pg(url, { prepare: false });
    await client.unsafe(`CREATE TABLE IF NOT EXISTS airu_folders (id uuid PRIMARY KEY, org_id uuid NOT NULL, owner_user_id uuid NOT NULL, parent_folder_id uuid NOT NULL REFERENCES airu_folders(id) ON DELETE RESTRICT, human_id varchar(255) NOT NULL, visibility varchar(20) NOT NULL DEFAULT 'private', type varchar(50) NOT NULL DEFAULT 'box', metadata jsonb, default_lens_id uuid, created_at timestamp NOT NULL DEFAULT now(), UNIQUE(org_id,owner_user_id,parent_folder_id,human_id));
      CREATE TABLE IF NOT EXISTS airu_documents (id uuid PRIMARY KEY, folder_id uuid NOT NULL REFERENCES airu_folders(id) ON DELETE CASCADE, owner_user_id uuid NOT NULL, type varchar(5) NOT NULL, name varchar(255) NOT NULL, content text, canonical_content text NOT NULL DEFAULT '', shared_content text, visibility varchar(20) NOT NULL DEFAULT 'private', state varchar(20) NOT NULL DEFAULT 'active', attributes jsonb NOT NULL DEFAULT '{}', created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), UNIQUE(folder_id,name));
      CREATE TABLE IF NOT EXISTS airu_lenses (id uuid PRIMARY KEY, folder_id uuid REFERENCES airu_folders(id), name text);
      CREATE TABLE IF NOT EXISTS exams (id integer PRIMARY KEY, title text);
      INSERT INTO exams VALUES (1,'Protected exam') ON CONFLICT DO NOTHING;`);
    repository = new (await import('../../src/modules/airunote/space-links.repository')).SpaceLinksRepository();
  });
  beforeEach(async () => {
    await client`TRUNCATE airu_lenses, airu_documents, airu_folders`;
    for (const [id, parent, name] of [[root, root, '__user_root__'], [folder, root, 'Remove me'], [child, folder, 'Keep child'], [grandchild, child, 'Keep grandchild']]) {
      const metadata = id === folder ? { unrelated: 'preserved', airunoteBook: config } : { unrelated: 'preserved' };
      await client`INSERT INTO airu_folders (id,org_id,owner_user_id,parent_folder_id,human_id,metadata) VALUES (${id},${org},${user},${parent},${name},${client.json(metadata)})`;
    }
    for (const [id, parent] of [[note, folder], [nested, grandchild]]) await client`INSERT INTO airu_documents (id,folder_id,owner_user_id,type,name,canonical_content,shared_content,attributes,updated_at) VALUES (${id},${parent},${user},'MD',${id},'Keep body','Keep shared edit',${client.json({ airunoteBook: plan, custom: 'keep' })},${at})`;
    await client`INSERT INTO airu_lenses VALUES (${lens},${folder},'Keep canvas')`;
  });
  afterAll(async () => { await client?.end(); });
  test('links persist without moving or copying the original and preserve Space metadata', async () => {
    await repository.change(scope, root, { entityId: note, entityType: 'document' });
    expect((await client`SELECT folder_id,canonical_content,attributes FROM airu_documents WHERE id=${note}`)[0]).toMatchObject({ folder_id: folder, canonical_content: 'Keep body', attributes: { airunoteBook: plan } });
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata).toMatchObject({ unrelated: 'preserved', airunoteSpaceLinks: [{ entityId: note, entityType: 'document' }] });
  });
  test('idempotent additions and concurrent additions preserve every reference', async () => {
    await Promise.all([note, nested, note].map(entityId => repository.change(scope, root, { entityId, entityType: 'document' })));
    const links = (await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata.airunoteSpaceLinks;
    expect(links).toHaveLength(2);
    expect(links).toEqual(expect.arrayContaining([{ entityId: note, entityType: 'document' }, { entityId: nested, entityType: 'document' }]));
  });
  test('linking a Space retains its parent and removing a link retains the original', async () => {
    const link = { entityId: grandchild, entityType: 'folder' as const };
    await repository.change(scope, root, link);
    expect((await client`SELECT parent_folder_id FROM airu_folders WHERE id=${grandchild}`)[0]?.parent_folder_id).toBe(child);
    await repository.change(scope, root, link, true);
    await repository.change(scope, root, link, true);
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata.airunoteSpaceLinks).toEqual([]);
    expect((await client`SELECT id FROM airu_folders WHERE id=${grandchild}`)).toHaveLength(1);
  });
  test('foreign owner, organization and targets are rejected', async () => {
    for (const denied of [{ ...scope, userId: other }, { ...scope, orgId: other }]) await expect(repository.change(denied, root, { entityId: note, entityType: 'document' })).rejects.toMatchObject({ statusCode: 404 });
    await client`UPDATE airu_documents SET owner_user_id=${other} WHERE id=${note}`;
    await expect(repository.change(scope, root, { entityId: note, entityType: 'document' })).rejects.toMatchObject({ statusCode: 404 });
    await client`UPDATE airu_folders SET org_id=${other} WHERE id=${grandchild}`;
    await expect(repository.change(scope, root, { entityId: grandchild, entityType: 'folder' })).rejects.toMatchObject({ statusCode: 404 });
  });
  test('self, workspace root and existing children cannot become redundant links', async () => {
    await expect(repository.change(scope, folder, { entityId: folder, entityType: 'folder' })).rejects.toMatchObject({ code: 'INVALID_TARGET' });
    await expect(repository.change(scope, folder, { entityId: root, entityType: 'folder' })).rejects.toMatchObject({ code: 'INVALID_TARGET' });
    await expect(repository.change(scope, folder, { entityId: child, entityType: 'folder' })).rejects.toMatchObject({ code: 'ALREADY_HERE' });
    await expect(repository.change(scope, folder, { entityId: note, entityType: 'document' })).rejects.toMatchObject({ code: 'ALREADY_HERE' });
  });
  test('archived ancestors and trashed notes cannot be linked; unavailable references can be removed', async () => {
    const link = { entityId: nested, entityType: 'document' as const };
    await repository.change(scope, root, link);
    await client`UPDATE airu_documents SET state='trashed' WHERE id=${nested}`;
    await expect(repository.change(scope, root, link)).rejects.toMatchObject({ code: 'NOTE_UNAVAILABLE' });
    await repository.change(scope, root, link, true);
    await client`UPDATE airu_folders SET metadata='{"airunoteLifecycle":{"state":"archived"}}'::jsonb WHERE id=${folder}`;
    await expect(repository.change(scope, root, { entityId: grandchild, entityType: 'folder' })).rejects.toMatchObject({ code: 'SPACE_UNAVAILABLE' });
    await expect(repository.change(scope, child, { entityId: note, entityType: 'document' })).rejects.toMatchObject({ code: 'SPACE_UNAVAILABLE' });
  });
  test('malformed existing links are preserved instead of silently overwritten', async () => {
    await client`UPDATE airu_folders SET metadata='{"airunoteSpaceLinks":"unexpected"}'::jsonb WHERE id=${root}`;
    await expect(repository.change(scope, root, { entityId: note, entityType: 'document' })).rejects.toMatchObject({ code: 'INVALID_LINKS' });
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata.airunoteSpaceLinks).toBe('unexpected');
  });
});
