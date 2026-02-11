import { z } from 'zod';

const AttachmentMetadataSchema = z.object({
  url: z.string().url(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  type: z.enum(['image', 'file']).optional(),
});

export const CreatePostDto = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  isPublished: z.boolean().default(true),
  attachments: z.array(AttachmentMetadataSchema).optional(),
});

export const UpdatePostDto = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  isPublished: z.boolean().optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostDto>;
export type UpdatePostInput = z.infer<typeof UpdatePostDto>;

