/**
 * Hook for fetching full Airunote metadata (all folders and documents)
 */

import { useQuery } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getFullMetadataCacheKey } from '../services/airunoteCache';
import type { FullMetadataResponse } from '../types';

export function useFullMetadata(
  orgId: string | null,
  userId: string | null
) {
  return useQuery<FullMetadataResponse, Error>({
    queryKey: getFullMetadataCacheKey(orgId || '', userId || ''),
    queryFn: async () => {
      if (!orgId || !userId) {
        throw new Error('orgId and userId are required');
      }
      const response = await airunoteApi.getFullMetadata(orgId, userId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch full metadata');
      }
      return response.data;
    },
    enabled: !!orgId && !!userId,
    staleTime: 60 * 1000, // 1 minute (longer than tree since this is full metadata)
  });
}
