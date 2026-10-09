// Run only against a disposable loopback database whose name ends in _test.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { migrateAppearance } from '../../scripts/migrate-exam-appearance';
import { legacyAppearance, plainAppearance } from '../../src/modules/exam-appearance/contract';

async function main() {
  const url = process.env.DATABASE_URL!;
  const target = new URL(url);
  assert(
    ['localhost', '127.0.0.1'].includes(target.hostname) && target.pathname.endsWith('_test'),
    'Disposable local database required'
  );
  const sql = postgres(url, { max: 1 });
  const org = randomUUID(),
    otherOrg = randomUUID(),
    admin = randomUUID(),
    member = randomUUID();
  const adminEmail = `appearance-${admin}@example.test`;
  const password = 'Appearance-local-test-42';
  const passed: string[] = [];
  const check = (name: string) => {
    passed.push(name);
    console.log(`PASS ${name}`);
  };
  try {
    await sql`INSERT INTO users(id,email,name,password_hash,email_verified_at) VALUES (${admin},${adminEmail},'Appearance Admin',${await bcrypt.hash(password, 10)},now()),(${member},${`member-${member}@example.test`},'Member','unused',now())`;
    await sql`INSERT INTO orgs(id,name,slug) VALUES (${org},'Appearance Smoke',${org}),(${otherOrg},'Other Org',${otherOrg})`;
    await sql`INSERT INTO roles(id,name,code) VALUES (1,'Admin','admin'),(2,'Member','member') ON CONFLICT DO NOTHING`;
    for (const [user, role] of [
      [admin, 1],
      [member, 2],
    ] as const) {
      const [m] =
        await sql`INSERT INTO org_users(org_id,user_id) VALUES (${org},${user}) RETURNING id`;
      await sql`INSERT INTO org_user_roles(org_user_id,role_id) VALUES (${m.id},${role})`;
    }
    const [otherMembership] =
      await sql`INSERT INTO org_users(org_id,user_id) VALUES (${otherOrg},${admin}) RETURNING id`;
    await sql`INSERT INTO org_user_roles(org_user_id,role_id) VALUES (${otherMembership.id},1)`;
    const fixtureIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const [exam] =
        await sql`INSERT INTO exams(org_id,created_by_user_id,title,public_id,status,description,prevent_focus_loss) VALUES (${org},${admin},${`Existing exam ${i + 1}`},${`legacy-${randomUUID()}`},'published','Start with Integrity and Honesty',false) RETURNING id`;
      fixtureIds.push(exam.id);
    }
    const before =
      await sql`SELECT id,title,description,public_id,status,created_at,updated_at FROM exams WHERE id=ANY(${fixtureIds}) ORDER BY id`;
    await migrateAppearance(url);
    await migrateAppearance(url);
    const after =
      await sql`SELECT id,title,description,public_id,status,created_at,updated_at FROM exams WHERE id=ANY(${fixtureIds}) ORDER BY id`;
    assert.deepEqual(after, before);
    const [tc] =
      await sql`SELECT count(*) FROM exam_templates WHERE org_id=${org} AND legacy_key='autumn-v1'`;
    assert.equal(Number(tc.count), 1);
    check('Migration is repeat-safe and preserves existing exam data');
    const { createApp } = await import('../../src/api/server');
    const app = createApp();
    const token = jwt.sign({ userId: admin, email: adminEmail }, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: '1d',
    });
    const memberToken = jwt.sign(
      { userId: member, email: 'member@example.test' },
      process.env.JWT_ACCESS_SECRET!
    );
    const auth = { Authorization: `Bearer ${token}` };
    const base = `/api/orgs/${org}`;
    const otherBase = `/api/orgs/${otherOrg}`;
    const get = async (p: string, status = 200) => {
      const r = await request(app).get(p).set(auth);
      assert.equal(r.status, status, JSON.stringify(r.body));
      return r.body.data;
    };
    const put = async (p: string, body: unknown, status = 200) => {
      const r = await request(app).put(p).set(auth).send(body);
      assert.equal(r.status, status, JSON.stringify(r.body));
      return r.body.data;
    };
    const post = async (p: string, body: unknown, status = 200) => {
      const r = await request(app).post(p).set(auth).send(body);
      assert.equal(r.status, status, JSON.stringify(r.body));
      return r.body.data;
    };
    const legacy = await get(`${base}/appearance/exams/${fixtureIds[0]}`);
    assert.deepEqual(legacy.config, legacyAppearance);
    assert.equal((await get(`${base}/appearance/assets`)).length, 2);
    check('Built-in catalog and legacy appearance are available');
    const template = await post(`${base}/appearance/templates`, {
      name: 'Independent theme',
      config: plainAppearance,
    });
    await put(`${base}/appearance/default`, { templateId: template.id });
    const definition = {
      title: 'Smoke exam',
      description: 'Local smoke test',
      status: 'published',
      preventFocusLoss: false,
      questions: [
        {
          type: 'single_choice',
          prompt: 'Pick A',
          options: [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
          ],
          correctAnswers: ['a'],
        },
      ],
    };
    const exam = await post(`${base}/exams`, definition, 201);
    let appearance = await get(`${base}/appearance/exams/${exam.id}`);
    assert.deepEqual(appearance.config, plainAppearance);
    const another = await post(
      `${base}/exams`,
      { ...definition, title: 'Independent second exam' },
      201
    );
    let anotherAppearance = await get(`${base}/appearance/exams/${another.id}`);
    const edited = structuredClone(plainAppearance);
    edited.brand.name = 'Wrapped in Joy test';
    edited.colors.primary = '#a12445';
    appearance = await put(`${base}/appearance/exams/${exam.id}`, {
      ...appearance,
      config: edited,
    });
    await put(
      `${base}/appearance/exams/${exam.id}`,
      { ...appearance, revision: appearance.revision - 1 },
      409
    );
    assert.deepEqual(await get(`${base}/appearance/exams/${another.id}`), anotherAppearance);
    await put(`${base}/appearance/templates/${template.id}`, {
      name: template.name,
      config: edited,
      revision: template.revision,
    });
    assert.deepEqual(await get(`${base}/appearance/exams/${another.id}`), anotherAppearance);
    check('Exam copies, reusable templates, defaults, and stale-save conflicts are independent');
    const denied = await request(app)
      .put(`${base}/appearance/exams/${exam.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send(appearance);
    assert.equal(denied.status, 403);
    await put(`${otherBase}/appearance/default`, { templateId: template.id }, 400);
    await get(`${otherBase}/appearance/exams/${exam.id}`, 404);
    const invalid = structuredClone(appearance);
    (invalid.config.colors as any).text = 'url(javascript:alert(1))';
    await put(`${base}/appearance/exams/${exam.id}`, invalid, 400);
    const duplicate = await post(`${base}/exams/${exam.id}/duplicate`, {}, 201);
    assert.deepEqual((await get(`${base}/appearance/exams/${duplicate.id}`)).config, edited);
    check('Admin permissions, organization boundaries, validation, and duplicate appearance');
    const started = await post(
      `/api/public/exams/${exam.publicId}/start`,
      { respondentName: 'Local smoke respondent', deviceId: randomUUID() },
      201
    );
    const attemptAuth = { 'x-exam-attempt-token': started.accessToken };
    const q = started.attempt.questions[0];
    appearance = await put(`${base}/appearance/exams/${exam.id}`, {
      ...appearance,
      config: legacyAppearance,
    });
    const resumed = await request(app).get('/api/public/exams/attempts/current').set(attemptAuth);
    assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
    assert.deepEqual(resumed.body.data.appearance, edited);
    const answer = await request(app)
      .put(`/api/public/exams/attempts/current/answers/${q.id}`)
      .set(attemptAuth)
      .send({ answer: [q.options[0].id] });
    assert.equal(answer.status, 200, JSON.stringify(answer.body));
    const completed = await request(app)
      .post('/api/public/exams/attempts/current/submit')
      .set(attemptAuth)
      .send({});
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.equal(completed.body.data.status, 'completed');
    check('Respondent start, answer, resume, submit, and frozen appearance');
    const buffer = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/public/exams/store-9/cats.png')
    );
    const uploadId = randomUUID();
    const upload = await request(app)
      .post(`${base}/files/upload`)
      .set(auth)
      .field('visibility', 'public')
      .field('uploadId', uploadId)
      .attach('file', buffer, 'cats.png');
    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    const file = upload.body.data;
    assert(!file.storageKey);
    const retry = await request(app)
      .post(`${base}/files/upload`)
      .set(auth)
      .field('visibility', 'public')
      .field('uploadId', uploadId)
      .attach('file', buffer, 'cats.png');
    assert([200, 201].includes(retry.status), JSON.stringify(retry.body));
    assert.equal(retry.body.data.id, file.id);
    assert.equal((await get(`${base}/files`)).filter((f: any) => f.id === file.id).length, 1);
    const preview = await request(app).get(`${base}/files/${file.id}/content`).set(auth);
    assert.equal(preview.status, 200);
    assert.equal(preview.headers['content-type'], 'image/png');
    const assetConfig = structuredClone(plainAppearance);
    assetConfig.artwork = {
      asset: { source: 'org-file', fileId: file.id },
      visible: true,
      alt: 'Cats',
      caption: 'Test image',
    };
    appearance = await put(`${base}/appearance/exams/${exam.id}`, {
      ...appearance,
      config: assetConfig,
    });
    const publicImage = await request(app).get(`/api/public/exam-assets/${file.id}`);
    assert.equal(publicImage.status, 200);
    const denyDelete = await request(app).delete(`${base}/files/${file.id}`).set(auth);
    assert.equal(denyDelete.status, 409);
    const denyPrivate = await request(app)
      .patch(`${base}/files/${file.id}/visibility`)
      .set(auth)
      .send({ visibility: 'private' });
    assert.equal(denyPrivate.status, 409);
    const otherExam = await post(
      `${otherBase}/exams`,
      { ...definition, title: 'Other organization exam' },
      201
    );
    const otherAppearance = await get(`${otherBase}/appearance/exams/${otherExam.id}`);
    await put(
      `${otherBase}/appearance/exams/${otherExam.id}`,
      { ...otherAppearance, config: assetConfig },
      400
    );
    assert.deepEqual(await get(`${otherBase}/appearance/exams/${otherExam.id}`), otherAppearance);
    const fileAttempt = await post(
      `/api/public/exams/${exam.publicId}/start`,
      { respondentName: 'Retained asset respondent', deviceId: randomUUID() },
      201
    );
    appearance = await put(`${base}/appearance/exams/${exam.id}`, {
      ...appearance,
      config: legacyAppearance,
    });
    assert.equal((await request(app).delete(`${base}/files/${file.id}`).set(auth)).status, 409);
    assert.equal((await request(app).get(`/api/public/exam-assets/${file.id}`)).status, 200);
    // Simulate a future retention purge in this disposable database, then verify cleanup.
    await sql`DELETE FROM exam_asset_usage WHERE owner_kind='attempt' AND owner_id=${fileAttempt.attempt.id}`;
    const removed = await request(app).delete(`${base}/files/${file.id}`).set(auth);
    assert.equal(removed.status, 200);
    assert.equal(removed.body.data.cleanupPending, false);
    const gone = await request(app).get(`/api/public/exam-assets/${file.id}`);
    assert.equal(gone.status, 404);
    check(
      'Actual bytes, idempotent retries, previews, public rendering, attempt retention, cleanup, and cross-org rejection'
    );
    const unsupported = await request(app)
      .post(`${base}/files/upload`)
      .set(auth)
      .attach('file', Buffer.from('<svg onload="alert(1)"/>'), 'bad.svg');
    assert.equal(unsupported.status, 400);
    const oldLocal = process.env.FILE_STORAGE_LOCAL_DIR;
    delete process.env.FILE_STORAGE_LOCAL_DIR;
    const capabilities = await get(`${base}/files/capabilities`);
    assert.equal(capabilities.uploadsAvailable, false);
    assert.equal((await get(`${base}/appearance/assets`)).length, 2);
    process.env.FILE_STORAGE_LOCAL_DIR = oldLocal;
    check('Unsupported upload rejection and built-ins with storage disabled');
    await post(`${base}/appearance/templates/${template.id}/archive`, {});
    assert.equal((await get(`${base}/appearance/templates`)).defaultTemplateId, null);
    assert.deepEqual(await get(`${base}/appearance/exams/${another.id}`), anotherAppearance);
    check('Template archival preserves existing exams and clears its default');
    const report = await get(`${base}/exams/${exam.id}/report`);
    assert(report);
    fs.mkdirSync(path.resolve(__dirname, '../../.smoke'), { recursive: true });
    fs.writeFileSync(
      path.resolve(__dirname, '../../.smoke/browser-fixture.json'),
      JSON.stringify(
        {
          orgId: org,
          examId: exam.id,
          publicId: exam.publicId,
          adminEmail,
          password,
          token,
          legacyIds: fixtureIds,
          passed,
        },
        null,
        2
      )
    );
    console.log(`${passed.length} integration groups passed. Browser fixture saved locally.`);
  } finally {
    await sql.end();
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
