import { z } from 'zod';
import apiClient from '@/lib/api/client';
import { lifecycleState, type LifecycleState } from '@/lib/airunoteLifecycle';
const movedFolder = z.object({ id: z.string().uuid(), parentFolderId: z.string().uuid(), metadata: z.record(z.unknown()).optional() });
const movedDocument = z.object({ id: z.string().uuid(), folderId: z.string().uuid(), updatedAt: z.coerce.date() });
const folderResponse = z.object({ success: z.literal(true), data: z.object({ folder: movedFolder.extend({ metadata: z.record(z.unknown()) }), folders: z.array(movedFolder), documents: z.array(movedDocument) }) });
const noteResponse = z.object({ success: z.literal(true), data: z.object({ id: z.string().uuid(), state: lifecycleState, updatedAt: z.coerce.date() }) });
export const lifecycleApi = {
  async folder(orgId: string, id: string, state: LifecycleState, expectedState: LifecycleState) {
    const result = await apiClient.patch(`/orgs/${orgId}/airunote/lifecycle/folders/${id}`, { state, expectedState });
    return folderResponse.parse(result.data).data;
  },
  async note(orgId: string, id: string, state: LifecycleState, expectedUpdatedAt: string) {
    const result = await apiClient.patch(`/orgs/${orgId}/airunote/lifecycle/documents/${id}`, { state, expectedUpdatedAt });
    return noteResponse.parse(result.data).data;
  },
};
