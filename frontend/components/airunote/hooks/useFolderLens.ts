/**
 * Hook for fetching folder lens
 * Phase 1+ — Folder → Lens Rendering Refactor
 * 
 * Fetches the default lens for a folder (or implicit box lens)
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface UseFolderLensOptions {
  folderId: string | null;
  orgId: string;
  userId: string;
  enabled?: boolean;
}

export function useFolderLens({ folderId, orgId, userId, enabled = true }: UseFolderLensOptions) {
  return useQuery<AiruLens | null>({
    queryKey: ['folder-lens', folderId, orgId, userId],
    queryFn: async () => {
      if (!folderId) return null;

      try {
        // Fetch folder to get lens projection
        const folderResponse = await airunoteApi.getFolder(folderId, orgId, userId);
        if (!folderResponse.success) {
          return null;
        }

        // Get lenses for folder
        const lensesResponse = await airunoteApi.getFolderLenses(folderId, orgId, userId);
        if (!lensesResponse.success) {
        // No lenses found, return null (implicit box lens doesn't support canvas)
        return null;
        }

        // Find default lens
        const defaultLens = lensesResponse.data.lenses.find((l) => l.isDefault);
        if (defaultLens) {
          return defaultLens;
        }

        // No default lens, return implicit box lens (but we can't save positions without a real lens)
        // Return null to indicate no canvas lens available
        return null;
      } catch (error) {
        console.error('Failed to fetch folder lens:', error);
        // Return null on error
        return null;
      }
    },
    enabled: enabled && !!folderId && !!orgId && !!userId,
    staleTime: 5 * 60 * 1000, // Phase 8.1: 5 minutes - optimize lens metadata caching
    refetchOnWindowFocus: false, // Phase 8.1: Don't refetch on tab focus
  });
}
