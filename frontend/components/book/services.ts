import apiClient from '@/lib/api/client';
import { z } from 'zod';
import type { AiruDocument, AiruFolder } from '@/components/airunote/types';
import { editablePlanning } from '@/lib/book';
import { planningSchema, readPlanning, record, type BookDocumentUpdate, type BookConfigUpdate, type BookPlanning, type BookBatch } from '@/lib/book';
import { releaseSchema, type KindFields } from '@/lib/book';

const documentSchema = z.object({ id: z.string().uuid(), folderId: z.string().uuid(), ownerUserId: z.string().uuid(), name: z.string(), content: z.string(), canonicalContent: z.string().optional(), sharedContent: z.string().nullable().optional(), type: z.enum(['TXT', 'MD', 'RTF']), visibility: z.enum(['private', 'org', 'public']), state: z.enum(['active', 'archived', 'trashed']), attributes: z.record(z.unknown()), createdAt: z.coerce.date(), updatedAt: z.coerce.date() }).passthrough();
function documentBoundary(value: unknown): AiruDocument {
  const parsed = z.object({ success: z.literal(true), data: z.object({ document: documentSchema }) }).parse(value);
  if (!readPlanning(parsed.data.document.attributes)) throw new Error('Unsupported planning data was returned');
  return parsed.data.document;
}
export const bookApi = {
  async capabilities(orgId: string) {
    try {
      const response = await apiClient.get<unknown>(`/orgs/${orgId}/airunote/book/capabilities`);
      const parsed = z.object({ success: z.literal(true), data: z.object({ kinds: z.literal(1), taskDueDates: z.boolean().optional(), itemCopies: z.boolean().optional() }) }).safeParse(response.data);
      return parsed.success ? parsed.data.data : null;
    } catch { return null; }
  },
  async copy(orgId: string, id: string, rootFolderId: string, folderId: string, expectedUpdatedAt: string): Promise<AiruDocument> {
    return documentBoundary((await apiClient.post<unknown>(`/orgs/${orgId}/airunote/book/documents/${id}/copy`, { rootFolderId, folderId, expectedUpdatedAt })).data);
  },
  async ready(orgId: string, id: string, rootFolderId: string, expectedUpdatedAt: string): Promise<AiruDocument> {
    return documentBoundary((await apiClient.post<unknown>(`/orgs/${orgId}/airunote/book/documents/${id}/ready`, { rootFolderId, expectedUpdatedAt })).data);
  },
  async version(orgId: string, id: string, rootFolderId: string, revisionId: string) {
    const response = await apiClient.get<unknown>(`/orgs/${orgId}/airunote/book/documents/${id}/versions/${revisionId}`, { params: { rootFolderId } });
    return z.object({ success: z.literal(true), data: z.object({ version: releaseSchema.extend({ content: z.string() }) }) }).parse(response.data).data.version;
  },
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
  async capture(orgId: string, _userId: string, folderId: string, name: string, planning: BookPlanning, content = '', rootFolderId = folderId, kindFields?: KindFields): Promise<AiruDocument> {
    const parsed = planningSchema.parse(planning);
    const response = await apiClient.post<unknown>(`/orgs/${orgId}/airunote/book/documents`, { rootFolderId, folderId, name, content, planning: editablePlanning(parsed), ...(kindFields ? { kindFields } : {}) });
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
