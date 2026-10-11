import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectEntryAnswers } from '../../src/modules/exams/entry-fields';
import { startAttemptSchema } from '../../src/modules/exams/exam.types';
import type { ExamQuestionView } from '../../src/modules/exams/exam.types';

const fields = [
  { id: 'date', entryField: true, type: 'date', required: true },
  { id: 'pc', entryField: true, type: 'short_text', prompt: 'PC on Duty', required: true },
  { id: 'question', entryField: false, type: 'short_text', required: true },
] as ExamQuestionView[];
const identity = { respondentName: 'Test', deviceId: 'test-device' };
test('records server timestamp, trims PC, and excludes timed questions', () => {
  const result = collectEntryAnswers(fields, { ...identity, entryAnswers: { date: '2099-01-01', pc: '  Pat  ', question: 'injected' } }, new Date('2026-10-11T16:00:00Z'));
  assert.deepEqual(result, [{ questionId: 'date', answer: ['2026-10-11T16:00:00.000Z'] }, { questionId: 'pc', answer: ['Pat'] }]);
});
test('rejects missing PC before starting an attempt', () => {
  assert.throws(() => collectEntryAnswers(fields, identity), /PC on Duty is required/);
});
test('rejects oversized entry data', () => {
  assert.equal(startAttemptSchema.safeParse({ ...identity, entryAnswers: { '01595322-2831-4e26-b7f8-2d29b60506e6': 'x'.repeat(2001) } }).success, false);
});
