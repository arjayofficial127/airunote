import { z } from 'zod';

export const CreateUploadTicketDto = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export const CompleteUploadDto = z.object({
  uploadTicketId: z.string().uuid().optional(), // Optional for future presigned flow
  storageKey: z.string().min(1),
  url: z.string().url(),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  checksum: z.string().optional(),
});

export const UpdateVisibilityDto = z.object({
  visibility: z.enum(['private', 'org', 'public', 'users']),
  userIds: z.array(z.string().uuid()).optional(), // Required if visibility='users'
});

export const ListFilesFiltersDto = z.object({
  visibility: z.enum(['private', 'org', 'public', 'users']).optional(),
  search: z.string().optional(),
});

export type CreateUploadTicketDto = z.infer<typeof CreateUploadTicketDto>;
export type CompleteUploadDto = z.infer<typeof CompleteUploadDto>;
export type UpdateVisibilityDto = z.infer<typeof UpdateVisibilityDto>;
export type ListFilesFiltersDto = z.infer<typeof ListFilesFiltersDto>;
