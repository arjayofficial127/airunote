import { ExamAnswerRecord, ExamAttemptEventRecord, ExamAttemptRecord } from './exam.attempt.repository';
import { ExamDefinitionView, ExamQuestionView } from './exam.types';

interface ExamReportData {
  attempts: ExamAttemptRecord[];
  answers: ExamAnswerRecord[];
  events: ExamAttemptEventRecord[];
}

interface QuestionTimingEntry { startedAt?: string; timedOutAt?: string }

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readTiming(value: unknown): Record<string, QuestionTimingEntry> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry && typeof entry === 'object')) as Record<string, QuestionTimingEntry>;
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

function classifyAttempt(attempt: ExamAttemptRecord, active: boolean): string {
  if (attempt.status === 'void') return 'void';
  if (attempt.status === 'completed') return 'submitted';
  if (attempt.status === 'timed_out') return 'timed_out';
  if (attempt.status === 'abandoned') return 'abandoned';
  if (attempt.status === 'terminated' && attempt.terminationReason === 'focus_lost') return 'focus_terminated';
  if (attempt.status === 'terminated') return 'terminated';
  return active ? 'active' : 'inactive_stale';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildExamReport(exam: ExamDefinitionView, data: ExamReportData) {
  const { attempts, answers, events } = data;
  const now = Date.now();
  const answersByAttempt = new Map<string, Map<string, string[]>>();
  const answerRecords = new Map<string, Map<string, ExamAnswerRecord>>();
  const latestQuestionByAttempt = new Map<string, { questionId: string; savedAt: Date }>();
  for (const answer of answers) {
    const current = answersByAttempt.get(answer.attemptId) ?? new Map<string, string[]>();
    current.set(answer.questionId, readStringArray(answer.answer));
    answersByAttempt.set(answer.attemptId, current);
    const records = answerRecords.get(answer.attemptId) ?? new Map<string, ExamAnswerRecord>();
    records.set(answer.questionId, answer);
    answerRecords.set(answer.attemptId, records);
    const latest = latestQuestionByAttempt.get(answer.attemptId);
    if (!latest || answer.savedAt > latest.savedAt) latestQuestionByAttempt.set(answer.attemptId, { questionId: answer.questionId, savedAt: answer.savedAt });
  }

  const respondentRows = attempts.map((attempt) => {
    const attemptAnswers = answersByAttempt.get(attempt.id) ?? new Map<string, string[]>();
    const gradedQuestions = exam.questions.filter((question) => question.graded && question.correctAnswers.length > 0);
    const possiblePoints = gradedQuestions.reduce((total, question) => total + question.points, 0);
    const earnedPoints = gradedQuestions.reduce(
      (total, question) => total + (isCorrect(question, attemptAnswers.get(question.id) ?? []) ? question.points : 0),
      0,
    );
    const active = attempt.status === 'in_progress' && now - attempt.lastActiveAt.getTime() < 45_000;
    const classification = classifyAttempt(attempt, active);
    const terminalAt = attempt.endedAt ?? attempt.completedAt ?? (attempt.status === 'in_progress' ? null : attempt.lastActiveAt);
    const elapsedEnd = terminalAt?.getTime() ?? now;
    const availableSeconds = exam.durationMinutes * 60 + attempt.extraTimeSeconds;
    const rawElapsed = Math.max(0, Math.floor((elapsedEnd - attempt.startedAt.getTime()) / 1000));
    const elapsed = classification === 'timed_out' ? Math.min(rawElapsed, availableSeconds) : rawElapsed;
    const terminal = !['active', 'inactive_stale'].includes(classification);
    return {
      id: attempt.id,
      respondentName: attempt.respondentName,
      respondentEmail: attempt.respondentEmail,
      respondentIdentifier: attempt.respondentIdentifier,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      classification,
      terminationReason: attempt.terminationReason,
      focusViolationCount: attempt.focusViolationCount,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      endedAt: terminalAt,
      lastActiveAt: attempt.lastActiveAt,
      timeInExamSeconds: elapsed,
      remainingSeconds: attempt.status === 'in_progress' ? Math.max(0, availableSeconds - rawElapsed) : 0,
      active,
      needsAdmin: ['inactive_stale', 'focus_terminated', 'terminated', 'timed_out', 'abandoned'].includes(classification),
      eligibleForContinue: !attempt.isPreview && ['inactive_stale', 'focus_terminated', 'terminated', 'timed_out', 'abandoned'].includes(classification),
      activeQuestionId: latestQuestionByAttempt.get(attempt.id)?.questionId ?? null,
      earnedPoints,
      possiblePoints,
      percentage: possiblePoints > 0 ? round((earnedPoints / possiblePoints) * 100) : null,
      scoreIsProvisional: !terminal || classification !== 'submitted',
      answers: Object.fromEntries(attemptAnswers),
      isPreview: attempt.isPreview,
      previewedByEmail: attempt.previewedByEmail,
      previewedByRole: attempt.previewedByRole,
      voidedAt: attempt.voidedAt,
      voidReason: attempt.voidReason,
    };
  });

  const includedRows = respondentRows.filter((row) => !row.isPreview && row.classification !== 'void');
  const attemptById = new Map(attempts.map((attempt) => [attempt.id, attempt]));
  const questionPerformance = exam.questions.map((question) => {
    const answered = includedRows.filter((row) => (row.answers[question.id]?.length ?? 0) > 0);
    const correct = question.graded && question.correctAnswers.length > 0
      ? answered.filter((row) => isCorrect(question, row.answers[question.id] ?? [])) : [];
    const incorrect = question.graded && question.correctAnswers.length > 0
      ? answered.filter((row) => !isCorrect(question, row.answers[question.id] ?? [])) : [];
    const responseTimes = includedRows.flatMap((row) => {
      const timing = readTiming(attemptById.get(row.id)?.questionTiming);
      const attempt = attemptById.get(row.id);
      const savedRecords = [...(answerRecords.get(row.id)?.values() ?? [])].sort((left, right) => left.savedAt.getTime() - right.savedAt.getTime());
      const currentIndex = savedRecords.findIndex((record) => record.questionId === question.id);
      const priorSavedAt = currentIndex > 0 ? savedRecords[currentIndex - 1]?.savedAt : null;
      const startedAt = timing[question.id]?.startedAt ?? (priorSavedAt ?? attempt?.startedAt)?.toISOString();
      const savedAt = answerRecords.get(row.id)?.get(question.id)?.savedAt;
      if (!startedAt || !savedAt) return [];
      const seconds = Math.max(0, Math.floor((savedAt.getTime() - Date.parse(startedAt)) / 1000));
      return Number.isFinite(seconds) ? [seconds] : [];
    });
    const optionPerformance = question.options.map((option) => {
      const selected = answered.filter((row) => (row.answers[question.id] ?? []).includes(option.id));
      return {
        optionId: option.id,
        label: option.label,
        selectedCount: selected.length,
        selectedPercentage: answered.length > 0 ? round((selected.length / answered.length) * 100) : 0,
        correct: question.correctAnswers.includes(option.id),
        respondents: selected.map((row) => ({ id: row.id, name: row.respondentName })),
      };
    });
    return {
      questionId: question.id,
      prompt: question.prompt,
      graded: question.graded,
      points: question.points,
      answeredCount: answered.length,
      skippedCount: Math.max(0, includedRows.length - answered.length),
      correctCount: correct.length,
      incorrectCount: incorrect.length,
      averageResponseSeconds: responseTimes.length ? round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : null,
      correctPercentage: answered.length > 0 && question.graded && question.correctAnswers.length > 0
        ? round((correct.length / answered.length) * 100) : null,
      correctRespondents: correct.map((row) => ({ id: row.id, name: row.respondentName })),
      incorrectRespondents: incorrect.map((row) => ({ id: row.id, name: row.respondentName })),
      optionPerformance,
    };
  });

  return {
    exam,
    generatedAt: new Date(),
    summary: {
      totalAttempts: includedRows.length,
      completed: includedRows.filter((row) => row.classification === 'submitted').length,
      inProgress: includedRows.filter((row) => ['active', 'inactive_stale'].includes(row.classification)).length,
      terminated: includedRows.filter((row) => row.needsAdmin).length,
      needsAdmin: includedRows.filter((row) => row.needsAdmin).length,
      activeNow: includedRows.filter((row) => row.active).length,
      inactiveStale: includedRows.filter((row) => row.classification === 'inactive_stale').length,
      timedOut: includedRows.filter((row) => row.classification === 'timed_out').length,
      voided: respondentRows.filter((row) => row.classification === 'void').length,
      previews: respondentRows.filter((row) => row.isPreview).length,
    },
    respondents: respondentRows,
    questionPerformance,
    recentEvents: events.slice(0, 100),
  };
}
