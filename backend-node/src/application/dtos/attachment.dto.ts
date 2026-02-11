import { z } from 'zod';

export const CreateAttachmentDto = z.object({
  url: z.string().url(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  type: z.enum(['image', 'file', 'video', 'link']),
  label: z.string().max(255).optional(),
  order: z.number().int().default(0),
});

export type CreateAttachmentDto = z.infer<typeof CreateAttachmentDto>;

export const CreateAttachmentsDto = z.array(CreateAttachmentDto);

export type CreateAttachmentsDto = z.infer<typeof CreateAttachmentsDto>;

