/// <reference types="jest" />
import type { BookService } from '../../src/modules/book/book.service';
import type postgres from 'postgres';
import { defaultPlanning, editablePlanning } from '../../src/modules/book/contract';

// This suite only runs against an explicitly supplied disposable database.
const integration = process.env.BOOK_TEST_DATABASE_URL ? describe : describe.skip;
integration('Book isolated PostgreSQL integration', () => {
  let service: BookService; let client: ReturnType<typeof postgres>;
  const org = '10000000-0000-4000-8000-000000000001'; const otherOrg = '10000000-0000-4000-8000-000000000002';
  const user = '20000000-0000-4000-8000-000000000001'; const otherUser = '20000000-0000-4000-8000-000000000002';
  const root = '30000000-0000-4000-8000-000000000001'; const child = '30000000-0000-4000-8000-000000000002'; const outsider = '30000000-0000-4000-8000-000000000003';
  const id = '40000000-0000-4000-8000-000000000001'; const second = '40000000-0000-4000-8000-000000000002';
  const scope = { orgId: org, userId: user }; const at = '2026-10-20T00:00:00.000Z';
  beforeAll(async () => {
    const url = process.env.BOOK_TEST_DATABASE_URL;
    if (!url || !url.includes('127.0.0.1:54329/book_test')) throw new Error('Refusing to run destructive fixtures outside the named loopback test database');
    process.env.DATABASE_URL = url;
    const pg = (await import('postgres')).default; client = pg(url, { prepare: false });
    await client.unsafe(`CREATE TABLE IF NOT EXISTS airu_folders (id uuid PRIMARY KEY, org_id uuid NOT NULL, owner_user_id uuid NOT NULL, parent_folder_id uuid NOT NULL, human_id varchar(255) NOT NULL, visibility varchar(20) NOT NULL DEFAULT 'private', type varchar(50) NOT NULL DEFAULT 'box', metadata jsonb, default_lens_id uuid, created_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS airu_documents (id uuid PRIMARY KEY, folder_id uuid NOT NULL REFERENCES airu_folders(id), owner_user_id uuid NOT NULL, type varchar(5) NOT NULL, name varchar(255) NOT NULL, content text, canonical_content text NOT NULL DEFAULT '', shared_content text, visibility varchar(20) NOT NULL DEFAULT 'private', state varchar(20) NOT NULL DEFAULT 'active', attributes jsonb NOT NULL DEFAULT '{}', created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), UNIQUE(folder_id,name));
      CREATE TABLE IF NOT EXISTS airu_document_revisions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES airu_documents(id), content_type varchar(20) NOT NULL, content text NOT NULL, created_by_user_id uuid NOT NULL, created_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS exams (id uuid PRIMARY KEY, title text); INSERT INTO exams VALUES ('90000000-0000-4000-8000-000000000001','Protected exam fixture') ON CONFLICT DO NOTHING;`);
    await client.unsafe(`ALTER TABLE airu_documents ALTER COLUMN id SET DEFAULT gen_random_uuid(); CREATE TABLE IF NOT EXISTS orgs (id uuid PRIMARY KEY, plan varchar(20) NOT NULL);`);
    const module = await import('../../src/modules/book/book.service'); service = new module.BookService();
  });
  beforeEach(async () => {
    await client`INSERT INTO orgs (id,plan) VALUES (${org},'pro'),(${otherOrg},'pro') ON CONFLICT (id) DO UPDATE SET plan='pro'`;
    await client`TRUNCATE airu_document_revisions, airu_documents, airu_folders`;
    for (const [folderId, orgId, owner, parent] of [[root, org, user, root], [child, org, user, root], [outsider, otherOrg, user, outsider]]) {
      await client`INSERT INTO airu_folders (id,org_id,owner_user_id,parent_folder_id,human_id,metadata) VALUES (${folderId},${orgId},${owner},${parent},'Folder',${client.json({ unrelated: { keep: true } })})`;
    }
    for (const documentId of [id, second]) await client`INSERT INTO airu_documents (id,folder_id,owner_user_id,type,name,canonical_content,shared_content,attributes,updated_at) VALUES (${documentId},${child},${user},'MD',${documentId},'Original canonical','Pending shared edit',${client.json({ unrelated: { keep: true }, airunoteBook: defaultPlanning('task') })},${at})`;
  });
  afterAll(async () => { await client?.end(); });
  test('updates the same canonical item, preserves unrelated attributes and shared edits', async () => {
    const planning = { ...editablePlanning(defaultPlanning('task')), status: 'complete' as const, plan: { kind: 'day' as const, date: '2026-10-20', time: '09:00', duration: 60 } };
    const document = await service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, content: 'New brief', planning });
    expect(document.id).toBe(id); expect(document.canonicalContent).toBe('New brief'); expect(document.sharedContent).toBe('Pending shared edit');
    expect(document.attributes).toMatchObject({ unrelated: { keep: true }, airunoteBook: { status: 'complete', history: [{ actorId: user }] } });
    expect((await client`SELECT * FROM airu_document_revisions WHERE document_id=${id}`).length).toBe(1);
    expect((await client`SELECT * FROM exams`)).toEqual([expect.objectContaining({ title: 'Protected exam fixture' })]);
  });
  test('rejects stale saves without losing canonical data', async () => {
    await service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, name: 'Renamed' });
    await expect(service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, content: 'Stale draft' })).rejects.toMatchObject({ statusCode: 409 });
    expect((await client`SELECT canonical_content FROM airu_documents WHERE id=${id}`)[0]?.canonical_content).toBe('Original canonical');
  });
  test('enforces document owner, organization, and target subtree', async () => {
    await expect(service.update({ orgId: org, userId: otherUser }, id, { rootFolderId: root, expectedUpdatedAt: at, name: 'Denied' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.update({ orgId: otherOrg, userId: user }, id, { rootFolderId: outsider, expectedUpdatedAt: at, name: 'Denied' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, folderId: outsider })).rejects.toMatchObject({ statusCode: 404 });
  });
  test('does not rewrite rich text with the plain brief editor', async () => {
    await client`UPDATE airu_documents SET type='RTF' WHERE id=${id}`;
    await expect(service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, content: 'Do not flatten' })).rejects.toMatchObject({ code: 'RICH_TEXT_EDITOR_REQUIRED' });
  });
  test('configuration merges and uses a revision guard', async () => {
    await service.configure(scope, root, { expectedRevision: 0, config: { sprints: [], views: [], templates: [] } });
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata).toMatchObject({ unrelated: { keep: true }, airunoteBook: { revision: 1 } });
    await expect(service.configure(scope, root, { expectedRevision: 0, config: { sprints: [], views: [], templates: [] } })).rejects.toMatchObject({ statusCode: 409 });
  });
  test('a stale member rolls back the whole batch', async () => {
    await expect(service.batch(scope, { rootFolderId: root, entries: [{ id, expectedUpdatedAt: at }, { id: second, expectedUpdatedAt: '2020-01-01T00:00:00.000Z' }], change: { kind: 'status', status: 'complete' } })).rejects.toMatchObject({ statusCode: 409 });
    const rows = await client`SELECT attributes FROM airu_documents ORDER BY id`;
    expect(rows.every(row => row.attributes.airunoteBook.status === 'open')).toBe(true);
  });
  test('a broad calendar plan never moves the structural home', async () => {
    const result = await service.batch(scope, { rootFolderId: root, entries: [{ id, expectedUpdatedAt: at }, { id: second, expectedUpdatedAt: at }], change: { kind: 'plan', plan: { kind: 'month', month: '2026-11' } } });
    expect(result.every(document => document.folderId === child)).toBe(true);
    expect(result[0]?.attributes).toMatchObject({ airunoteBook: { plan: { kind: 'month', month: '2026-11' } } });
  });
  test('new capture is private, validated planning on one real document', async () => {
    const document = await service.create(scope, { rootFolderId: root, folderId: child, name: 'Captured', content: 'Brief', planning: editablePlanning(defaultPlanning('task', false)) });
    expect(document.visibility).toBe('private'); expect(document.ownerUserId).toBe(user);
    expect((await client`SELECT jsonb_typeof(attributes) AS kind FROM airu_documents WHERE id=${document.id}`)[0]?.kind).toBe('object');
    expect((await client`SELECT count(*)::int AS count FROM airu_documents`)[0]?.count).toBe(3);
  });
  test('capture respects the existing free document limit', async () => {
    await client`UPDATE orgs SET plan='free' WHERE id=${org}`; process.env.FREE_PLAN_LIMIT = '2';
    try { await expect(service.create(scope, { rootFolderId: root, folderId: child, name: 'Over quota', content: '', planning: editablePlanning(defaultPlanning('task')) })).rejects.toMatchObject({ code: 'UPGRADE_REQUIRED' }); }
    finally { delete process.env.FREE_PLAN_LIMIT; }
  });
  test('clearing the brief cannot resurrect deprecated content in legacy views', async () => {
    await client`UPDATE airu_documents SET content='Deprecated body' WHERE id=${id}`;
    await service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, content: '' });
    const [row] = await client`SELECT content, canonical_content FROM airu_documents WHERE id=${id}`;
    expect(row).toMatchObject({ content: '', canonical_content: '' });
  });
});
