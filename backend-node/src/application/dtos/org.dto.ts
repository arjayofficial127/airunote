import { z } from 'zod';

export const CreateOrgDto = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export const UpdateOrgDto = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export type CreateOrgInput = z.infer<typeof CreateOrgDto>;
export type UpdateOrgInput = z.infer<typeof UpdateOrgDto>;

