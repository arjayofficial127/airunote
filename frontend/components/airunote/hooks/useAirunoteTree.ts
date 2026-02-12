/**
 * Hook for fetching Airunote folder tree
 */

import { useQuery } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getTreeCacheKey } from '../services/airunoteCache';
import type { FolderTreeResponse } from '../types';

export function useAirunoteTree(
  orgId: string | null,
  userId: string | null,
  parentFolderId?: string
) {
  return useQuery<FolderTreeResponse, Error>({
    queryKey: getTreeCacheKey(orgId || '', userId || '', parentFolderId),
    queryFn: async () => {
      if (!orgId || !userId) {
        throw new Error('orgId and userId are required');
      }
      const response = await airunoteApi.getTree(orgId, userId, parentFolderId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch folder tree');
      }
      return response.data;
    },
    enabled: !!orgId && !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
