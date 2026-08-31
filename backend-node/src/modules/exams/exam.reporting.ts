import { ExamAnswerRecord, ExamAttemptEventRecord, ExamAttemptRecord } from './exam.attempt.repository';
import { ExamDefinitionView, ExamQuestionView } from './exam.types';

interface ExamReportData {
  attempts: ExamAttemptRecord[];
  answers: ExamAnswerRecord[];
  events: ExamAttemptEventRecord[];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function normalize(values: string[]): string[] {
  return values.map((value) => value.trim().toLocaleLowerCase()).filter(Boolean).sort();
}

function isCorrect(question: ExamQuestionView, answer: string[]): boolean {
  if (!question.graded || question.correctAnswers.length === 0) return false;
  const actual = normalize(answer);
  const expected = normalize(question.correctAnswers);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function remainingSeconds(exam: ExamDefinitionView, attempt: ExamAttemptRecord): number {
  const available = exam.durationMinutes * 60 + attempt.extraTimeSeconds;
  return Math.max(0, available - Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000));
}

export function buildExamReport(exam: ExamDefinitionView, data: ExamReportData) {
  const { attempts, answers, events } = data;
  const answersByAttempt = new Map<string, Map<string, string[]>>();
  const latestQuestionByAttempt = new Map<string, { questionId: string; savedAt: Date }>();
  for (const answer of answers) {
    const current = answersByAttempt.get(answer.attemptId) ?? new Map<string, string[]>();
    current.set(answer.questionId, readStringArray(answer.answer));
    answersByAttempt.set(answer.attemptId, current);
    const latest = latestQuestionByAttempt.get(answer.attemptId);
    if (!latest || answer.savedAt > latest.savedAt) {
      latestQuestionByAttempt.set(answer.attemptId, { questionId: answer.questionId, savedAt: answer.savedAt });
    }
  }

  const respondentRows = attempts.map((attempt) => {
    const attemptAnswers = answersByAttempt.get(attempt.id) ?? new Map<string, string[]>();
    const gradedQuestions = exam.questions.filter((question) => question.graded && question.correctAnswers.length > 0);
    const possiblePoints = gradedQuestions.reduce((total, question) => total + question.points, 0);
    const earnedPoints = gradedQuestions.reduce(
      (total, question) => total + (isCorrect(question, attemptAnswers.get(question.id) ?? []) ? question.points : 0),
      0,
    );
    const elapsed = Math.max(0, Math.floor(((attempt.completedAt?.getTime() ?? Date.now()) - attempt.startedAt.getTime()) / 1000));
    return {
      id: attempt.id,
      respondentName: attempt.respondentName,
      respondentEmail: attempt.respondentEmail,
      respondentIdentifier: attempt.respondentIdentifier,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      terminationReason: attempt.terminationReason,
      focusViolationCount: attempt.focusViolationCount,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      lastActiveAt: attempt.lastActiveAt,
      timeInExamSeconds: elapsed,
      remainingSeconds: attempt.status === 'in_progress' ? remainingSeconds(exam, attempt) : 0,
      active: attempt.status === 'in_progress' && Date.now() - attempt.lastActiveAt.getTime() < 45_000,
      activeQuestionId: latestQuestionByAttempt.get(attempt.id)?.questionId ?? null,
      earnedPoints,
      possiblePoints,
      percentage: possiblePoints > 0 ? Math.round((earnedPoints / possiblePoints) * 10000) / 100 : null,
      answers: Object.fromEntries(attemptAnswers),
    };
  });

  const questionPerformance = exam.questions.map((question) => {
    const answered = respondentRows.filter((row) => (row.answers[question.id]?.length ?? 0) > 0);
    const correct = question.graded && question.correctAnswers.length > 0
      ? answered.filter((row) => isCorrect(question, row.answers[question.id] ?? []))
      : [];
    return {
      questionId: question.id,
      prompt: question.prompt,
      graded: question.graded,
      points: question.points,
      answeredCount: answered.length,
      correctCount: correct.length,
      correctPercentage: answered.length > 0 && question.graded && question.correctAnswers.length > 0
        ? Math.round((correct.length / answered.length) * 10000) / 100
        : null,
      correctRespondents: correct.map((row) => ({ id: row.id, name: row.respondentName })),
    };
  });

  return {
    exam,
    generatedAt: new Date(),
    summary: {
      totalAttempts: attempts.length,
      completed: attempts.filter((attempt) => attempt.status === 'completed').length,
      inProgress: attempts.filter((attempt) => attempt.status === 'in_progress').length,
      terminated: attempts.filter((attempt) => attempt.status === 'terminated').length,
      activeNow: respondentRows.filter((row) => row.active).length,
    },
    respondents: respondentRows,
    questionPerformance,
    recentEvents: events.slice(0, 100),
  };
}
