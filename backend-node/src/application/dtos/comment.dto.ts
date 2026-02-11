import { z } from 'zod';

export const CreateCommentDto = z.object({
  body: z.string().min(1).max(5000),
});

export const UpdateCommentDto = z.object({
  body: z.string().min(1).max(5000),
});

export type CreateCommentInput = z.infer<typeof CreateCommentDto>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentDto>;

