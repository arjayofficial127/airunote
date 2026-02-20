/**
 * Hook for moving a folder
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getTreeCacheKey, getTreeInvalidationKeys } from '../services/airunoteCache';
import { toast } from '@/lib/toast';
import type { AiruFolder } from '../types';

interface MoveFolderContext {
  previousTrees?: Record<string, any>;
}

export function useMoveFolder() {
  const queryClient = useQueryClient();

  return useMutation<AiruFolder, Error, { folderId: string; orgId: string; userId: string; newParentFolderId: string }, MoveFolderContext>({
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
    onMutate: async ({ folderId, orgId, userId, newParentFolderId }) => {
      // Cancel outgoing refetches
      const invalidationKeys = getTreeInvalidationKeys(orgId, userId);
      await Promise.all(
        invalidationKeys.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );

      // Snapshot previous values
      const previousTrees: Record<string, any> = {};
      invalidationKeys.forEach((key) => {
        previousTrees[key.join('-')] = queryClient.getQueryData(key);
      });

      return { previousTrees };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTrees) {
        Object.entries(context.previousTrees).forEach(([key, value]) => {
          const keyArray = key.split('-');
          queryClient.setQueryData(keyArray, value);
        });
      }
      toast(error instanceof Error ? error.message : 'Failed to move folder', 'error');
    },
    onSuccess: (data, variables) => {
      // Invalidate all tree queries (both old and new parent)
      const invalidationKeys = getTreeInvalidationKeys(variables.orgId, variables.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast('Folder moved successfully', 'success');
    },
  });
}
