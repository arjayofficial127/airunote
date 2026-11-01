import { z } from 'zod';
import apiClient from './client';
import { spaceLinkSchema, type SpaceLink } from '../spaceLinks';

const responseSchema = z.object({ success: z.literal(true), data: z.object({ id: z.string().uuid(), metadata: z.record(z.unknown()) }) });
export async function changeSpaceLink(orgId: string, folderId: string, link: SpaceLink, remove = false) {
  const body = spaceLinkSchema.parse(link);
  const url = `/orgs/${orgId}/airunote/folders/${folderId}/links`;
  const response = remove ? await apiClient.delete(url, { data: body }) : await apiClient.post(url, body);
  return responseSchema.parse(response.data).data;
}
