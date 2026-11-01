import { z } from 'zod';

export const spaceLinkSchema = z.object({ entityId: z.string().uuid(), entityType: z.enum(['document', 'folder', 'collection']) });
export type SpaceLink = z.infer<typeof spaceLinkSchema>;
export function readSpaceLinks(metadata: Record<string, unknown> | null | undefined): SpaceLink[] {
  const parsed = z.array(spaceLinkSchema).safeParse(metadata?.airunoteSpaceLinks ?? []);
  return parsed.success ? parsed.data : [];
}
export const linkKey = (link: SpaceLink) => `${link.entityType}:${link.entityId}`;
