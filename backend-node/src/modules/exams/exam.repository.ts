import { randomUUID } from 'crypto';
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, ne } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  examAttemptsTable,
  examOrgSettingsTable,
  examQuestionOptionsTable,
  examQuestionsTable,
  examSectionsTable,
  examsTable,
} from '../../infrastructure/db/drizzle/schema';
import {
  CreateExamInput,
  ExamDefinitionView,
  ExamQuestionView,
  ExamStatus,
  UpdateExamInput,
  UpdateQuestionGradingInput,
  examQuestionTypeSchema,
  examReviewModeSchema,
  examStatusSchema,
} from './exam.types';
import { ExamAttemptRepository } from './exam.attempt.repository';

export type {
  AttemptIdentitySignals,
  CreateAttemptRecordInput,
  ExamAnswerRecord,
  ExamAttemptEventRecord,
  ExamAttemptRecord,
} from './exam.attempt.repository';

export interface ExamListItem {
  id: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  publicId: string;
  durationMinutes: number;
  preventFocusLoss: boolean;
  maxAttempts: number;
  updatedAt: Date;
  attemptCount: number;
  archivedAt: Date | null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function mapQuestion(
  row: typeof examQuestionsTable.$inferSelect,
  options: Array<typeof examQuestionOptionsTable.$inferSelect>,
): ExamQuestionView {
  return {
    id: row.id,
    examId: row.examId,
    sectionId: row.sectionId,
    type: examQuestionTypeSchema.parse(row.type),
    prompt: row.prompt,
    explanation: row.explanation,
    position: row.position,
    required: row.required,
    graded: row.graded,
    points: row.points,
    pinned: row.pinned,
    maxTimeSeconds: row.maxTimeSeconds,
    correctAnswers: readStringArray(row.correctAnswers),
    options: options
      .filter((option) => option.questionId === row.id)
      .sort((left, right) => left.position - right.position)
      .map((option) => ({ id: option.id, label: option.label, position: option.position })),
  };
}

export class ExamRepository extends ExamAttemptRepository {
  async list(orgId: string, archived = false): Promise<ExamListItem[]> {
    const rows = await db.select().from(examsTable).where(and(
      eq(examsTable.orgId, orgId),
      archived ? isNotNull(examsTable.archivedAt) : isNull(examsTable.archivedAt),
    )).orderBy(desc(examsTable.updatedAt));
    if (rows.length === 0) return [];

    const counts = await db
      .select({ examId: examAttemptsTable.examId, value: count(examAttemptsTable.id) })
      .from(examAttemptsTable)
      .where(and(
        inArray(examAttemptsTable.examId, rows.map((row) => row.id)),
        eq(examAttemptsTable.isPreview, false),
        ne(examAttemptsTable.status, 'void'),
      ))
      .groupBy(examAttemptsTable.examId);
    const countsByExam = new Map(counts.map((entry) => [entry.examId, Number(entry.value)]));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: examStatusSchema.parse(row.status),
      publicId: row.publicId,
      durationMinutes: row.durationMinutes,
      preventFocusLoss: row.preventFocusLoss,
      maxAttempts: row.maxAttempts,
      updatedAt: row.updatedAt,
      attemptCount: countsByExam.get(row.id) ?? 0,
      archivedAt: row.archivedAt,
    }));
  }

  async getByOrg(orgId: string, examId: string): Promise<ExamDefinitionView | null> {
    const [row] = await db.select().from(examsTable).where(and(eq(examsTable.id, examId), eq(examsTable.orgId, orgId))).limit(1);
    return row ? this.hydrateDefinition(row) : null;
  }

  async getByPublicId(publicId: string): Promise<ExamDefinitionView | null> {
    const [row] = await db.select().from(examsTable).where(eq(examsTable.publicId, publicId)).limit(1);
    return row ? this.hydrateDefinition(row) : null;
  }

  async findExamIdByPublicId(publicId: string): Promise<string | null> {
    const [row] = await db.select({ id: examsTable.id }).from(examsTable).where(eq(examsTable.publicId, publicId)).limit(1);
    return row?.id ?? null;
  }

  async getById(examId: string): Promise<ExamDefinitionView | null> {
    const [row] = await db.select().from(examsTable).where(eq(examsTable.id, examId)).limit(1);
    return row ? this.hydrateDefinition(row) : null;
  }

  private async hydrateDefinition(row: typeof examsTable.$inferSelect): Promise<ExamDefinitionView> {
    const [sections, questions, attemptCounts] = await Promise.all([
      db.select().from(examSectionsTable).where(eq(examSectionsTable.examId, row.id)).orderBy(asc(examSectionsTable.position)),
      db.select().from(examQuestionsTable).where(eq(examQuestionsTable.examId, row.id)).orderBy(asc(examQuestionsTable.position)),
      db.select({ value: count(examAttemptsTable.id) }).from(examAttemptsTable).where(eq(examAttemptsTable.examId, row.id)),
    ]);
    const options = questions.length > 0
      ? await db.select().from(examQuestionOptionsTable).where(inArray(examQuestionOptionsTable.questionId, questions.map((question) => question.id)))
      : [];

    return {
      id: row.id,
      orgId: row.orgId,
      createdByUserId: row.createdByUserId,
      title: row.title,
      description: row.description,
      status: examStatusSchema.parse(row.status),
      publicId: row.publicId,
      durationMinutes: row.durationMinutes,
      oneQuestionAtATime: row.oneQuestionAtATime,
      preventFocusLoss: row.preventFocusLoss,
      maxAttempts: row.maxAttempts,
      reviewMode: examReviewModeSchema.parse(row.reviewMode),
      shuffleQuestions: row.shuffleQuestions,
      shuffleOptions: row.shuffleOptions,
      requireEmail: row.requireEmail,
      requireIdentifier: row.requireIdentifier,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      archivedAt: row.archivedAt,
      archivedByUserId: row.archivedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sections: sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        position: section.position,
        pinned: section.pinned,
      })),
      questions: questions.map((question) => mapQuestion(question, options)),
      attemptCount: Number(attemptCounts[0]?.value ?? 0),
    };
  }

  async create(orgId: string, userId: string, input: CreateExamInput): Promise<ExamDefinitionView> {
    const examId = randomUUID();
    await db.transaction(async (transaction) => {
      await transaction.insert(examsTable).values({
        id: examId,
        orgId,
        createdByUserId: userId,
        publicId: input.publicId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'draft',
        durationMinutes: input.durationMinutes ?? 20,
        oneQuestionAtATime: input.oneQuestionAtATime ?? true,
        preventFocusLoss: input.preventFocusLoss ?? true,
        maxAttempts: input.maxAttempts ?? 3,
        reviewMode: input.reviewMode ?? 'respondent_answers',
        shuffleQuestions: input.shuffleQuestions ?? false,
        shuffleOptions: input.shuffleOptions ?? false,
        requireEmail: input.requireEmail ?? false,
        requireIdentifier: input.requireIdentifier ?? false,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      });

      const sectionIdsByKey = new Map<string, string>();
      const sections = (input.sections ?? []).map((section, index) => {
        const id = section.id ?? randomUUID();
        sectionIdsByKey.set(section.key ?? `section-${index + 1}`, id);
        return {
          id,
          examId,
          title: section.title,
          description: section.description ?? null,
          position: section.position ?? index,
          pinned: section.pinned ?? false,
        };
      });
      if (sections.length > 0) await transaction.insert(examSectionsTable).values(sections);

      for (const [index, question] of (input.questions ?? []).entries()) {
        const questionId = question.id ?? randomUUID();
        const optionIdsByKey = new Map<string, string>();
        const options = (question.options ?? []).map((option, optionIndex) => {
          const id = option.id ?? randomUUID();
          optionIdsByKey.set(option.key ?? `option-${optionIndex + 1}`, id);
          return { id, questionId, label: option.label, position: optionIndex };
        });
        const correctAnswers = (question.correctAnswers ?? []).map((answer) => optionIdsByKey.get(answer) ?? answer);
        const sectionId = question.sectionId ?? (question.sectionKey ? sectionIdsByKey.get(question.sectionKey) ?? null : null);

        await transaction.insert(examQuestionsTable).values({
          id: questionId,
          examId,
          sectionId,
          type: question.type,
          prompt: question.prompt,
          explanation: question.explanation ?? null,
          position: question.position ?? index,
          required: question.required ?? true,
          graded: question.graded ?? true,
          points: question.points ?? 1,
          pinned: question.pinned ?? false,
          maxTimeSeconds: question.maxTimeSeconds ?? null,
          correctAnswers,
        });
        if (options.length > 0) await transaction.insert(examQuestionOptionsTable).values(options);
      }
    });

    const created = await this.getByOrg(orgId, examId);
    if (!created) throw new Error('Created exam could not be loaded');
    return created;
  }

  async update(orgId: string, examId: string, input: UpdateExamInput): Promise<ExamDefinitionView | null> {
    const [updated] = await db.update(examsTable).set({
      ...input,
      startsAt: input.startsAt === undefined ? undefined : input.startsAt === null ? null : new Date(input.startsAt),
      endsAt: input.endsAt === undefined ? undefined : input.endsAt === null ? null : new Date(input.endsAt),
      updatedAt: new Date(),
    }).where(and(eq(examsTable.id, examId), eq(examsTable.orgId, orgId))).returning({ id: examsTable.id });
    return updated ? this.getByOrg(orgId, examId) : null;
  }

  async replaceDefinition(orgId: string, examId: string, input: CreateExamInput): Promise<ExamDefinitionView | null> {
    const existing = await this.getByOrg(orgId, examId);
    if (!existing) return null;

    await db.transaction(async (transaction) => {
      await transaction.update(examsTable).set({
        title: input.title,
        publicId: input.publicId ?? existing.publicId,
        description: input.description ?? null,
        status: input.status ?? existing.status,
        durationMinutes: input.durationMinutes ?? existing.durationMinutes,
        oneQuestionAtATime: input.oneQuestionAtATime ?? existing.oneQuestionAtATime,
        preventFocusLoss: input.preventFocusLoss ?? existing.preventFocusLoss,
        maxAttempts: input.maxAttempts ?? existing.maxAttempts,
        reviewMode: input.reviewMode ?? existing.reviewMode,
        shuffleQuestions: input.shuffleQuestions ?? existing.shuffleQuestions,
        shuffleOptions: input.shuffleOptions ?? existing.shuffleOptions,
        requireEmail: input.requireEmail ?? existing.requireEmail,
        requireIdentifier: input.requireIdentifier ?? existing.requireIdentifier,
        startsAt: input.startsAt === undefined ? existing.startsAt : input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt === undefined ? existing.endsAt : input.endsAt ? new Date(input.endsAt) : null,
        updatedAt: new Date(),
      }).where(and(eq(examsTable.id, examId), eq(examsTable.orgId, orgId)));

      await transaction.delete(examQuestionsTable).where(eq(examQuestionsTable.examId, examId));
      await transaction.delete(examSectionsTable).where(eq(examSectionsTable.examId, examId));

      const sectionIdsByKey = new Map<string, string>();
      const sections = (input.sections ?? []).map((section, index) => {
        const id = section.id ?? randomUUID();
        sectionIdsByKey.set(section.key ?? section.id ?? `section-${index + 1}`, id);
        return {
          id,
          examId,
          title: section.title,
          description: section.description ?? null,
          position: section.position ?? index,
          pinned: section.pinned ?? false,
        };
      });
      if (sections.length > 0) await transaction.insert(examSectionsTable).values(sections);

      for (const [index, question] of (input.questions ?? []).entries()) {
        const questionId = question.id ?? randomUUID();
        const optionIdsByKey = new Map<string, string>();
        const options = (question.options ?? []).map((option, optionIndex) => {
          const id = option.id ?? randomUUID();
          optionIdsByKey.set(option.key ?? option.id ?? `option-${optionIndex + 1}`, id);
          return { id, questionId, label: option.label, position: optionIndex };
        });
        const sectionId = question.sectionId ?? (question.sectionKey ? sectionIdsByKey.get(question.sectionKey) ?? null : null);
        await transaction.insert(examQuestionsTable).values({
          id: questionId,
          examId,
          sectionId,
          type: question.type,
          prompt: question.prompt,
          explanation: question.explanation ?? null,
          position: question.position ?? index,
          required: question.required ?? true,
          graded: question.graded ?? true,
          points: question.points ?? 1,
          pinned: question.pinned ?? false,
          maxTimeSeconds: question.maxTimeSeconds ?? null,
          correctAnswers: (question.correctAnswers ?? []).map((answer) => optionIdsByKey.get(answer) ?? answer),
        });
        if (options.length > 0) await transaction.insert(examQuestionOptionsTable).values(options);
      }
    });
    return this.getByOrg(orgId, examId);
  }

  async updateQuestionGrading(orgId: string, examId: string, questionId: string, input: UpdateQuestionGradingInput): Promise<ExamDefinitionView | null> {
    const [ownedQuestion] = await db
      .select({ id: examQuestionsTable.id })
      .from(examQuestionsTable)
      .innerJoin(examsTable, eq(examsTable.id, examQuestionsTable.examId))
      .where(and(eq(examsTable.orgId, orgId), eq(examQuestionsTable.examId, examId), eq(examQuestionsTable.id, questionId)))
      .limit(1);
    if (!ownedQuestion) return null;

    await db.update(examQuestionsTable).set({
      graded: input.graded,
      points: input.points,
      correctAnswers: input.correctAnswers,
      explanation: input.explanation,
      updatedAt: new Date(),
    }).where(eq(examQuestionsTable.id, questionId));
    await db.update(examsTable).set({ updatedAt: new Date() }).where(eq(examsTable.id, examId));
    return this.getByOrg(orgId, examId);
  }

  async setArchived(orgId: string, examId: string, userId: string | null): Promise<boolean> {
    const [updated] = await db.update(examsTable).set({
      archivedAt: userId ? new Date() : null,
      archivedByUserId: userId,
      updatedAt: new Date(),
    }).where(and(eq(examsTable.id, examId), eq(examsTable.orgId, orgId))).returning({ id: examsTable.id });
    return Boolean(updated);
  }

  async getOrgSettings(orgId: string): Promise<{ journeyMode: 'exam_first' | 'standard'; visibleTopLevelApps: Array<'exams' | 'airunote'> }> {
    const [settings] = await db.select().from(examOrgSettingsTable).where(eq(examOrgSettingsTable.orgId, orgId)).limit(1);
    const visible = readStringArray(settings?.visibleTopLevelApps).filter((app): app is 'exams' | 'airunote' => app === 'exams' || app === 'airunote');
    return {
      journeyMode: settings?.journeyMode === 'standard' ? 'standard' : 'exam_first',
      visibleTopLevelApps: visible.length > 0 ? visible : ['exams', 'airunote'],
    };
  }

  async upsertOrgSettings(orgId: string, input: { journeyMode: 'exam_first' | 'standard'; visibleTopLevelApps: Array<'exams' | 'airunote'> }): Promise<void> {
    await db.insert(examOrgSettingsTable).values({ orgId, ...input }).onConflictDoUpdate({
      target: examOrgSettingsTable.orgId,
      set: { ...input, updatedAt: new Date() },
    });
  }

}
