/**
 * Hook for creating a folder with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getTreeCacheKey, getTreeInvalidationKeys } from '../services/airunoteCache';
import type { CreateFolderRequest, AiruFolder } from '../types';

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation<AiruFolder, Error, CreateFolderRequest>({
    mutationFn: async (request) => {
      const response = await airunoteApi.createFolder(request);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create folder');
      }
      return response.data.folder;
    },
    onMutate: async (request) => {
      // Cancel outgoing refetches
      const treeKey = getTreeCacheKey(request.orgId, request.userId, request.parentFolderId);
      await queryClient.cancelQueries({ queryKey: treeKey });

      // Snapshot previous value
      const previousTree = queryClient.getQueryData<{ folders: AiruFolder[]; documents: any[]; children: any[] }>(treeKey);

      // Optimistically update
      if (previousTree) {
        const optimisticFolder: AiruFolder = {
          id: 'temp-' + Date.now(), // Temporary ID
          orgId: request.orgId,
          ownerUserId: request.userId,
          parentFolderId: request.parentFolderId,
          humanId: request.humanId,
          visibility: 'private',
          createdAt: new Date(),
        };

        queryClient.setQueryData(treeKey, {
          ...previousTree,
          folders: [...previousTree.folders, optimisticFolder],
        });
      }

      return { previousTree };
    },
    onError: (error, request, context) => {
      // Rollback on error
      if (context?.previousTree) {
        const treeKey = getTreeCacheKey(request.orgId, request.userId, request.parentFolderId);
        queryClient.setQueryData(treeKey, context.previousTree);
      }
    },
    onSuccess: (data, request) => {
      // Invalidate tree queries to refetch with real data
      const invalidationKeys = getTreeInvalidationKeys(request.orgId, request.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
