/**
 * Airunote Metadata Context
 * Centralized in-memory store for full folder and document metadata
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useFullMetadata } from '../hooks/useFullMetadata';
import type { AiruFolder, AiruDocumentMetadata } from '../types';

interface AirunoteMetadataState {
  folders: AiruFolder[];
  documents: AiruDocumentMetadata[];
  isLoading: boolean;
  error: Error | null;
  lastFetched: Date | null;
}

interface AirunoteMetadataContextValue extends AirunoteMetadataState {
  refetch: () => void;
  getFolderById: (folderId: string) => AiruFolder | undefined;
  getDocumentById: (documentId: string) => AiruDocumentMetadata | undefined;
  getFoldersByParent: (parentFolderId: string) => AiruFolder[];
  getDocumentsByFolder: (folderId: string) => AiruDocumentMetadata[];
}

const AirunoteMetadataContext = createContext<AirunoteMetadataContextValue | null>(null);

export function AirunoteMetadataProvider({ children }: { children: React.ReactNode }) {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  // Fetch full metadata
  const { data, isLoading, error, refetch: refetchQuery } = useFullMetadata(orgId ?? null, userId ?? null);

  const [state, setState] = useState<AirunoteMetadataState>({
    folders: [],
    documents: [],
    isLoading: false,
    error: null,
    lastFetched: null,
  });

  // Update state when data changes
  useEffect(() => {
    if (data) {
      setState({
        folders: data.folders,
        documents: data.documents,
        isLoading: false,
        error: null,
        lastFetched: new Date(),
      });
    } else if (isLoading) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    } else if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error as Error }));
    }
  }, [data, isLoading, error]);

  // Reset state when org or user changes
  useEffect(() => {
    if (!orgId || !userId) {
      setState({
        folders: [],
        documents: [],
        isLoading: false,
        error: null,
        lastFetched: null,
      });
    }
  }, [orgId, userId]);

  const refetch = useCallback(() => {
    refetchQuery();
  }, [refetchQuery]);

  const getFolderById = useCallback(
    (folderId: string): AiruFolder | undefined => {
      return state.folders.find((f) => f.id === folderId);
    },
    [state.folders]
  );

  const getDocumentById = useCallback(
    (documentId: string): AiruDocumentMetadata | undefined => {
      return state.documents.find((d) => d.id === documentId);
    },
    [state.documents]
  );

  const getFoldersByParent = useCallback(
    (parentFolderId: string): AiruFolder[] => {
      return state.folders.filter((f) => f.parentFolderId === parentFolderId);
    },
    [state.folders]
  );

  const getDocumentsByFolder = useCallback(
    (folderId: string): AiruDocumentMetadata[] => {
      return state.documents.filter((d) => d.folderId === folderId);
    },
    [state.documents]
  );

  const value: AirunoteMetadataContextValue = {
    ...state,
    refetch,
    getFolderById,
    getDocumentById,
    getFoldersByParent,
    getDocumentsByFolder,
  };

  return (
    <AirunoteMetadataContext.Provider value={value}>
      {children}
    </AirunoteMetadataContext.Provider>
  );
}

export function useAirunoteMetadata(): AirunoteMetadataContextValue {
  const context = useContext(AirunoteMetadataContext);
  if (!context) {
    throw new Error('useAirunoteMetadata must be used within AirunoteMetadataProvider');
  }
  return context;
}
