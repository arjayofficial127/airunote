import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ExamService } from '../../src/modules/exams/exam.service';
import { ExamRepository } from '../../src/modules/exams/exam.repository';

test('examiner code is enforced server-side and grants are scoped, expiring and revoked by rotation', async () => {
  process.env.JWT_EXAM_PREVIEW_SECRET = 'unit-test-only';
  process.env.EXAM_IDENTITY_PEPPER = 'unit-pepper';
  const exam = { id: 'exam-one', status: 'published', questions: [{}], maxAttempts: 1 };
  let hash: string | null = createHash('sha256').update('unit-pepper:entry-code:exam-one:01234567').digest('hex');
  let counted = 0;
  const service = new ExamService({
    getByPublicId: async () => exam,
    getAccessCode: async () => hash,
    countAttempts: async () => { counted++; return 1; },
  } as unknown as ExamRepository);
  const input = { respondentName: 'Test', deviceId: 'test-device' };
  const signals = { ipAddress: '127.0.0.1', userAgent: 'test' };
  const rejected = (code: string) => (e: any) => e.code === code;
  await assert.rejects(service.startAttempt('exam', input, signals), rejected('ENTRY_CODE_REQUIRED'));
  assert.equal(counted, 0);
  await assert.rejects(service.unlockEntry('exam', '99999999'), rejected('INVALID_ENTRY_CODE'));
  const { grant } = await service.unlockEntry('exam', '01234567');
  await assert.rejects(service.startAttempt('exam', { ...input, entryGrant: grant }, signals), rejected('ATTEMPT_LIMIT_REACHED'));
  assert.equal(counted, 1);
  exam.id = 'exam-two';
  await assert.rejects(service.startAttempt('exam', { ...input, entryGrant: grant }, signals), rejected('ENTRY_CODE_REQUIRED'));
  exam.id = 'exam-one';
  const secret = createHash('sha256').update('airunote:exam-preview:unit-test-only').digest('hex');
  const expired = jwt.sign({ purpose: 'exam-entry', examId: exam.id, codeHash: hash }, secret, { expiresIn: -1 });
  await assert.rejects(service.startAttempt('exam', { ...input, entryGrant: expired }, signals), rejected('ENTRY_CODE_REQUIRED'));
  hash = 'rotated';
  await assert.rejects(service.startAttempt('exam', { ...input, entryGrant: grant }, signals), rejected('ENTRY_CODE_REQUIRED'));
  hash = null;
  await assert.rejects(service.startAttempt('exam', input, signals), rejected('ATTEMPT_LIMIT_REACHED'));
});
