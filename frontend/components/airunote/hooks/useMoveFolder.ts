/**
 * Hook for moving a folder
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getTreeCacheKey, getTreeInvalidationKeys } from '../services/airunoteCache';
import type { AiruFolder } from '../types';

export function useMoveFolder() {
  const queryClient = useQueryClient();

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
    onSuccess: (data, variables) => {
      // Invalidate all tree queries (both old and new parent)
      const invalidationKeys = getTreeInvalidationKeys(variables.orgId, variables.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
