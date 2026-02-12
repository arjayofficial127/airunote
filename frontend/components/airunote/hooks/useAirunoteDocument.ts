/**
 * Hook for fetching a single Airunote document
 */

import { useQuery } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getDocumentCacheKey } from '../services/airunoteCache';
import type { AiruDocument } from '../types';

export function useAirunoteDocument(
  orgId: string | null,
  userId: string | null,
  documentId: string | null
) {
  return useQuery<AiruDocument, Error>({
    queryKey: getDocumentCacheKey(orgId || '', userId || '', documentId || ''),
    queryFn: async () => {
      if (!orgId || !userId || !documentId) {
        throw new Error('orgId, userId, and documentId are required');
      }
      const response = await airunoteApi.getDocument(documentId, orgId, userId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch document');
      }
      return response.data.document;
    },
    enabled: !!orgId && !!userId && !!documentId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
