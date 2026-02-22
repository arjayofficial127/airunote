/**
 * Hook for creating a document
 * Updates Zustand store directly - no React Query needed
 */

import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';
import type { CreateDocumentRequest, AiruDocument, AiruDocumentMetadata } from '../types';

export function useCreateDocument() {
  const store = useAirunoteStore.getState();

  return useMutation<AiruDocument, Error, CreateDocumentRequest>({
    mutationFn: async (request) => {
      const response = await airunoteApi.createDocument(request);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create document');
      }
      return response.data.document;
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to create document', 'error');
    },
    onSuccess: (data) => {
      // Update store with new document metadata
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
      };
      store.addDocument(documentMetadata);
      
      // Also store full document content in content store
      store.setDocumentContent(data);
      
      toast(`Document "${data.name}" created successfully`, 'success');
    },
  });
}
