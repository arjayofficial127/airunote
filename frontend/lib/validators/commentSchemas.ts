import { z } from 'zod';

/**
 * Comment validation schemas
 * Used for both frontend and backend validation
 */

export const CreateCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment is too long (max 5000 characters)')
    .trim(),
});

export const UpdateCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment is too long (max 5000 characters)')
    .trim(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

