/**
 * Hook for moving a document
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getDocumentCacheKey, getTreeInvalidationKeys, getFolderDocumentsCacheKey } from '../services/airunoteCache';
import { toast } from '@/lib/toast';
import type { AiruDocument } from '../types';

export function useMoveDocument() {
  const queryClient = useQueryClient();

  return useMutation<
    AiruDocument,
    Error,
    { documentId: string; orgId: string; userId: string; newFolderId: string; oldFolderId: string }
  >({
    mutationFn: async ({ documentId, orgId, userId, newFolderId }) => {
      const response = await airunoteApi.updateDocument(documentId, {
        orgId,
        userId,
        folderId: newFolderId,
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to move document');
      }
      return response.data.document;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries for both old and new folders
      queryClient.invalidateQueries({
        queryKey: getFolderDocumentsCacheKey(variables.orgId, variables.userId, variables.oldFolderId),
      });
      queryClient.invalidateQueries({
        queryKey: getFolderDocumentsCacheKey(variables.orgId, variables.userId, variables.newFolderId),
      });
      queryClient.invalidateQueries({
        queryKey: getDocumentCacheKey(variables.orgId, variables.userId, variables.documentId),
      });

      // Invalidate all tree queries
      const invalidationKeys = getTreeInvalidationKeys(variables.orgId, variables.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast('Document moved successfully', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to move document', 'error');
    },
  });
}
