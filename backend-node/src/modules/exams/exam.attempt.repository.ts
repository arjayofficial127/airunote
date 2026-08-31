import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  examAnswersTable,
  examAttemptEventsTable,
  examAttemptsTable,
  examsTable,
} from '../../infrastructure/db/drizzle/schema';

export type ExamAttemptRecord = typeof examAttemptsTable.$inferSelect;
export type ExamAnswerRecord = typeof examAnswersTable.$inferSelect;
export type ExamAttemptEventRecord = typeof examAttemptEventsTable.$inferSelect;

export interface CreateAttemptRecordInput {
  examId: string;
  accessTokenHash: string;
  respondentName: string;
  respondentEmail: string | null;
  respondentIdentifier: string | null;
  identityKeyHash: string;
  deviceHash: string;
  ipHash: string;
  userAgentHash: string;
  attemptNumber: number;
  questionOrder: string[];
  optionOrder: Record<string, string[]>;
}

export interface AttemptIdentitySignals {
  identityKeyHash: string;
}

export class ExamAttemptRepository {
  async countAttempts(examId: string, signals: AttemptIdentitySignals): Promise<number> {
    const [result] = await db.select({ value: count(examAttemptsTable.id) }).from(examAttemptsTable).where(and(
      eq(examAttemptsTable.examId, examId),
      eq(examAttemptsTable.identityKeyHash, signals.identityKeyHash),
    ));
    return Number(result?.value ?? 0);
  }

  async createAttempt(input: CreateAttemptRecordInput): Promise<ExamAttemptRecord> {
    const [attempt] = await db.insert(examAttemptsTable).values(input).returning();
    if (!attempt) throw new Error('Attempt could not be created');
    await this.addEvent(attempt.id, 'started', {});
    return attempt;
  }

  async findAttemptByTokenHash(accessTokenHash: string): Promise<ExamAttemptRecord | null> {
    const [attempt] = await db.select().from(examAttemptsTable).where(eq(examAttemptsTable.accessTokenHash, accessTokenHash)).limit(1);
    return attempt ?? null;
  }

  async findAttemptByOrg(orgId: string, examId: string, attemptId: string): Promise<ExamAttemptRecord | null> {
    const [attempt] = await db
      .select({ attempt: examAttemptsTable })
      .from(examAttemptsTable)
      .innerJoin(examsTable, eq(examsTable.id, examAttemptsTable.examId))
      .where(and(eq(examsTable.orgId, orgId), eq(examAttemptsTable.examId, examId), eq(examAttemptsTable.id, attemptId)))
      .limit(1);
    return attempt?.attempt ?? null;
  }

  async getAnswers(attemptId: string): Promise<ExamAnswerRecord[]> {
    return db.select().from(examAnswersTable).where(eq(examAnswersTable.attemptId, attemptId));
  }

  async saveAnswer(attemptId: string, questionId: string, answer: string[]): Promise<Date> {
    const now = new Date();
    await db.insert(examAnswersTable).values({ attemptId, questionId, answer, savedAt: now }).onConflictDoUpdate({
      target: [examAnswersTable.attemptId, examAnswersTable.questionId],
      set: { answer, savedAt: now },
    });
    await db.update(examAttemptsTable).set({ lastActiveAt: now, updatedAt: now }).where(eq(examAttemptsTable.id, attemptId));
    return now;
  }

  async updateAttempt(attemptId: string, values: Partial<Pick<ExamAttemptRecord,
    'accessTokenHash' | 'status' | 'questionTiming' | 'focusViolationCount' | 'resumeCount' | 'extraTimeSeconds' | 'terminationReason' | 'lastActiveAt' | 'completedAt'
  >>): Promise<ExamAttemptRecord | null> {
    const [attempt] = await db.update(examAttemptsTable).set({ ...values, updatedAt: new Date() }).where(eq(examAttemptsTable.id, attemptId)).returning();
    return attempt ?? null;
  }

  async addEvent(attemptId: string, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    await db.insert(examAttemptEventsTable).values({ attemptId, eventType, metadata });
  }

  async getReportData(examId: string): Promise<{ attempts: ExamAttemptRecord[]; answers: ExamAnswerRecord[]; events: ExamAttemptEventRecord[] }> {
    const attempts = await db.select().from(examAttemptsTable).where(eq(examAttemptsTable.examId, examId)).orderBy(desc(examAttemptsTable.startedAt));
    if (attempts.length === 0) return { attempts: [], answers: [], events: [] };
    const attemptIds = attempts.map((attempt) => attempt.id);
    const [answers, events] = await Promise.all([
      db.select().from(examAnswersTable).where(inArray(examAnswersTable.attemptId, attemptIds)),
      db.select().from(examAttemptEventsTable).where(inArray(examAttemptEventsTable.attemptId, attemptIds)).orderBy(desc(examAttemptEventsTable.createdAt)),
    ]);
    return { attempts, answers, events };
  }
}
