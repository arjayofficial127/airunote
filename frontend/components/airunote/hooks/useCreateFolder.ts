/**
 * Hook for creating a folder
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';
import type { CreateFolderRequest, AiruFolder } from '../types';

export function useCreateFolder() {
  const store = useAirunoteStore.getState();

  return useMutation<AiruFolder, Error, CreateFolderRequest>({
    mutationFn: async (request) => {
      // Guard: Never send 'root' as parentFolderId - it must be a valid UUID
      if (request.parentFolderId === 'root') {
        throw new Error('Root folder ID not available. Please wait for root folder to be provisioned.');
      }
      
      const response = await airunoteApi.createFolder(request);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create folder');
      }
      return response.data.folder;
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to create folder', 'error');
    },
    onSuccess: (data) => {
      // Update store with new folder
      store.addFolder(data);
      toast(`Folder "${data.humanId}" created successfully`, 'success');
    },
  });
}
