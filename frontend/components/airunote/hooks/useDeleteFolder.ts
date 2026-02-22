/**
 * Hook for deleting a folder
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';

export function useDeleteFolder() {
  const store = useAirunoteStore.getState();

  return useMutation<void, Error, { folderId: string; orgId: string; userId: string }>({
    mutationFn: async ({ folderId, orgId, userId }) => {
      const response = await airunoteApi.deleteFolder(folderId, orgId, userId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete folder');
      }
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to delete folder', 'error');
    },
    onSuccess: (data, variables) => {
      // Update store - remove folder and all its documents
      store.removeFolder(variables.folderId);
      // Note: Documents in the folder are also removed by removeFolder
      toast('Folder deleted successfully', 'success');
    },
  });
}
