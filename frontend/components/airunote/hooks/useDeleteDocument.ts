/**
 * Hook for deleting a document
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';

export function useDeleteDocument() {
  const store = useAirunoteStore.getState();

  return useMutation<void, Error, { documentId: string; orgId: string; userId: string; folderId: string }>({
    mutationFn: async ({ documentId, orgId, userId }) => {
      const response = await airunoteApi.deleteDocument(documentId, orgId, userId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete document');
      }
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to delete document', 'error');
    },
    onSuccess: (data, variables) => {
      // Update store - remove document
      store.removeDocument(variables.documentId);
      store.removeDocumentContent(variables.documentId);
      toast('Document deleted successfully', 'success');
    },
  });
}
