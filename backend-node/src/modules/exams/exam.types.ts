import { z } from 'zod';

export const examStatusSchema = z.enum(['draft', 'published', 'closed']);
export const examReviewModeSchema = z.enum(['none', 'respondent_answers', 'with_correct_answers']);
export const examQuestionTypeSchema = z.enum([
  'single_choice',
  'multiple_choice',
  'true_false',
  'short_text',
]);

export const examOptionInputSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(100).optional(),
  label: z.string().trim().min(1).max(2000),
});

export const examSectionInputSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(5000).nullable().optional(),
  position: z.number().int().min(0).optional(),
  pinned: z.boolean().optional(),
});

export const examQuestionInputSchema = z.object({
  id: z.string().uuid().optional(),
  sectionId: z.string().uuid().nullable().optional(),
  sectionKey: z.string().min(1).max(100).nullable().optional(),
  type: examQuestionTypeSchema,
  prompt: z.string().trim().min(1).max(20000),
  explanation: z.string().max(20000).nullable().optional(),
  position: z.number().int().min(0).optional(),
  required: z.boolean().optional(),
  graded: z.boolean().optional(),
  points: z.number().int().min(0).max(10000).optional(),
  pinned: z.boolean().optional(),
  correctAnswers: z.array(z.string().max(2000)).max(100).optional(),
  options: z.array(examOptionInputSchema).max(100).optional(),
}).superRefine((question, context) => {
  const isChoice = question.type === 'single_choice' || question.type === 'multiple_choice';
  if (isChoice && (!question.options || question.options.length < 2)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'Choice questions require at least two options',
    });
  }
});

export const createExamSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(10000).nullable().optional(),
  status: examStatusSchema.optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  oneQuestionAtATime: z.boolean().optional(),
  preventFocusLoss: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(100).optional(),
  reviewMode: examReviewModeSchema.optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  requireEmail: z.boolean().optional(),
  requireIdentifier: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  sections: z.array(examSectionInputSchema).max(100).optional(),
  questions: z.array(examQuestionInputSchema).max(1000).optional(),
});

export const updateExamSchema = createExamSchema
  .omit({ sections: true, questions: true })
  .partial();

export const updateQuestionGradingSchema = z.object({
  graded: z.boolean(),
  points: z.number().int().min(0).max(10000),
  correctAnswers: z.array(z.string().max(2000)).max(100),
  explanation: z.string().max(20000).nullable().optional(),
});

export const examOrgSettingsSchema = z.object({
  journeyMode: z.enum(['exam_first', 'standard']),
  visibleTopLevelApps: z.array(z.enum(['exams', 'airunote'])).min(1).max(2),
});

export const startAttemptSchema = z.object({
  respondentName: z.string().trim().min(1).max(255),
  respondentEmail: z.string().trim().email().max(255).nullable().optional(),
  respondentIdentifier: z.string().trim().min(1).max(255).nullable().optional(),
  deviceId: z.string().trim().min(8).max(255),
});

export const saveAnswerSchema = z.object({
  answer: z.array(z.string().max(20000)).max(100),
});

export const attemptEventSchema = z.object({
  eventType: z.enum(['focus_lost', 'heartbeat']),
  metadata: z.record(z.unknown()).optional(),
});

export const continueAttemptSchema = z.object({
  additionalMinutes: z.number().int().min(0).max(240).optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type UpdateQuestionGradingInput = z.infer<typeof updateQuestionGradingSchema>;
export type ExamOrgSettingsInput = z.infer<typeof examOrgSettingsSchema>;
export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type QuestionType = z.infer<typeof examQuestionTypeSchema>;
export type ExamStatus = z.infer<typeof examStatusSchema>;
export type ExamReviewMode = z.infer<typeof examReviewModeSchema>;

export interface ExamOptionView {
  id: string;
  label: string;
  position: number;
}

export interface ExamQuestionView {
  id: string;
  examId: string;
  sectionId: string | null;
  type: QuestionType;
  prompt: string;
  explanation: string | null;
  position: number;
  required: boolean;
  graded: boolean;
  points: number;
  pinned: boolean;
  correctAnswers: string[];
  options: ExamOptionView[];
}

export interface ExamSectionView {
  id: string;
  title: string;
  description: string | null;
  position: number;
  pinned: boolean;
}

export interface ExamDefinitionView {
  id: string;
  orgId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'closed';
  publicId: string;
  durationMinutes: number;
  oneQuestionAtATime: boolean;
  preventFocusLoss: boolean;
  maxAttempts: number;
  reviewMode: 'none' | 'respondent_answers' | 'with_correct_answers';
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  requireEmail: boolean;
  requireIdentifier: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sections: ExamSectionView[];
  questions: ExamQuestionView[];
  attemptCount: number;
}

export interface PublicRequestSignals {
  ipAddress: string;
  userAgent: string;
}
