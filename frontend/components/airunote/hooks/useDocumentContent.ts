/**
 * Hook to fetch and cache document content
 * Fetches only if not already in ContentStore
 */

import { useEffect, useState } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '../stores/airunoteStore';
import { airunoteApi } from '../services/airunoteApi';
import type { AiruDocument } from '../types';

export function useDocumentContent(documentId: string | null) {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  const {
    getDocumentContentById,
    isDocumentContentLoaded,
    isDocumentLoading,
    setDocumentContent,
    setDocumentLoading,
  } = useAirunoteStore();

  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId || !orgId || !userId) {
      return;
    }

    // If already loaded, don't refetch
    if (isDocumentContentLoaded(documentId)) {
      setError(null);
      return;
    }

    // If already loading, don't start another request (prevents double fetch)
    if (isDocumentLoading(documentId)) {
      return;
    }

    // Fetch from API and insert into ContentStore
    const fetchContent = async () => {
      setDocumentLoading(documentId, true);
      setError(null);

      try {
        const response = await airunoteApi.getDocument(documentId, orgId, userId);
        if (response.success) {
          // Insert into ContentStore
          setDocumentContent(response.data.document);
        } else {
          const err = new Error(response.error?.message || 'Failed to load document');
          setError(err);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load document');
        setError(error);
      } finally {
        setDocumentLoading(documentId, false);
      }
    };

    fetchContent();
  }, [
    documentId,
    orgId,
    userId,
    isDocumentContentLoaded,
    isDocumentLoading,
    setDocumentContent,
    setDocumentLoading,
  ]);

  const document = documentId ? getDocumentContentById(documentId) : null;
  const isLoading = documentId ? isDocumentLoading(documentId) : false;

  return {
    document,
    isLoading,
    error,
  };
}
