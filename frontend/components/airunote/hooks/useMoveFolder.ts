/**
 * Hook for moving a folder
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';
import type { AiruFolder } from '../types';

export function useMoveFolder() {
  const store = useAirunoteStore.getState();

  return useMutation<AiruFolder, Error, { folderId: string; orgId: string; userId: string; newParentFolderId: string }>({
    mutationFn: async ({ folderId, orgId, userId, newParentFolderId }) => {
      const response = await airunoteApi.updateFolder(folderId, {
        orgId,
        userId,
        parentFolderId: newParentFolderId,
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to move folder');
      }
      return response.data.folder;
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to move folder', 'error');
    },
    onSuccess: (data) => {
      // Update store with moved folder
      store.updateFolder(data);
      toast('Folder moved successfully', 'success');
    },
  });
}
