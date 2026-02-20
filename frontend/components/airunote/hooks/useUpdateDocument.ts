/**
 * Hook for updating a document (content, name, or move)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getDocumentCacheKey, getTreeInvalidationKeys, getFolderDocumentsCacheKey } from '../services/airunoteCache';
import { toast } from '@/lib/toast';
import type { UpdateDocumentRequest, AiruDocument } from '../types';

interface UpdateDocumentContext {
  previousDocument?: AiruDocument;
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation<AiruDocument, Error, { documentId: string; request: UpdateDocumentRequest }, UpdateDocumentContext>({
    mutationFn: async ({ documentId, request }) => {
      const response = await airunoteApi.updateDocument(documentId, request);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update document');
      }
      return response.data.document;
    },
    onMutate: async ({ documentId, request }) => {
      // Cancel outgoing refetches
      const documentKey = getDocumentCacheKey(request.orgId, request.userId, documentId);
      await queryClient.cancelQueries({ queryKey: documentKey });

      // Snapshot previous value
      const previousDocument = queryClient.getQueryData<AiruDocument>(documentKey);

      // Optimistically update
      if (previousDocument) {
        const updated: AiruDocument = {
          ...previousDocument,
          ...(request.content !== undefined && { content: request.content }),
          ...(request.name !== undefined && { name: request.name }),
          ...(request.folderId !== undefined && { folderId: request.folderId }),
          updatedAt: new Date(),
        };
        queryClient.setQueryData(documentKey, updated);
      }

      return { previousDocument };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousDocument) {
        const documentKey = getDocumentCacheKey(
          variables.request.orgId,
          variables.request.userId,
          variables.documentId
        );
        queryClient.setQueryData(documentKey, context.previousDocument);
      }
      toast(error instanceof Error ? error.message : 'Failed to update document', 'error');
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch with real data
      const { request } = variables;
      queryClient.invalidateQueries({
        queryKey: getDocumentCacheKey(request.orgId, request.userId, variables.documentId),
      });
      
      // If moved, invalidate both old and new folder queries
      if (request.folderId) {
        queryClient.invalidateQueries({
          queryKey: getFolderDocumentsCacheKey(request.orgId, request.userId, request.folderId),
        });
      }
      
      const invalidationKeys = getTreeInvalidationKeys(request.orgId, request.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast('Document updated successfully', 'success');
    },
  });
}
