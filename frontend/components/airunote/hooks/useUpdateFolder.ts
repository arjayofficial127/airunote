/**
 * Hook for updating a folder (name and/or type)
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';
import type { UpdateFolderRequest, AiruFolder } from '../types';

interface UpdateFolderParams {
  folderId: string;
  orgId: string;
  userId: string;
  humanId?: string;
  type?: 'box' | 'book' | 'board';
  metadata?: Record<string, unknown> | null;
}

export function useUpdateFolder() {
  const store = useAirunoteStore.getState();

  return useMutation<AiruFolder, Error, UpdateFolderParams>({
    mutationFn: async ({ folderId, orgId, userId, humanId, type, metadata }) => {
      const request: UpdateFolderRequest = {
        orgId,
        userId,
      };
      
      if (humanId !== undefined) {
        request.humanId = humanId;
      }
      
      if (type !== undefined) {
        request.type = type;
      }
      
      if (metadata !== undefined) {
        request.metadata = metadata;
      }

      const response = await airunoteApi.updateFolder(folderId, request);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update folder');
      }
      return response.data.folder;
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to update folder', 'error');
    },
    onSuccess: (data) => {
      // Update store with updated folder
      store.updateFolder(data);
      toast(`Folder "${data.humanId}" updated successfully`, 'success');
    },
  });
}
