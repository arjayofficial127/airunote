import { z } from 'zod';

export const CreateRecordDto = z.object({
  data: z.record(z.any()),
});

export const UpdateRecordDto = z.object({
  data: z.record(z.any()),
});

export type CreateRecordInput = z.infer<typeof CreateRecordDto>;
export type UpdateRecordInput = z.infer<typeof UpdateRecordDto>;

