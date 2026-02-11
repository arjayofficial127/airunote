import { z } from 'zod';
import { ReadContext } from '../../core/types/ReadContext';

export const CreateCollectionDto = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  visibility: z.enum(['private', 'org', 'public']).default('private'),
});

export const UpdateCollectionDto = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  visibility: z.enum(['private', 'org', 'public']).optional(),
});

// CollectionFieldConfig schema for validation
// excludeContexts declares where this field must NOT be returned.
// Example: ['list'] means this field is excluded from metadata/list queries.
const CollectionFieldConfigSchema = z.object({
  excludeContexts: z.array(z.enum(['list', 'detail', 'edit', 'preview', 'search'])).optional(),
}).passthrough(); // Allow other properties

export const CreateCollectionFieldDto = z.object({
  key: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
  type: z.enum(['text', 'number', 'boolean', 'date', 'select', 'multi_select']),
  isRequired: z.boolean().default(false),
  order: z.number().int().default(0),
  config: CollectionFieldConfigSchema.default({}),
});

export const UpdateCollectionFieldDto = z.object({
  key: z.string().min(1).max(255).optional(),
  label: z.string().min(1).max(255).optional(),
  type: z.enum(['text', 'number', 'boolean', 'date', 'select', 'multi_select']).optional(),
  isRequired: z.boolean().optional(),
  order: z.number().int().optional(),
  config: CollectionFieldConfigSchema.optional(),
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionDto>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionDto>;
export type CreateCollectionFieldInput = z.infer<typeof CreateCollectionFieldDto>;
export type UpdateCollectionFieldInput = z.infer<typeof UpdateCollectionFieldDto>;

