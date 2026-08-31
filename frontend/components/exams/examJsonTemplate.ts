import type { ExamInput } from '@/lib/api/exams';
import { z } from 'zod';

const optionSchema = z.object({ id: z.string().uuid().optional(), key: z.string().optional(), label: z.string().min(1) });
const sectionSchema = z.object({
  id: z.string().uuid().optional(), key: z.string().optional(), title: z.string().min(1),
  description: z.string().nullable().optional(), position: z.number().int().min(0).optional(), pinned: z.boolean().optional(),
});
const questionSchema = z.object({
  id: z.string().uuid().optional(), sectionId: z.string().uuid().nullable().optional(), sectionKey: z.string().nullable().optional(),
  type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'short_text']), prompt: z.string().min(1),
  explanation: z.string().nullable().optional(), position: z.number().int().min(0).optional(), required: z.boolean().optional(),
  graded: z.boolean().optional(), points: z.number().int().min(0).optional(), pinned: z.boolean().optional(),
  maxTimeSeconds: z.number().int().min(5).max(3600).nullable().optional(),
  correctAnswers: z.array(z.string()).optional(), options: z.array(optionSchema).optional(),
});
const examInputSchema = z.object({
  title: z.string().min(1), publicId: z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).optional(), description: z.string().nullable().optional(), status: z.enum(['draft', 'published', 'closed']).optional(),
  durationMinutes: z.number().int().min(1).optional(), oneQuestionAtATime: z.boolean().optional(), preventFocusLoss: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).optional(), reviewMode: z.enum(['none', 'respondent_answers', 'with_correct_answers']).optional(),
  shuffleQuestions: z.boolean().optional(), shuffleOptions: z.boolean().optional(), requireEmail: z.boolean().optional(),
  requireIdentifier: z.boolean().optional(), startsAt: z.string().nullable().optional(), endsAt: z.string().nullable().optional(),
  sections: z.array(sectionSchema).optional(), questions: z.array(questionSchema).optional(),
});

export function parseExamInputJson(text: string): ExamInput {
  return examInputSchema.parse(JSON.parse(text));
}

export const examJsonTemplate: ExamInput = {
  title: 'Sample graded exam',
  description: 'Replace this content or upload a JSON file.',
  status: 'draft',
  durationMinutes: 20,
  oneQuestionAtATime: true,
  preventFocusLoss: true,
  maxAttempts: 3,
  reviewMode: 'respondent_answers',
  shuffleQuestions: true,
  shuffleOptions: true,
  requireEmail: false,
  requireIdentifier: true,
  sections: [
    { key: 'instructions', title: 'Core questions', position: 0, pinned: true },
  ],
  questions: [
    {
      sectionKey: 'instructions',
      type: 'single_choice',
      prompt: 'Which answer is correct?',
      position: 0,
      pinned: true,
      graded: true,
      points: 1,
      maxTimeSeconds: 45,
      options: [
        { key: 'a', label: 'Answer A' },
        { key: 'b', label: 'Answer B' },
      ],
      correctAnswers: ['a'],
    },
  ],
};

export const examJsonTemplateText = JSON.stringify(examJsonTemplate, null, 2);
