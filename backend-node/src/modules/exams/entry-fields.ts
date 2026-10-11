import type { ExamQuestionView, StartAttemptInput } from './exam.types';
import { ExamServiceError } from './exam.errors';

export function collectEntryAnswers(questions: ExamQuestionView[], input: StartAttemptInput, now = new Date()) {
  return questions.filter(q => q.entryField).map(q => {
    // Never accept a client-supplied date: the timestamp belongs to the server.
    const value = q.type === 'date' ? now.toISOString() : (input.entryAnswers?.[q.id] ?? '').trim();
    if (q.required && !value) throw new ExamServiceError(`${q.prompt} is required`, 400, 'ENTRY_FIELD_REQUIRED');
    return { questionId: q.id, answer: value ? [value] : [] };
  });
}
