/**
 * Hook for fetching lens by ID (for desktop lenses)
 * Phase 5 — Desktop Lenses
 * 
 * Fetches lens and documents via GET /lenses/:id
 * Works for both folder lenses and desktop lenses
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import type { AiruDocument } from '../types';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface UseLensOptions {
  lensId: string | null;
  orgId: string;
  userId: string;
  enabled?: boolean;
}

export function useLens({ lensId, orgId, userId, enabled = true }: UseLensOptions) {
  return useQuery<{ lens: AiruLens | null; documents: AiruDocument[] }>({
    queryKey: ['lens', lensId, orgId, userId],
    queryFn: async () => {
      if (!lensId) {
        return { lens: null, documents: [] };
      }

      try {
        const response = await airunoteApi.getLens(lensId, orgId, userId);
        if (!response.success) {
          return { lens: null, documents: [] };
        }

        return {
          lens: response.data.lens,
          documents: response.data.documents,
        };
      } catch (error) {
        console.error('Failed to fetch lens:', error);
        return { lens: null, documents: [] };
      }
    },
    enabled: enabled && !!lensId && !!orgId && !!userId,
    staleTime: 5 * 60 * 1000, // Phase 8.1: 5 minutes - optimize lens metadata caching
    refetchOnMount: false, // Phase 8.1: Don't refetch on mount (use cached data)
    refetchOnWindowFocus: false, // Phase 8.1: Don't refetch on tab focus
  });
}
