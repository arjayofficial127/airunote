/**
 * Hook for updating a document (content, name, or move)
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';
import type { UpdateDocumentRequest, AiruDocument, AiruDocumentMetadata } from '../types';

export function useUpdateDocument() {
  const store = useAirunoteStore.getState();

  return useMutation<AiruDocument, Error, { documentId: string; request: UpdateDocumentRequest }>({
    mutationFn: async ({ documentId, request }) => {
      const response = await airunoteApi.updateDocument(documentId, request);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update document');
      }
      return response.data.document;
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to update document', 'error');
    },
    onSuccess: (data) => {
      // Update store with updated document
      const documentMetadata: AiruDocumentMetadata = {
        id: data.id,
        folderId: data.folderId,
        ownerUserId: data.ownerUserId,
        type: data.type,
        name: data.name,
        visibility: data.visibility,
        state: data.state,
        attributes: data.attributes || {}, // Phase 7: Hybrid Attribute Engine
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      store.updateDocumentMetadata(documentMetadata);
      
      // Update document content in content store
      store.setDocumentContent(data);
      
      toast('Document updated successfully', 'success');
    },
  });
}
