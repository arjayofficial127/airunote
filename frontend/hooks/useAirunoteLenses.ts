/**
 * React Query hooks for Airunote Lenses
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFolderLenses,
  fetchDesktopLenses,
  fetchLens,
  patchLensItems,
  updateFolderLens,
  updateDesktopLens,
  deleteLens,
  type AiruLens,
  type AiruLensItem,
  type LensItemInput,
  type AiruLensType,
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
 * Hook for fetching all desktop/saved lenses for an org
 */
export function useDesktopLenses(orgId?: string) {
  return useQuery<AiruLens[]>({
    queryKey: ['desktop-lenses', orgId],
    queryFn: async () => {
      if (!orgId) {
        throw new Error('orgId is required');
      }
      const response = await fetchDesktopLenses(orgId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch desktop lenses');
      }
      return response.data.lenses;
    },
    enabled: !!orgId,
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

/**
 * Hook for updating a folder lens
 */
export function useUpdateFolderLens(orgId?: string, folderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { lens: AiruLens },
    Error,
    { lensId: string; data: { name?: string; type?: AiruLensType; metadata?: Record<string, unknown>; query?: Record<string, unknown> | null } }
  >({
    mutationFn: async ({ lensId, data }) => {
      if (!orgId || !folderId) {
        throw new Error('orgId and folderId are required');
      }
      const response = await updateFolderLens(orgId, folderId, lensId, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update lens');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate folder lenses and lens queries
      if (orgId && folderId) {
        queryClient.invalidateQueries({ queryKey: ['folder-lenses', orgId, folderId] });
        queryClient.invalidateQueries({ queryKey: ['lens', orgId, variables.lensId] });
      }
    },
  });
}

/**
 * Hook for updating a desktop or saved lens
 */
export function useUpdateDesktopLens(orgId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { lens: AiruLens },
    Error,
    { lensId: string; data: { name?: string; query?: Record<string, unknown> | null; metadata?: Record<string, unknown> } }
  >({
    mutationFn: async ({ lensId, data }) => {
      if (!orgId) {
        throw new Error('orgId is required');
      }
      const response = await updateDesktopLens(orgId, lensId, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update lens');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate lens query
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['lens', orgId, variables.lensId] });
      }
    },
  });
}

/**
 * Hook for deleting a lens
 */
export function useDeleteLens(orgId?: string, folderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { lensId: string }
  >({
    mutationFn: async ({ lensId }) => {
      if (!orgId) {
        throw new Error('orgId is required');
      }
      const response = await deleteLens(orgId, lensId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete lens');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate folder lenses and lens queries
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['lens', orgId, variables.lensId] });
        if (folderId) {
          queryClient.invalidateQueries({ queryKey: ['folder-lenses', orgId, folderId] });
        }
      }
    },
  });
}
