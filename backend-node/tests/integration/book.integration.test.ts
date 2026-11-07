/// <reference types="jest" />
import 'reflect-metadata';
import type { BookService } from '../../src/modules/book/book.service';
import type postgres from 'postgres';
import { defaultPlanning, editablePlanning } from '../../src/modules/book/contract';
import { defaultKindFields, readKindDetails } from '../../src/modules/book/kinds';

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
    await client.unsafe(`ALTER TABLE airu_documents ALTER COLUMN id SET DEFAULT gen_random_uuid(); CREATE TABLE IF NOT EXISTS orgs (id uuid PRIMARY KEY, plan varchar(20) NOT NULL);
      CREATE TABLE IF NOT EXISTS airu_lenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), folder_id uuid REFERENCES airu_folders(id), name varchar(255) NOT NULL, type varchar(50) NOT NULL, is_default boolean NOT NULL DEFAULT false, metadata jsonb, query jsonb, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());`);
    const module = await import('../../src/modules/book/book.service'); service = new module.BookService();
  });
  beforeEach(async () => {
    await client`INSERT INTO orgs (id,plan) VALUES (${org},'pro'),(${otherOrg},'pro') ON CONFLICT (id) DO UPDATE SET plan='pro'`;
    await client`TRUNCATE airu_document_revisions, airu_documents, airu_lenses, airu_folders`;
    for (const [folderId, orgId, owner, parent] of [[root, org, user, root], [child, org, user, root], [outsider, otherOrg, user, outsider]]) {
      await client`INSERT INTO airu_folders (id,org_id,owner_user_id,parent_folder_id,human_id,metadata) VALUES (${folderId},${orgId},${owner},${parent},${folderId === root || folderId === outsider ? '__user_root__' : 'Folder'},${client.json({ unrelated: { keep: true } })})`;
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
  test('explicit rich-text editing preserves HTML, format, shared edits and stale-save protection', async () => {
    await client`UPDATE airu_documents SET type='RTF' WHERE id=${id}`;
    const content = '<p class="custom"><strong>Formatted</strong></p><table><tr><td>Cell</td></tr></table>';
    const saved = await service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, content, contentType: 'RTF' });
    expect(saved.type).toBe('RTF'); expect(saved.canonicalContent).toBe(content); expect(saved.sharedContent).toBe('Pending shared edit');
    expect((await client`SELECT content FROM airu_document_revisions WHERE document_id=${id}`)[0]?.content).toBe(content);
    await expect(service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, content: '<p>Stale</p>', contentType: 'RTF' })).rejects.toMatchObject({ statusCode: 409 });
    expect((await client`SELECT canonical_content FROM airu_documents WHERE id=${id}`)[0]?.canonical_content).toBe(content);
    await expect(service.update(scope, second, { rootFolderId: root, expectedUpdatedAt: at, content, contentType: 'RTF' })).rejects.toMatchObject({ code: 'DOCUMENT_FORMAT_CHANGED' });
  });
  test('copies rich text and independent task dates without inheriting sharing or history', async () => {
    await client`UPDATE airu_documents SET type='RTF', visibility='public' WHERE id=${id}`;
    const planning = editablePlanning(defaultPlanning('task'));
    planning.checklist = [{ id: second, text: 'Review first', done: false, dueDate: '2026-11-10' }];
    const source = await service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, planning, kindFields: { ...defaultKindFields(), reminderAt: '2026-11-10T02:00:00.000Z' } });
    const target = { rootFolderId: root, folderId: root, expectedUpdatedAt: source.updatedAt.toISOString() };
    const [first, secondCopy] = await Promise.all([service.copy(scope, id, target), service.copy(scope, id, target)]);
    expect(new Set([first.name, secondCopy.name])).toEqual(new Set([id + ' (copy)', id + ' (copy 2)']));
    expect(first).toMatchObject({ type: 'RTF', visibility: 'private', sharedContent: null, canonicalContent: 'Original canonical', folderId: root });
    expect(first.attributes).toMatchObject({ airunoteBook: { checklist: planning.checklist, history: [expect.any(Object)] }, airunoteKinds: { reminderAt: null, releases: [] } });
    await expect(service.copy(scope, id, { ...target, expectedUpdatedAt: at })).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.copy(scope, id, { ...target, folderId: outsider })).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.copy({ ...scope, userId: otherUser }, id, target)).rejects.toMatchObject({ statusCode: 404 });
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
  test('kind validation rejects empty task lists, untimed events and unmeasured goals', async () => {
    for (const kind of ['task', 'event', 'goal'] as const) {
      await expect(service.create(scope, { rootFolderId: root, folderId: child, name: kind, content: 'Keep draft local', planning: editablePlanning(defaultPlanning(kind)), kindFields: { ...defaultKindFields(), taskMode: 'list' } })).rejects.toMatchObject({ code: 'INVALID_KIND_DETAILS' });
    }
    expect((await client`SELECT count(*)::int AS count FROM airu_documents`)[0]?.count).toBe(2);
  });
  test('task-list completion follows steps and can reopen without creating a second item', async () => {
    const planning = editablePlanning(defaultPlanning('task'));
    planning.checklist = [{ id: '80000000-0000-4000-8000-000000000001', text: 'First', done: false }, { id: '80000000-0000-4000-8000-000000000002', text: 'Second', done: false }];
    const first = await service.create(scope, { rootFolderId: root, folderId: child, name: 'List', content: 'Supporting notes', planning, kindFields: { ...defaultKindFields(), taskMode: 'list' } });
    const completed = await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: first.updatedAt.toISOString(), planning: { ...planning, checklist: planning.checklist.map(item => ({ ...item, done: true })) } });
    expect(completed.attributes).toMatchObject({ airunoteBook: { status: 'complete' } });
    const reopened = await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: completed.updatedAt.toISOString(), planning });
    expect(reopened).toMatchObject({ id: first.id, canonicalContent: 'Supporting notes', attributes: { airunoteBook: { status: 'open' }, airunoteKinds: { taskMode: 'list' } } });
    const [batchComplete] = await service.batch(scope, { rootFolderId: root, entries: [{ id: first.id, expectedUpdatedAt: reopened.updatedAt.toISOString() }], change: { kind: 'status', status: 'complete' } });
    expect(batchComplete?.attributes).toMatchObject({ airunoteBook: { status: 'complete', checklist: [{ done: true }, { done: true }] } });
    await expect(service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: first.updatedAt.toISOString(), content: 'Stale' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  test('measured goal progress is independent of task completion and records history', async () => {
    const planning = editablePlanning(defaultPlanning('goal'));
    const fields = { ...defaultKindFields(), goal: { measure: 'Revenue received', unit: 'PHP', current: 0, target: 10000, nextTaskId: id } };
    const goal = await service.create(scope, { rootFolderId: root, folderId: child, name: 'First earnings', content: '', planning, kindFields: fields });
    await service.update(scope, id, { rootFolderId: root, expectedUpdatedAt: at, planning: { ...editablePlanning(defaultPlanning('task')), status: 'complete' } });
    const [unchanged] = await client`SELECT attributes FROM airu_documents WHERE id=${goal.id}`;
    expect(unchanged?.attributes).toMatchObject({ airunoteKinds: { goal: { current: 0 }, goalHistory: [{ current: 0 }] }, airunoteBook: { status: 'open' } });
    await expect(service.batch(scope, { rootFolderId: root, entries: [{ id: goal.id, expectedUpdatedAt: goal.updatedAt.toISOString() }], change: { kind: 'status', status: 'complete' } })).rejects.toMatchObject({ code: 'GOAL_PROGRESS_REQUIRED' });
    const updated = await service.update(scope, goal.id, { rootFolderId: root, expectedUpdatedAt: goal.updatedAt.toISOString(), kindFields: { ...fields, goal: { ...fields.goal, current: 10000 } } });
    expect(updated.attributes).toMatchObject({ airunoteBook: { status: 'complete' }, airunoteKinds: { goalHistory: [{ current: 0 }, { current: 10000 }] } });
    const reopened = await service.update(scope, goal.id, { rootFolderId: root, expectedUpdatedAt: updated.updatedAt.toISOString(), kindFields: { ...fields, goal: { ...fields.goal, current: 2500 } } });
    expect(reopened.attributes).toMatchObject({ airunoteBook: { status: 'open' }, airunoteKinds: { goal: { current: 2500 } } });
    await expect(service.update(scope, goal.id, { rootFolderId: root, expectedUpdatedAt: reopened.updatedAt.toISOString(), kindFields: { ...fields, goal: { ...fields.goal, nextTaskId: goal.id } } })).rejects.toMatchObject({ code: 'INVALID_GOAL_TASK' });
  });
  test('configured event keeps its time slot and rejects broad planning without losing content', async () => {
    const planning = editablePlanning(defaultPlanning('event'));
    planning.plan = { kind: 'day', date: '2026-11-09', time: '10:00', duration: 30 };
    const first = await service.create(scope, { rootFolderId: root, folderId: child, name: 'Review', content: 'Agenda', planning, kindFields: { ...defaultKindFields(), location: 'Video call', meetingUrl: 'https://example.com/meeting' } });
    await expect(service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: first.updatedAt.toISOString(), planning: { ...planning, plan: { kind: 'week', start: '2026-11-09' } } })).rejects.toMatchObject({ code: 'INVALID_KIND_DETAILS' });
    const saved = await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: first.updatedAt.toISOString(), content: 'Updated agenda' });
    expect(saved.attributes).toMatchObject({ airunoteBook: { plan: planning.plan }, airunoteKinds: { meetingUrl: 'https://example.com/meeting' } });
  });
  test('document ready versions are immutable, idempotent, private and owner-scoped', async () => {
    const planning = editablePlanning(defaultPlanning('document'));
    const first = await service.create(scope, { rootFolderId: root, folderId: child, name: 'Guide', content: '# First version', planning, kindFields: defaultKindFields() });
    const ready = await service.readyDocument(scope, first.id, root, first.updatedAt.toISOString());
    const release = readKindDetails(ready.attributes)!.releases[0]!;
    expect(ready.visibility).toBe('private'); expect(release.number).toBe(1);
    expect(readKindDetails((await service.readyDocument(scope, first.id, root, ready.updatedAt.toISOString())).attributes)?.releases).toHaveLength(1);
    const edited = await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: ready.updatedAt.toISOString(), name: 'Updated guide', content: '# Second version' });
    expect(await service.documentVersion(scope, first.id, root, release.id)).toMatchObject({ name: 'Guide', content: '# First version', number: 1 });
    await expect(service.readyDocument(scope, first.id, root, ready.updatedAt.toISOString())).rejects.toMatchObject({ code: 'CONFLICT' });
    const secondReady = await service.readyDocument(scope, first.id, root, edited.updatedAt.toISOString());
    expect(readKindDetails(secondReady.attributes)?.releases).toHaveLength(2);
    await expect(service.documentVersion({ orgId: otherOrg, userId: user }, first.id, root, release.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.documentVersion({ orgId: org, userId: otherUser }, first.id, root, release.id)).rejects.toMatchObject({ statusCode: 404 });
    const [otherRevision] = await client`SELECT id FROM airu_document_revisions WHERE document_id=${first.id} AND id<>${release.id} ORDER BY created_at LIMIT 1`;
    if (otherRevision) await expect(service.documentVersion(scope, first.id, root, otherRevision.id)).rejects.toMatchObject({ code: 'VERSION_NOT_FOUND' });
  });
  test('conversion preserves content, identity, custom attributes and past ready versions', async () => {
    const first = await service.create(scope, { rootFolderId: root, folderId: child, name: 'A note', content: 'Existing body', planning: editablePlanning(defaultPlanning('note')) });
    const converted = await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: first.updatedAt.toISOString(), planning: editablePlanning(defaultPlanning('document')), kindFields: defaultKindFields() });
    const ready = await service.readyDocument(scope, first.id, root, converted.updatedAt.toISOString());
    const back = await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: ready.updatedAt.toISOString(), planning: editablePlanning(defaultPlanning('note')) });
    expect(back).toMatchObject({ id: first.id, canonicalContent: 'Existing body', folderId: child, visibility: 'private' });
    expect(readKindDetails(back.attributes)?.releases).toHaveLength(1);
    expect((await client`SELECT count(*)::int AS count FROM airu_documents`)[0]?.count).toBe(3);
  });
  test('daily creation is private, dated, and idempotent across concurrent requests', async () => {
    const documents = await Promise.all(Array.from({ length: 4 }, () => service.daily(scope, root, '2026-11-05')));
    expect(new Set(documents.map(document => document.id)).size).toBe(1);
    expect(documents[0]).toMatchObject({ name: 'November 5, 2026', visibility: 'private', folderId: root, attributes: {
      airunoteDaily: { date: '2026-11-05' }, airunoteBook: { kind: 'note', processed: true, plan: { kind: 'day', date: '2026-11-05' } },
    } });
    expect((await client`SELECT count(*)::int AS count FROM airu_documents`)[0]?.count).toBe(3);
  });
  test('daily lookup follows moves and renames and preserves saved content', async () => {
    const first = await service.daily(scope, root, '2026-11-05');
    await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: first.updatedAt.toISOString(), name: 'My day', folderId: child, content: 'Keep my notes' });
    const reopened = await service.daily(scope, root, '2026-11-05');
    expect(reopened).toMatchObject({ id: first.id, folderId: child, name: 'My day', canonicalContent: 'Keep my notes' });
    await client`UPDATE airu_documents SET state='archived' WHERE id=${first.id}`;
    await expect(service.daily(scope, root, '2026-11-05')).rejects.toMatchObject({ code: 'DAILY_NOTE_INACTIVE' });
  });
  test('a date-like rename cannot reassign another daily note', async () => {
    const first = await service.daily(scope, root, '2026-11-05');
    await service.update(scope, first.id, { rootFolderId: root, expectedUpdatedAt: first.updatedAt.toISOString(), name: 'November 6, 2026' });
    await expect(service.daily(scope, root, '2026-11-06')).rejects.toMatchObject({ code: 'DAILY_NOTE_NAME_CONFLICT' });
    expect((await service.daily(scope, root, '2026-11-05')).id).toBe(first.id);
  });
  test('daily lookup reuses a legacy date title without clearing its checklist', async () => {
    const planning = editablePlanning(defaultPlanning('note'));
    planning.checklist = [{ id: '80000000-0000-4000-8000-000000000001', text: 'Existing item', done: true }];
    const first = await service.create(scope, { rootFolderId: root, folderId: root, name: 'November 5, 2026', content: 'Existing text', planning });
    const reopened = await service.daily(scope, root, '2026-11-05');
    expect(reopened).toMatchObject({ id: first.id, canonicalContent: 'Existing text', attributes: { airunoteBook: { checklist: planning.checklist } } });
  });
  test('daily lookup adopts a scheduled ISO day note in its existing nested folder', async () => {
    const planning = editablePlanning(defaultPlanning('note'));
    planning.plan = { kind: 'day', date: '2026-11-06', time: null, duration: null };
    planning.checklist = [{ id: '80000000-0000-4000-8000-000000000001', text: 'Keep this next step', done: true }];
    const first = await service.create(scope, { rootFolderId: root, folderId: child, name: '2026-11-06 · Friday', content: 'Existing guidance', planning });
    const reopened = await service.daily(scope, root, '2026-11-06');
    expect(reopened).toMatchObject({ id: first.id, folderId: child, name: first.name, canonicalContent: 'Existing guidance', attributes: { airunoteDaily: { date: '2026-11-06' }, airunoteBook: { checklist: planning.checklist } } });
    expect((await service.daily(scope, root, '2026-11-06')).id).toBe(first.id);
    expect((await client`SELECT count(*)::int AS count FROM airu_documents`)[0]?.count).toBe(3);
  });
  test('ambiguous legacy day notes require an explicit choice instead of adopting arbitrarily', async () => {
    const planning = editablePlanning(defaultPlanning('note'));
    planning.plan = { kind: 'day', date: '2026-11-06', time: null, duration: null };
    for (const folderId of [root, child]) await service.create(scope, { rootFolderId: root, folderId, name: '2026-11-06 · Friday', content: 'Keep both', planning });
    await expect(service.daily(scope, root, '2026-11-06')).rejects.toMatchObject({ code: 'DAILY_NOTE_AMBIGUOUS' });
    expect((await client`SELECT count(*)::int AS count FROM airu_documents`)[0]?.count).toBe(4);
  });
  test('daily notes enforce scope, dates, quotas, and preserve existing notes at the limit', async () => {
    await expect(service.daily({ orgId: otherOrg, userId: user }, root, '2026-11-05')).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.daily({ orgId: org, userId: otherUser }, root, '2026-11-05')).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.daily(scope, child, '2026-11-05')).rejects.toMatchObject({ code: 'INVALID_DAILY_ROOT' });
    await expect(service.daily(scope, root, '2026-02-30')).rejects.toThrow();
    const first = await service.daily(scope, root, '2026-11-05');
    await client`UPDATE orgs SET plan='free' WHERE id=${org}`;
    process.env.FREE_PLAN_LIMIT = '3';
    try {
      expect((await service.daily(scope, root, '2026-11-05')).id).toBe(first.id);
      await expect(service.daily(scope, root, '2026-11-06')).rejects.toMatchObject({ code: 'UPGRADE_REQUIRED' });
    } finally { delete process.env.FREE_PLAN_LIMIT; }
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

  test('root Notes preserves nested Book sprints for capture, edit and atomic batch', async () => {
    const sprintId = '50000000-0000-4000-8000-000000000001';
    const config = { sprints: [{ id: sprintId, name: 'Nested sprint', start: '2026-10-26', end: '2026-11-08', closed: false }], views: [], templates: [] };
    await service.configure(scope, child, { expectedRevision: 0, config });
    const fields = { ...editablePlanning(defaultPlanning('task')), plan: { kind: 'sprint' as const, sprintId } };
    const captured = await service.create(scope, { rootFolderId: root, folderId: child, name: 'Nested plan', content: 'Keep this', planning: fields });
    const edited = await service.update(scope, captured.id, { rootFolderId: root, expectedUpdatedAt: captured.updatedAt.toISOString(), planning: { ...fields, priority: true } });
    const batch = await service.batch(scope, { rootFolderId: root, entries: [{ id: edited.id, expectedUpdatedAt: edited.updatedAt.toISOString() }], change: { kind: 'status', status: 'complete' } });
    expect(batch[0]?.attributes).toMatchObject({ airunoteBook: { status: 'complete', plan: fields.plan } });
    expect((await client`SELECT metadata FROM airu_folders WHERE id=${root}`)[0]?.metadata).toEqual({ unrelated: { keep: true } });
    await expect(service.create(scope, { rootFolderId: root, folderId: root, name: 'Wrong branch', content: '', planning: fields })).rejects.toMatchObject({ code: 'INVALID_SPRINT' });
    const completed = batch[0]; if (!completed) throw new Error('Batch returned no document');
    await expect(service.update(scope, edited.id, { rootFolderId: root, folderId: root, expectedUpdatedAt: completed.updatedAt.toISOString(), planning: fields })).rejects.toMatchObject({ code: 'INVALID_SPRINT' });
  });

  test('view index includes nested views but excludes other owners, organizations and layouts', async () => {
    const foreign = '30000000-0000-4000-8000-000000000004';
    await client`INSERT INTO airu_folders (id,org_id,owner_user_id,parent_folder_id,human_id) VALUES (${foreign},${org},${otherUser},${foreign},'Someone else')`;
    for (const [folderId, name, type] of [[root, 'Root canvas', 'canvas'], [child, 'Nested board', 'board'], [outsider, 'Other org', 'canvas'], [foreign, 'Other owner', 'board']]) {
      await client`INSERT INTO airu_lenses (folder_id,name,type,metadata,query) VALUES (${folderId},${name},${type},${client.json({ privateLayout: true })},${client.json({ privateQuery: true })})`;
    }
    const { AirunoteRepository } = await import('../../src/modules/airunote/airunote.repository');
    const repo = new AirunoteRepository();
    const result = await repo.getFullMetadata(org, user);
    expect(result.folderViews.map(view => view.name).sort()).toEqual(['Nested board', 'Root canvas']);
    expect(result.folderViews.every(view => !('metadata' in view) && !('query' in view))).toBe(true);
    expect(result.lensCounts).toMatchObject({ [root]: 1, [child]: 1 });
    expect(result.documents.every(document => !('content' in document) && !('canonicalContent' in document))).toBe(true);
    expect((await repo.getFullMetadata(otherOrg, otherUser)).folderViews).toEqual([]);
    expect((await client`SELECT * FROM exams`)).toEqual([expect.objectContaining({ title: 'Protected exam fixture' })]);
  });
});
