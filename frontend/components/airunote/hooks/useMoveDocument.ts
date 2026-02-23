/**
 * Hook for moving a document
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';
import type { AiruDocument, AiruDocumentMetadata } from '../types';

export function useMoveDocument() {
  const store = useAirunoteStore.getState();

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
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to move document', 'error');
    },
    onSuccess: (data) => {
      // Update store with moved document
      const documentMetadata: AiruDocumentMetadata = {
        id: data.id,
        folderId: data.folderId,
        ownerUserId: data.ownerUserId,
        type: data.type,
        name: data.name,
        visibility: data.visibility,
        state: data.state,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        attributes: data.attributes || {},
      };
      store.updateDocumentMetadata(documentMetadata);
      store.setDocumentContent(data);
      toast('Document moved successfully', 'success');
    },
  });
}
