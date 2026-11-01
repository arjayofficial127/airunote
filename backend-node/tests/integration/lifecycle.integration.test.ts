/// <reference types="jest" />
import type postgres from 'postgres';
import type { AirunoteLifecycleRepository } from '../../src/modules/airunote/lifecycle.repository';
import { defaultPlanning, editablePlanning } from '../../src/modules/book/contract';

const integration = process.env.LIFECYCLE_TEST_DATABASE_URL ? describe : describe.skip;
integration('Recoverable Notes lifecycle in isolated PostgreSQL', () => {
  let repository: AirunoteLifecycleRepository;
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
    const url = process.env.LIFECYCLE_TEST_DATABASE_URL;
    if (!url) throw new Error('Missing disposable database');
    const target = new URL(url);
    if (target.hostname !== '127.0.0.1' || target.port !== '54329' || target.pathname !== '/lifecycle_test') throw new Error('Refusing fixtures outside loopback lifecycle_test');
    process.env.DATABASE_URL = url;
    const pg = (await import('postgres')).default; client = pg(url, { prepare: false });
    await client.unsafe(`CREATE TABLE IF NOT EXISTS airu_folders (id uuid PRIMARY KEY, org_id uuid NOT NULL, owner_user_id uuid NOT NULL, parent_folder_id uuid NOT NULL REFERENCES airu_folders(id) ON DELETE RESTRICT, human_id varchar(255) NOT NULL, visibility varchar(20) NOT NULL DEFAULT 'private', type varchar(50) NOT NULL DEFAULT 'box', metadata jsonb, default_lens_id uuid, created_at timestamp NOT NULL DEFAULT now(), UNIQUE(org_id,owner_user_id,parent_folder_id,human_id));
      CREATE TABLE IF NOT EXISTS airu_documents (id uuid PRIMARY KEY, folder_id uuid NOT NULL REFERENCES airu_folders(id) ON DELETE CASCADE, owner_user_id uuid NOT NULL, type varchar(5) NOT NULL, name varchar(255) NOT NULL, content text, canonical_content text NOT NULL DEFAULT '', shared_content text, visibility varchar(20) NOT NULL DEFAULT 'private', state varchar(20) NOT NULL DEFAULT 'active', attributes jsonb NOT NULL DEFAULT '{}', created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), UNIQUE(folder_id,name));
      CREATE TABLE IF NOT EXISTS airu_lenses (id uuid PRIMARY KEY, folder_id uuid REFERENCES airu_folders(id), name text);
      ALTER TABLE airu_lenses ADD COLUMN IF NOT EXISTS type varchar(20) NOT NULL DEFAULT 'canvas';
      ALTER TABLE airu_lenses ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
      CREATE TABLE IF NOT EXISTS exams (id integer PRIMARY KEY, title text);
      INSERT INTO exams VALUES (1,'Protected exam') ON CONFLICT DO NOTHING;`);
    repository = new (await import('../../src/modules/airunote/lifecycle.repository')).AirunoteLifecycleRepository();
  });
  beforeEach(async () => {
    await client`TRUNCATE airu_lenses, airu_documents, airu_folders`;
    for (const [id, parent, name] of [[root, root, '__user_root__'], [folder, root, 'Remove me'], [child, folder, 'Keep child'], [grandchild, child, 'Keep grandchild']]) {
      const metadata = id === folder ? { unrelated: 'preserved', airunoteBook: config } : { unrelated: 'preserved' };
      await client`INSERT INTO airu_folders (id,org_id,owner_user_id,parent_folder_id,human_id,metadata) VALUES (${id},${org},${user},${parent},${name},${client.json(metadata)})`;
    }
    for (const [id, parent] of [[note, folder], [nested, grandchild]]) await client`INSERT INTO airu_documents (id,folder_id,owner_user_id,type,name,canonical_content,shared_content,attributes,updated_at) VALUES (${id},${parent},${user},'MD',${id},'Keep body','Keep shared edit',${client.json({ airunoteBook: plan, custom: 'keep' })},${at})`;
    await client`INSERT INTO airu_lenses (id,folder_id,name) VALUES (${lens},${folder},'Keep canvas')`;
  });
  afterAll(async () => { await client?.end(); });
  test('archive keeps the entire branch together, preserves metadata and round-trips restore', async () => {
    await repository.folder(scope, folder, 'archived', 'active');
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${folder}`)[0]?.metadata).toMatchObject({ unrelated: 'preserved', airunoteLifecycle: { state: 'archived' }, airunoteBook: config });
    expect((await client`SELECT parent_folder_id FROM airu_folders WHERE id=${child}`)[0]?.parent_folder_id).toBe(folder);
    expect((await client`SELECT folder_id, state FROM airu_documents WHERE id=${note}`)[0]).toMatchObject({ folder_id: folder, state: 'active' });
    await repository.folder(scope, folder, 'active', 'archived');
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${folder}`)[0]?.metadata.airunoteLifecycle.state).toBe('active');
  });
  test('delete promotes direct contents atomically, preserves nested data, sprint ancestry and saved lenses', async () => {
    const result = await repository.folder(scope, folder, 'trashed', 'active');
    expect(result.folders).toEqual(expect.arrayContaining([expect.objectContaining({ id: child, parentFolderId: root })]));
    expect(result.documents).toEqual([expect.objectContaining({ id: note, folderId: root })]);
    expect((await client`SELECT parent_folder_id FROM airu_folders WHERE id=${grandchild}`)[0]?.parent_folder_id).toBe(child);
    expect((await client`SELECT folder_id, canonical_content, shared_content, attributes FROM airu_documents WHERE id=${note}`)[0]).toMatchObject({ folder_id: root, canonical_content: 'Keep body', shared_content: 'Keep shared edit', attributes: { airunoteBook: plan, custom: 'keep' } });
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata).toMatchObject({ unrelated: 'preserved', airunoteBook: { revision: 1, sprints: config.sprints } });
    const moved = result.documents.find(document => document.id === note);
    if (!moved) throw new Error('Expected promoted note');
    const service = new (await import('../../src/modules/book/book.service')).BookService();
    const planned = await service.update(scope, note, { rootFolderId: root, expectedUpdatedAt: moved.updatedAt.toISOString(), planning: { ...editablePlanning(defaultPlanning('task')), status: 'complete', plan: { kind: 'sprint', sprintId: sprint } } });
    expect(planned.attributes).toMatchObject({ airunoteBook: { status: 'complete', plan: { kind: 'sprint', sprintId: sprint } } });
    expect((await client`SELECT folder_id FROM airu_lenses WHERE id=${lens}`)[0]?.folder_id).toBe(folder);
    expect((await client`SELECT * FROM exams`)).toEqual([{ id: 1, title: 'Protected exam' }]);
    await repository.folder(scope, folder, 'active', 'trashed');
    expect((await client`SELECT folder_id FROM airu_documents WHERE id=${note}`)[0]?.folder_id).toBe(root);
    expect((await client`SELECT parent_folder_id FROM airu_folders WHERE id=${child}`)[0]?.parent_folder_id).toBe(root);
  });
  test('a note name collision rolls back promoted folders, sprint metadata and deletion', async () => {
    await client`UPDATE airu_documents SET folder_id=${root}, name=${note} WHERE id=${nested}`;
    await expect(repository.folder(scope, folder, 'trashed', 'active')).rejects.toMatchObject({ statusCode: 409, code: 'NAME_CONFLICT' });
    expect((await client`SELECT parent_folder_id FROM airu_folders WHERE id=${child}`)[0]?.parent_folder_id).toBe(folder);
    expect((await client`SELECT folder_id FROM airu_documents WHERE id=${note}`)[0]?.folder_id).toBe(folder);
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata).toEqual({ unrelated: 'preserved' });
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${folder}`)[0]?.metadata.airunoteLifecycle).toBeUndefined();
  });
  test('a child folder name collision rolls back the operation', async () => {
    await client`UPDATE airu_folders SET parent_folder_id=${root}, human_id='Keep child' WHERE id=${grandchild}`;
    await expect(repository.folder(scope, folder, 'trashed', 'active')).rejects.toMatchObject({ code: 'NAME_CONFLICT' });
    expect((await client`SELECT parent_folder_id FROM airu_folders WHERE id=${child}`)[0]?.parent_folder_id).toBe(folder);
  });
  test('workspace root, foreign owners and foreign organizations cannot be mutated', async () => {
    await expect(repository.folder(scope, root, 'trashed', 'active')).rejects.toMatchObject({ code: 'ROOT_PROTECTED' });
    for (const denied of [{ ...scope, userId: other }, { ...scope, orgId: other }]) {
      await expect(repository.folder(denied, folder, 'trashed', 'active')).rejects.toMatchObject({ statusCode: 404 });
      await expect(repository.document(denied, note, 'trashed', at)).rejects.toMatchObject({ statusCode: 404 });
    }
  });
  test('stale folder operations are rejected', async () => {
    await repository.folder(scope, folder, 'archived', 'active');
    await expect(repository.folder(scope, folder, 'trashed', 'active')).rejects.toMatchObject({ statusCode: 409 });
  });
  test('notes archive, trash and restore without losing content or planning; stale versions fail', async () => {
    const archived = await repository.document(scope, note, 'archived', at);
    await expect(repository.document(scope, note, 'trashed', at)).rejects.toMatchObject({ statusCode: 409 });
    const trashed = await repository.document(scope, note, 'trashed', archived.updatedAt.toISOString());
    await repository.document(scope, note, 'active', trashed.updatedAt.toISOString());
    expect((await client`SELECT state, canonical_content, shared_content, attributes FROM airu_documents WHERE id=${note}`)[0]).toMatchObject({ state: 'active', canonical_content: 'Keep body', shared_content: 'Keep shared edit', attributes: { airunoteBook: plan } });
  });
  test('recovery requires archived ancestors to be restored first', async () => {
    const archivedNote = await repository.document(scope, nested, 'archived', at);
    await repository.folder(scope, grandchild, 'archived', 'active');
    await repository.folder(scope, folder, 'archived', 'active');
    await expect(repository.folder(scope, grandchild, 'active', 'archived')).rejects.toMatchObject({ code: 'PARENT_INACTIVE' });
    await expect(repository.document(scope, nested, 'active', archivedNote.updatedAt.toISOString())).rejects.toMatchObject({ code: 'PARENT_INACTIVE' });
  });
});
