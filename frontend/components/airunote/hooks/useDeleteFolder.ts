/**
 * Hook for deleting a folder with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getTreeCacheKey, getTreeInvalidationKeys } from '../services/airunoteCache';
import { toast } from '@/lib/toast';

interface DeleteFolderContext {
  previousTrees?: Record<string, any>;
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { folderId: string; orgId: string; userId: string }, DeleteFolderContext>({
    mutationFn: async ({ folderId, orgId, userId }) => {
      const response = await airunoteApi.deleteFolder(folderId, orgId, userId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete folder');
      }
    },
    onMutate: async ({ folderId, orgId, userId }) => {
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

      // Optimistically remove folder from all tree queries
      invalidationKeys.forEach((key) => {
        const tree = queryClient.getQueryData<{ folders: any[]; documents: any[]; children: any[] }>(key);
        if (tree) {
          const removeFolderRecursive = (node: typeof tree): typeof tree => {
            return {
              ...node,
              folders: node.folders.filter((f) => f.id !== folderId),
              children: node.children.map(removeFolderRecursive),
            };
          };
          queryClient.setQueryData(key, removeFolderRecursive(tree));
        }
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
      toast(error instanceof Error ? error.message : 'Failed to delete folder', 'error');
    },
    onSuccess: (data, variables) => {
      // Invalidate all tree queries to refetch
      const invalidationKeys = getTreeInvalidationKeys(variables.orgId, variables.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast('Folder deleted successfully', 'success');
    },
  });
}
