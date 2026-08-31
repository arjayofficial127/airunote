import type { ExamDefinition, ExamInput } from '@/lib/api/exams';

export function examDefinitionToInput(exam: ExamDefinition): ExamInput {
  return {
    title: exam.title,
    description: exam.description,
    status: exam.status,
    durationMinutes: exam.durationMinutes,
    oneQuestionAtATime: exam.oneQuestionAtATime,
    preventFocusLoss: exam.preventFocusLoss,
    maxAttempts: exam.maxAttempts,
    reviewMode: exam.reviewMode,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    requireEmail: exam.requireEmail,
    requireIdentifier: exam.requireIdentifier,
    startsAt: exam.startsAt,
    endsAt: exam.endsAt,
    sections: exam.sections.map((section) => ({ ...section })),
    questions: exam.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
    })),
  };
}
