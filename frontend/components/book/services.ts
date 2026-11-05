import apiClient from '@/lib/api/client';
import { z } from 'zod';
import type { AiruDocument, AiruFolder } from '@/components/airunote/types';
import { editablePlanning } from '@/lib/book';
import { planningSchema, readPlanning, record, type BookDocumentUpdate, type BookConfigUpdate, type BookPlanning, type BookBatch } from '@/lib/book';

const documentSchema = z.object({ id: z.string().uuid(), folderId: z.string().uuid(), ownerUserId: z.string().uuid(), name: z.string(), content: z.string(), canonicalContent: z.string().optional(), sharedContent: z.string().nullable().optional(), type: z.enum(['TXT', 'MD', 'RTF']), visibility: z.enum(['private', 'org', 'public']), state: z.enum(['active', 'archived', 'trashed']), attributes: z.record(z.unknown()), createdAt: z.coerce.date(), updatedAt: z.coerce.date() }).passthrough();
function documentBoundary(value: unknown): AiruDocument {
  const parsed = z.object({ success: z.literal(true), data: z.object({ document: documentSchema }) }).parse(value);
  if (!readPlanning(parsed.data.document.attributes)) throw new Error('Unsupported planning data was returned');
  return parsed.data.document;
}
export const bookApi = {
  async daily(orgId: string, rootFolderId: string, date: string): Promise<AiruDocument> {
    const response = await apiClient.put<unknown>(`/orgs/${orgId}/airunote/book/daily/${date}`, { rootFolderId });
    return documentBoundary(response.data);
  },
  async batch(orgId: string, input: BookBatch): Promise<AiruDocument[]> {
    const response = await apiClient.post<unknown>(`/orgs/${orgId}/airunote/book/batch`, input);
    const envelope = z.object({ success: z.literal(true), data: z.object({ documents: z.array(documentSchema) }) }).parse(response.data);
    return envelope.data.documents;
  },
  async update(orgId: string, id: string, update: BookDocumentUpdate): Promise<AiruDocument> {
    const response = await apiClient.patch<unknown>(`/orgs/${orgId}/airunote/book/documents/${id}`, update);
    return documentBoundary(response.data);
  },
  async capture(orgId: string, _userId: string, folderId: string, name: string, planning: BookPlanning, content = '', rootFolderId = folderId): Promise<AiruDocument> {
    const parsed = planningSchema.parse(planning);
    const response = await apiClient.post<unknown>(`/orgs/${orgId}/airunote/book/documents`, { rootFolderId, folderId, name, content, planning: editablePlanning(parsed) });
    return documentBoundary(response.data);
  },
  async configure(orgId: string, folderId: string, update: BookConfigUpdate): Promise<AiruFolder> {
    const response = await apiClient.put<{ success: boolean; data: { folder: AiruFolder } }>(`/orgs/${orgId}/airunote/book/folders/${folderId}/config`, update);
    if (!response.data.success || response.data.data.folder.id !== folderId) throw new Error('Book settings were not saved');
    return response.data.data.folder;
  },
};
export function errorMessage(error: unknown): string {
  const response = record(record(error).response); const body = record(response.data); const detail = record(body.error);
  if (typeof detail.message === 'string') return detail.message;
  return error instanceof Error ? error.message : 'The change could not be saved. Your draft is still here.';
}
