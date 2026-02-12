/**
 * Hook for deleting a document with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { getDocumentCacheKey, getTreeCacheKey, getFolderDocumentsCacheKey, getTreeInvalidationKeys } from '../services/airunoteCache';
import { toast } from '@/lib/toast';

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { documentId: string; orgId: string; userId: string; folderId: string }>({
    mutationFn: async ({ documentId, orgId, userId }) => {
      const response = await airunoteApi.deleteDocument(documentId, orgId, userId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete document');
      }
    },
    onMutate: async ({ documentId, orgId, userId, folderId }) => {
      // Cancel outgoing refetches
      const documentKey = getDocumentCacheKey(orgId, userId, documentId);
      const treeKey = getTreeCacheKey(orgId, userId, folderId);
      const documentsKey = getFolderDocumentsCacheKey(orgId, userId, folderId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: documentKey }),
        queryClient.cancelQueries({ queryKey: treeKey }),
        queryClient.cancelQueries({ queryKey: documentsKey }),
      ]);

      // Snapshot previous values
      const previousDocument = queryClient.getQueryData(documentKey);
      const previousTree = queryClient.getQueryData<{ folders: any[]; documents: any[]; children: any[] }>(treeKey);
      const previousDocuments = queryClient.getQueryData<any[]>(documentsKey);

      // Optimistically remove document
      if (previousTree) {
        queryClient.setQueryData(treeKey, {
          ...previousTree,
          documents: previousTree.documents.filter((d) => d.id !== documentId),
        });
      }

      if (previousDocuments) {
        queryClient.setQueryData(documentsKey, previousDocuments.filter((d) => d.id !== documentId));
      }

      return { previousDocument, previousTree, previousDocuments };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      const documentKey = getDocumentCacheKey(variables.orgId, variables.userId, variables.documentId);
      const treeKey = getTreeCacheKey(variables.orgId, variables.userId, variables.folderId);
      const documentsKey = getFolderDocumentsCacheKey(variables.orgId, variables.userId, variables.folderId);

      if (context?.previousDocument) {
        queryClient.setQueryData(documentKey, context.previousDocument);
      }
      if (context?.previousTree) {
        queryClient.setQueryData(treeKey, context.previousTree);
      }
      if (context?.previousDocuments) {
        queryClient.setQueryData(documentsKey, context.previousDocuments);
      }
      toast(error instanceof Error ? error.message : 'Failed to delete document', 'error');
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch
      const documentKey = getDocumentCacheKey(variables.orgId, variables.userId, variables.documentId);
      queryClient.removeQueries({ queryKey: documentKey }); // Remove deleted document

      const invalidationKeys = getTreeInvalidationKeys(variables.orgId, variables.userId);
      invalidationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({
        queryKey: getFolderDocumentsCacheKey(variables.orgId, variables.userId, variables.folderId),
      });
      toast('Document deleted successfully', 'success');
    },
  });
}
