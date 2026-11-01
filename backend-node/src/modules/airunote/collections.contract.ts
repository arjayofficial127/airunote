import { z } from 'zod';

export const collectionKindSchema = z.enum(['canvas', 'pages', 'study', 'board']);
export const referenceSchema = z.object({ entityId: z.string().uuid(), entityType: z.enum(['document', 'folder', 'collection']) }).strict();
export const membershipSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('chosen') }).strict(),
  z.object({ mode: z.literal('matching'), folderId: z.string().uuid().nullable(), descendants: z.boolean(), status: z.enum(['all', 'open', 'done', 'cancelled']), query: z.string().max(200) }).strict(),
]);
export const pageSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }).strict();
const pagesSchema = z.array(pageSchema).min(1).max(100).refine(pages => new Set(pages.map(page => page.id)).size === pages.length);
export const collectionConfigSchema = z.object({
  version: z.literal(1), orgId: z.string().uuid(), ownerUserId: z.string().uuid(), kind: collectionKindSchema,
  revision: z.number().int().positive(), membership: membershipSchema, pages: pagesSchema,
});
export const createCollectionSchema = z.object({ name: z.string().trim().min(1).max(120), kind: collectionKindSchema, homeFolderId: z.string().uuid(), membership: membershipSchema.default({ mode: 'chosen' }) }).strict();
export const updateCollectionSchema = z.object({
  revision: z.number().int().positive(), name: z.string().trim().min(1).max(120).optional(), homeFolderId: z.string().uuid().optional(),
  membership: membershipSchema.optional(), pages: pagesSchema.optional(),
}).strict();
export const addReferencesSchema = z.object({ revision: z.number().int().positive(), items: z.array(referenceSchema.extend({ pageId: z.string().uuid().optional() })).min(1).max(1000) }).strict();
export const placementPatchSchema = z.object({
  id: z.string().uuid(), order: z.number().finite().min(-100000).max(100000).optional(),
  x: z.number().finite().min(0).max(100000).optional(), y: z.number().finite().min(0).max(100000).optional(),
  columnId: z.string().max(100).nullable().optional(), pageId: z.string().uuid().optional(),
  viewMode: z.enum(['list', 'icon', 'preview', 'full']).optional(),
  metadata: z.record(z.unknown()).refine(value => JSON.stringify(value).length <= 10000).optional(),
}).strict();
export type CollectionKind = z.infer<typeof collectionKindSchema>;
export type CollectionMembership = z.infer<typeof membershipSchema>;
export type CollectionReference = z.infer<typeof referenceSchema>;
export type CollectionConfig = z.infer<typeof collectionConfigSchema>;
export type Collection = { id: string; homeFolderId: string; name: string; config: CollectionConfig; updatedAt: string };
export type Placement = CollectionReference & { id: string; pageId: string; order: number; x: number | null; y: number | null; columnId: string | null; viewMode: 'list' | 'icon' | 'preview' | 'full' | null; metadata: Record<string, unknown>; available: boolean };
export type CollectionDetail = { collection: Collection; placements: Placement[] };
export const collectionLabels: Record<CollectionKind, string> = { canvas: 'Canvas', pages: 'Book', study: 'Study set', board: 'Board' };
