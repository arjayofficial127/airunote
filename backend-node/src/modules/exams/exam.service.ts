import { createHash, randomBytes } from 'crypto';
import { ExamRepository, ExamAttemptRecord, ExamAnswerRecord } from './exam.repository';
import {
  CreateExamInput,
  ExamDefinitionView,
  ExamOrgSettingsInput,
  ExamQuestionView,
  PublicRequestSignals,
  StartAttemptInput,
  UpdateExamInput,
  UpdateQuestionGradingInput,
} from './exam.types';
import { buildExamReport } from './exam.reporting';

export class ExamServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

interface PublicQuestion {
  id: string;
  sectionId: string | null;
  type: ExamQuestionView['type'];
  prompt: string;
  position: number;
  required: boolean;
  points: number;
  options: Array<{ id: string; label: string }>;
  selectedAnswers?: string[];
  correctAnswers?: string[];
  explanation?: string | null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readOptionOrder(value: unknown): Record<string, string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const order: Record<string, string[]> = {};
  for (const [questionId, optionIds] of Object.entries(value)) order[questionId] = readStringArray(optionIds);
  return order;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function shuffleKeepingPinnedSlots<T extends { pinned: boolean }>(items: T[], enabled: boolean): T[] {
  if (!enabled) return [...items];
  const randomized = shuffle(items.filter((item) => !item.pinned));
  let cursor = 0;
  return items.map((item) => item.pinned ? item : randomized[cursor++]);
}

export class ExamService {
  constructor(private readonly repository = new ExamRepository()) {}

  private async assertPublicIdAvailable(publicId: string | undefined, examId?: string): Promise<void> {
    if (!publicId) return;
    const ownerId = await this.repository.findExamIdByPublicId(publicId);
    if (ownerId && ownerId !== examId) {
      throw new ExamServiceError('That public exam ID is already in use', 409, 'EXAM_PUBLIC_ID_TAKEN');
    }
  }

  private hash(value: string): string {
    const pepper = process.env.EXAM_IDENTITY_PEPPER || process.env.JWT_SECRET || 'airunote-exam-local';
    return createHash('sha256').update(`${pepper}:${value}`).digest('hex');
  }

  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private createToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private assertAvailable(exam: ExamDefinitionView): void {
    const now = Date.now();
    if (exam.status !== 'published') throw new ExamServiceError('This exam is not accepting responses', 409, 'EXAM_NOT_PUBLISHED');
    if (exam.startsAt && exam.startsAt.getTime() > now) throw new ExamServiceError('This exam has not started yet', 409, 'EXAM_NOT_STARTED');
    if (exam.endsAt && exam.endsAt.getTime() <= now) throw new ExamServiceError('This exam is closed', 409, 'EXAM_CLOSED');
    if (exam.questions.length === 0) throw new ExamServiceError('This exam has no questions', 409, 'EXAM_EMPTY');
  }

  async list(orgId: string) {
    return this.repository.list(orgId);
  }

  async get(orgId: string, examId: string): Promise<ExamDefinitionView> {
    const exam = await this.repository.getByOrg(orgId, examId);
    if (!exam) throw new ExamServiceError('Exam not found', 404, 'EXAM_NOT_FOUND');
    return exam;
  }

  async create(orgId: string, userId: string, input: CreateExamInput): Promise<ExamDefinitionView> {
    await this.assertPublicIdAvailable(input.publicId);
    if (input.status === 'published' && (input.questions?.length ?? 0) === 0) {
      throw new ExamServiceError('Add at least one question before publishing', 400, 'EXAM_EMPTY');
    }
    if (input.startsAt && input.endsAt && new Date(input.startsAt) >= new Date(input.endsAt)) {
      throw new ExamServiceError('Exam end time must be after its start time', 400, 'INVALID_EXAM_WINDOW');
    }
    return this.repository.create(orgId, userId, input);
  }

  async update(orgId: string, examId: string, input: UpdateExamInput): Promise<ExamDefinitionView> {
    const existing = await this.get(orgId, examId);
    await this.assertPublicIdAvailable(input.publicId, examId);
    if (input.status === 'published' && existing.questions.length === 0) {
      throw new ExamServiceError('Add at least one question before publishing', 400, 'EXAM_EMPTY');
    }
    const startsAt = input.startsAt === undefined ? existing.startsAt : input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt === undefined ? existing.endsAt : input.endsAt ? new Date(input.endsAt) : null;
    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new ExamServiceError('Exam end time must be after its start time', 400, 'INVALID_EXAM_WINDOW');
    }
    const updated = await this.repository.update(orgId, examId, input);
    if (!updated) throw new ExamServiceError('Exam not found', 404, 'EXAM_NOT_FOUND');
    return updated;
  }

  async replaceDefinition(orgId: string, examId: string, input: CreateExamInput): Promise<ExamDefinitionView> {
    const existing = await this.get(orgId, examId);
    await this.assertPublicIdAvailable(input.publicId, examId);
    if (existing.attemptCount > 0) {
      throw new ExamServiceError('Question structure is locked after the first attempt. Grading and correct answers remain editable.', 409, 'EXAM_STRUCTURE_LOCKED');
    }
    if (input.status === 'published' && (input.questions?.length ?? 0) === 0) {
      throw new ExamServiceError('Add at least one question before publishing', 400, 'EXAM_EMPTY');
    }
    const updated = await this.repository.replaceDefinition(orgId, examId, input);
    if (!updated) throw new ExamServiceError('Exam not found', 404, 'EXAM_NOT_FOUND');
    return updated;
  }

  async updateQuestionGrading(orgId: string, examId: string, questionId: string, input: UpdateQuestionGradingInput): Promise<ExamDefinitionView> {
    const exam = await this.get(orgId, examId);
    const question = exam.questions.find((candidate) => candidate.id === questionId);
    if (!question) throw new ExamServiceError('Question not found', 404, 'QUESTION_NOT_FOUND');
    if ((question.type === 'single_choice' || question.type === 'multiple_choice') && input.correctAnswers.some(
      (answer) => !question.options.some((option) => option.id === answer),
    )) {
      throw new ExamServiceError('Correct answers must reference this question\'s options', 400, 'INVALID_CORRECT_ANSWER');
    }
    const updated = await this.repository.updateQuestionGrading(orgId, examId, questionId, input);
    if (!updated) throw new ExamServiceError('Question not found', 404, 'QUESTION_NOT_FOUND');
    return updated;
  }

  async delete(orgId: string, examId: string): Promise<void> {
    const exam = await this.get(orgId, examId);
    if (exam.attemptCount > 0) throw new ExamServiceError('Exams with attempts cannot be deleted', 409, 'EXAM_HAS_ATTEMPTS');
    if (!await this.repository.delete(orgId, examId)) throw new ExamServiceError('Exam not found', 404, 'EXAM_NOT_FOUND');
  }

  async getOrgSettings(orgId: string) {
    return this.repository.getOrgSettings(orgId);
  }

  async updateOrgSettings(orgId: string, input: ExamOrgSettingsInput) {
    await this.repository.upsertOrgSettings(orgId, input);
    return this.repository.getOrgSettings(orgId);
  }

  async getPublicOverview(publicId: string) {
    const exam = await this.repository.getByPublicId(publicId);
    if (!exam) throw new ExamServiceError('Exam not found', 404, 'EXAM_NOT_FOUND');
    this.assertAvailable(exam);
    return {
      publicId: exam.publicId,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      oneQuestionAtATime: exam.oneQuestionAtATime,
      preventFocusLoss: exam.preventFocusLoss,
      maxAttempts: exam.maxAttempts,
      requireEmail: exam.requireEmail,
      requireIdentifier: exam.requireIdentifier,
      questionCount: exam.questions.length,
      totalPoints: exam.questions.filter((question) => question.graded && question.correctAnswers.length > 0).reduce((total, question) => total + question.points, 0),
    };
  }

  private createQuestionOrder(exam: ExamDefinitionView): string[] {
    const sections = shuffleKeepingPinnedSlots([...exam.sections].sort((a, b) => a.position - b.position), exam.shuffleQuestions);
    const unsectioned = shuffleKeepingPinnedSlots(
      exam.questions.filter((question) => !question.sectionId).sort((a, b) => a.position - b.position),
      exam.shuffleQuestions,
    );
    const ordered = [...unsectioned];
    for (const section of sections) {
      ordered.push(...shuffleKeepingPinnedSlots(
        exam.questions.filter((question) => question.sectionId === section.id).sort((a, b) => a.position - b.position),
        exam.shuffleQuestions,
      ));
    }
    return ordered.map((question) => question.id);
  }

  private createOptionOrder(exam: ExamDefinitionView): Record<string, string[]> {
    return Object.fromEntries(exam.questions.map((question) => [
      question.id,
      (exam.shuffleOptions ? shuffle(question.options) : question.options).map((option) => option.id),
    ]));
  }

  async startAttempt(publicId: string, input: StartAttemptInput, signals: PublicRequestSignals) {
    const exam = await this.repository.getByPublicId(publicId);
    if (!exam) throw new ExamServiceError('Exam not found', 404, 'EXAM_NOT_FOUND');
    this.assertAvailable(exam);
    if (exam.requireEmail && !input.respondentEmail) throw new ExamServiceError('Email is required', 400, 'EMAIL_REQUIRED');
    if (exam.requireIdentifier && !input.respondentIdentifier) throw new ExamServiceError('Student or employee ID is required', 400, 'IDENTIFIER_REQUIRED');

    const identityValue = input.respondentIdentifier || input.respondentEmail || input.respondentName;
    const identityKeyHash = this.hash(identityValue.trim().toLocaleLowerCase());
    const deviceHash = this.hash(input.deviceId);
    const priorAttempts = await this.repository.countAttempts(exam.id, { identityKeyHash });
    if (priorAttempts >= exam.maxAttempts) {
      throw new ExamServiceError(`Maximum of ${exam.maxAttempts} attempts reached`, 409, 'ATTEMPT_LIMIT_REACHED');
    }

    const token = this.createToken();
    const attempt = await this.repository.createAttempt({
      examId: exam.id,
      accessTokenHash: this.tokenHash(token),
      respondentName: input.respondentName,
      respondentEmail: input.respondentEmail ?? null,
      respondentIdentifier: input.respondentIdentifier ?? null,
      identityKeyHash,
      deviceHash,
      ipHash: this.hash(signals.ipAddress),
      userAgentHash: this.hash(signals.userAgent),
      attemptNumber: priorAttempts + 1,
      questionOrder: this.createQuestionOrder(exam),
      optionOrder: this.createOptionOrder(exam),
    });
    return { accessToken: token, attempt: this.buildAttemptPayload(exam, attempt, [], true) };
  }

  private remainingSeconds(exam: ExamDefinitionView, attempt: ExamAttemptRecord): number {
    const available = exam.durationMinutes * 60 + attempt.extraTimeSeconds;
    return Math.max(0, available - Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000));
  }

  private buildPublicQuestions(exam: ExamDefinitionView, attempt: ExamAttemptRecord, answers: ExamAnswerRecord[], includeCorrect: boolean): PublicQuestion[] {
    const answerMap = new Map(answers.map((answer) => [answer.questionId, readStringArray(answer.answer)]));
    const optionOrder = readOptionOrder(attempt.optionOrder);
    const questionsById = new Map(exam.questions.map((question) => [question.id, question]));
    return readStringArray(attempt.questionOrder).flatMap((questionId) => {
      const question = questionsById.get(questionId);
      if (!question) return [];
      const optionsById = new Map(question.options.map((option) => [option.id, option]));
      const orderedOptions = (optionOrder[question.id] ?? question.options.map((option) => option.id))
        .flatMap((optionId) => optionsById.get(optionId) ?? []);
      return [{
        id: question.id,
        sectionId: question.sectionId,
        type: question.type,
        prompt: question.prompt,
        position: question.position,
        required: question.required,
        points: question.points,
        options: orderedOptions.map((option) => ({ id: option.id, label: option.label })),
        selectedAnswers: answerMap.get(question.id) ?? [],
        ...(includeCorrect ? { correctAnswers: question.correctAnswers, explanation: question.explanation } : {}),
      }];
    });
  }

  private buildAttemptPayload(exam: ExamDefinitionView, attempt: ExamAttemptRecord, answers: ExamAnswerRecord[], includeQuestions: boolean) {
    const isFinished = attempt.status !== 'in_progress';
    const mayReview = isFinished && exam.reviewMode !== 'none';
    const questions = includeQuestions || mayReview
      ? this.buildPublicQuestions(exam, attempt, answers, isFinished && exam.reviewMode === 'with_correct_answers')
      : [];
    return {
      id: attempt.id,
      publicId: exam.publicId,
      title: exam.title,
      description: exam.description,
      status: attempt.status,
      terminationReason: attempt.terminationReason,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      remainingSeconds: attempt.status === 'in_progress' ? this.remainingSeconds(exam, attempt) : 0,
      durationMinutes: exam.durationMinutes,
      oneQuestionAtATime: exam.oneQuestionAtATime,
      preventFocusLoss: exam.preventFocusLoss,
      reviewMode: exam.reviewMode,
      sections: exam.sections,
      questions,
    };
  }

  private async loadAttempt(accessToken: string): Promise<{ exam: ExamDefinitionView; attempt: ExamAttemptRecord; answers: ExamAnswerRecord[] }> {
    let attempt = await this.repository.findAttemptByTokenHash(this.tokenHash(accessToken));
    if (!attempt) throw new ExamServiceError('Attempt link is invalid or expired', 404, 'ATTEMPT_NOT_FOUND');
    const exam = await this.repository.getById(attempt.examId);
    if (!exam) throw new ExamServiceError('Exam not found', 404, 'EXAM_NOT_FOUND');
    if (attempt.status === 'in_progress' && this.remainingSeconds(exam, attempt) <= 0) {
      attempt = await this.repository.updateAttempt(attempt.id, {
        status: 'completed', completedAt: new Date(), terminationReason: 'time_expired', lastActiveAt: new Date(),
      }) ?? attempt;
      await this.repository.addEvent(attempt.id, 'time_expired', {});
    }
    return { exam, attempt, answers: await this.repository.getAnswers(attempt.id) };
  }

  async getAttempt(accessToken: string) {
    const { exam, attempt, answers } = await this.loadAttempt(accessToken);
    return this.buildAttemptPayload(exam, attempt, answers, attempt.status === 'in_progress');
  }

  async saveAnswer(accessToken: string, questionId: string, answer: string[]) {
    const { exam, attempt } = await this.loadAttempt(accessToken);
    if (attempt.status !== 'in_progress') throw new ExamServiceError('This attempt is already finished', 409, 'ATTEMPT_FINISHED');
    const question = exam.questions.find((candidate) => candidate.id === questionId);
    if (!question) throw new ExamServiceError('Question not found', 404, 'QUESTION_NOT_FOUND');
    const cleaned = answer.map((value) => value.trim()).filter(Boolean);
    if ((question.type === 'single_choice' || question.type === 'true_false' || question.type === 'short_text') && cleaned.length > 1) {
      throw new ExamServiceError('This question accepts one answer', 400, 'TOO_MANY_ANSWERS');
    }
    if ((question.type === 'single_choice' || question.type === 'multiple_choice') && cleaned.some(
      (value) => !question.options.some((option) => option.id === value),
    )) throw new ExamServiceError('Answer contains an invalid option', 400, 'INVALID_ANSWER');
    if (question.type === 'true_false' && cleaned.some((value) => value !== 'true' && value !== 'false')) {
      throw new ExamServiceError('Answer must be true or false', 400, 'INVALID_ANSWER');
    }
    const savedAt = await this.repository.saveAnswer(attempt.id, questionId, cleaned);
    return { savedAt };
  }

  async recordEvent(accessToken: string, eventType: 'focus_lost' | 'heartbeat', metadata: Record<string, unknown>) {
    const { exam, attempt, answers } = await this.loadAttempt(accessToken);
    if (attempt.status !== 'in_progress') return this.buildAttemptPayload(exam, attempt, answers, false);
    if (eventType === 'heartbeat') {
      const updated = await this.repository.updateAttempt(attempt.id, { lastActiveAt: new Date() });
      return this.buildAttemptPayload(exam, updated ?? attempt, answers, true);
    }
    await this.repository.addEvent(attempt.id, 'focus_lost', metadata);
    const nextViolationCount = attempt.focusViolationCount + 1;
    const updated = await this.repository.updateAttempt(attempt.id, exam.preventFocusLoss ? {
      focusViolationCount: nextViolationCount,
      status: 'terminated',
      completedAt: new Date(),
      lastActiveAt: new Date(),
      terminationReason: 'focus_lost',
    } : { focusViolationCount: nextViolationCount, lastActiveAt: new Date() });
    if (exam.preventFocusLoss) await this.repository.addEvent(attempt.id, 'auto_terminated', { reason: 'focus_lost' });
    return this.buildAttemptPayload(exam, updated ?? attempt, answers, !exam.preventFocusLoss);
  }

  async submit(accessToken: string) {
    const { exam, attempt, answers } = await this.loadAttempt(accessToken);
    if (attempt.status !== 'in_progress') return this.buildAttemptPayload(exam, attempt, answers, false);
    const answeredQuestionIds = new Set(
      answers.filter((answer) => readStringArray(answer.answer).length > 0).map((answer) => answer.questionId),
    );
    const missingRequired = exam.questions.filter((question) => question.required && !answeredQuestionIds.has(question.id));
    if (missingRequired.length > 0) {
      throw new ExamServiceError(
        `Answer ${missingRequired.length} required question${missingRequired.length === 1 ? '' : 's'} before submitting`,
        409,
        'REQUIRED_ANSWERS_MISSING',
      );
    }
    const updated = await this.repository.updateAttempt(attempt.id, {
      status: 'completed', completedAt: new Date(), lastActiveAt: new Date(), terminationReason: null,
    });
    await this.repository.addEvent(attempt.id, 'submitted', {});
    return this.buildAttemptPayload(exam, updated ?? attempt, answers, false);
  }

  async continueAttempt(orgId: string, examId: string, attemptId: string, additionalMinutes: number) {
    const exam = await this.get(orgId, examId);
    const attempt = await this.repository.findAttemptByOrg(orgId, examId, attemptId);
    if (!attempt) throw new ExamServiceError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');
    const token = this.createToken();
    const updated = await this.repository.updateAttempt(attempt.id, {
      accessTokenHash: this.tokenHash(token),
      status: 'in_progress',
      completedAt: null,
      terminationReason: null,
      resumeCount: attempt.resumeCount + 1,
      extraTimeSeconds: attempt.extraTimeSeconds + additionalMinutes * 60,
      lastActiveAt: new Date(),
    });
    if (!updated) throw new ExamServiceError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');
    await this.repository.addEvent(attempt.id, 'continued_by_admin', { additionalMinutes });
    return { accessToken: token, publicId: exam.publicId, path: `/exam/${exam.publicId}?resume=${encodeURIComponent(token)}` };
  }

  async report(orgId: string, examId: string) {
    const exam = await this.get(orgId, examId);
    return buildExamReport(exam, await this.repository.getReportData(examId));
  }
}
