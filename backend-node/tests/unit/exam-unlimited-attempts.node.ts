import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExamService } from '../../src/modules/exams/exam.service';
import { ExamRepository } from '../../src/modules/exams/exam.repository';
import { createExamSchema } from '../../src/modules/exams/exam.types';

test('zero allows unlimited attempts while positive limits and availability remain enforced', async () => {
  const exam = { id: 'test', status: 'published', questions: [], sections: [], maxAttempts: 0 };
  const question = { id: 'question', options: [], position: 0 };
  (exam.questions as unknown[]).push(question);
  let creates = 0;
  const service = new ExamService({
    getByPublicId: async () => exam,
    getAccessCode: async () => null,
    countAttempts: async () => 150,
    createAttempt: async () => { creates++; throw new Error('creation reached'); },
  } as unknown as ExamRepository);
  const input = { respondentName: 'Test', deviceId: 'test' };
  const signals = { ipAddress: '127.0.0.1', userAgent: 'test' };
  await assert.rejects(service.startAttempt('test', input, signals), /creation reached/);
  assert.equal(creates, 1);
  exam.maxAttempts = 3;
  await assert.rejects(service.startAttempt('test', input, signals), /Maximum of 3 attempts/);
  exam.maxAttempts = 0;
  exam.status = 'closed';
  await assert.rejects(service.startAttempt('test', input, signals), /not currently open/);
  assert.equal(creates, 1);
  assert.equal(createExamSchema.safeParse({ title: 'Test', maxAttempts: 0 }).success, true);
  assert.equal(createExamSchema.safeParse({ title: 'Test', maxAttempts: -1 }).success, false);
});
