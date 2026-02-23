/**
 * React Query hooks for Airunote Lenses
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFolderLenses,
  fetchLens,
  patchLensItems,
  type AiruLens,
  type AiruLensItem,
  type LensItemInput,
} from '@/lib/api/airunoteLensesApi';

/**
 * Hook for fetching all lenses for a folder
 */
export function useFolderLenses(orgId?: string, folderId?: string) {
  return useQuery<AiruLens[]>({
    queryKey: ['folder-lenses', orgId, folderId],
    queryFn: async () => {
      if (!orgId || !folderId) {
        throw new Error('orgId and folderId are required');
      }
      const response = await fetchFolderLenses(orgId, folderId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch folder lenses');
      }
      return response.data.lenses;
    },
    enabled: !!orgId && !!folderId,
    staleTime: 60 * 1000, // 60 seconds minimum
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching a single lens with its items
 */
export function useLens(orgId?: string, lensId?: string) {
  return useQuery<{ lens: AiruLens; items: AiruLensItem[] }>({
    queryKey: ['lens', orgId, lensId],
    queryFn: async () => {
      if (!orgId || !lensId) {
        throw new Error('orgId and lensId are required');
      }
      const response = await fetchLens(orgId, lensId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch lens');
      }
      return response.data;
    },
    enabled: !!orgId && !!lensId,
    staleTime: 60 * 1000, // 60 seconds minimum
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for updating lens items
 */
export function useUpdateLensItems(orgId?: string, lensId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { updated: number },
    Error,
    { items: LensItemInput[] }
  >({
    mutationFn: async ({ items }) => {
      if (!orgId || !lensId) {
        throw new Error('orgId and lensId are required');
      }
      const response = await patchLensItems(orgId, lensId, items);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update lens items');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate lens query to refetch updated items
      if (orgId && lensId) {
        queryClient.invalidateQueries({ queryKey: ['lens', orgId, lensId] });
      }
    },
  });
}
