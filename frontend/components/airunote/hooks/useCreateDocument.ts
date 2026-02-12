/**
 * Hook for creating a document with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getTreeCacheKey, getFolderDocumentsCacheKey, getTreeInvalidationKeys } from '../services/airunoteCache';
import { toast } from '@/lib/toast';
import type { CreateDocumentRequest, AiruDocument } from '../types';

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation<AiruDocument, Error, CreateDocumentRequest>({
    mutationFn: async (request) => {
      const response = await airunoteApi.createDocument(request);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create document');
      }
      return response.data.document;
    },
    onMutate: async (request) => {
      // Cancel outgoing refetches
      const treeKey = getTreeCacheKey(request.orgId, request.userId, request.folderId);
      const documentsKey = getFolderDocumentsCacheKey(request.orgId, request.userId, request.folderId);
      
      await Promise.all([
        queryClient.cancelQueries({ queryKey: treeKey }),
        queryClient.cancelQueries({ queryKey: documentsKey }),
      ]);

      // Snapshot previous values
      const previousTree = queryClient.getQueryData<{ folders: any[]; documents: AiruDocument[]; children: any[] }>(treeKey);
      const previousDocuments = queryClient.getQueryData<AiruDocument[]>(documentsKey);

      // Optimistically update
      const optimisticDocument: AiruDocument = {
        id: 'temp-' + Date.now(), // Temporary ID
        folderId: request.folderId,
        ownerUserId: request.userId,
        type: request.type,
        name: request.name,
        content: request.content,
        visibility: 'private',
        state: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (previousTree) {
        queryClient.setQueryData(treeKey, {
          ...previousTree,
          documents: [...previousTree.documents, optimisticDocument],
        });
      }

      if (previousDocuments) {
        queryClient.setQueryData(documentsKey, [...previousDocuments, optimisticDocument]);
      }

      return { previousTree, previousDocuments };
    },
    onError: (error, request, context) => {
      // Rollback on error
      const treeKey = getTreeCacheKey(request.orgId, request.userId, request.folderId);
      const documentsKey = getFolderDocumentsCacheKey(request.orgId, request.userId, request.folderId);
      
      if (context?.previousTree) {
        queryClient.setQueryData(treeKey, context.previousTree);
      }
      if (context?.previousDocuments) {
        queryClient.setQueryData(documentsKey, context.previousDocuments);
      }
      toast(error instanceof Error ? error.message : 'Failed to create document', 'error');
    },
    onSuccess: (data, request) => {
      // Invalidate queries to refetch with real data
      const invalidationKeys = getTreeInvalidationKeys(request.orgId, request.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: getFolderDocumentsCacheKey(request.orgId, request.userId, request.folderId) });
      toast(`Document "${data.name}" created successfully`, 'success');
    },
  });
}
