/**
 * AirunoteDataProvider
 * 
 * SINGLE source of truth for Airunote metadata loading.
 * 
 * Responsibilities:
 * - Load ALL folders and documents metadata ONCE when entering Airunote
 * - Clear and reload when orgId/userId changes
 * - Provide loading state to children
 * 
 * Rules:
 * - Loads metadata ONCE per org/user session
 * - Clears store when org/user changes
 * - NO API calls after initial load (all navigation uses store)
 */

'use client';

import { useEffect, useRef } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '../stores/airunoteStore';
import { airunoteApi } from '../services/airunoteApi';

interface AirunoteDataProviderProps {
  children: React.ReactNode;
}

export function AirunoteDataProvider({ children }: AirunoteDataProviderProps) {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  const { 
    setMetadata, 
    setLoading, 
    setError, 
    isLoading, 
    lastFetched, 
    clear,
    foldersById 
  } = useAirunoteStore();

  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  // Track previous orgId/userId to detect changes
  const previousContextRef = useRef<{ orgId: string | null; userId: string | null }>({
    orgId: null,
    userId: null,
  });

  // Track if we've already initiated a load in this session
  const loadInitiatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!orgId || !userId) {
      // Clear store if org/user becomes unavailable
      const prevContext = previousContextRef.current;
      if (prevContext.orgId || prevContext.userId) {
        clear();
        previousContextRef.current = { orgId: null, userId: null };
        loadInitiatedRef.current = false;
      }
      return;
    }

    // Check if orgId or userId changed
    const contextChanged =
      previousContextRef.current.orgId !== orgId ||
      previousContextRef.current.userId !== userId;

    // If context changed, clear store first and reset load flag
    if (contextChanged) {
      clear();
      previousContextRef.current = { orgId, userId };
      loadInitiatedRef.current = false;
    }

    // Only load if not already loading
    if (isLoading) {
      return;
    }

    // Check if we already have data in the store
    const hasData = foldersById.size > 0 && lastFetched !== null;

    // Only fetch if:
    // 1. Context changed (orgId/userId changed) - we already cleared above
    // 2. We don't have data in the store (no folders loaded yet)
    // 3. We haven't already initiated a load in this session
    if ((contextChanged || !hasData) && !loadInitiatedRef.current) {
      // Mark as initiated to prevent duplicate calls
      loadInitiatedRef.current = true;

      const loadMetadata = async () => {
        setLoading(true);
        setError(null);

        try {
          const response = await airunoteApi.getFullMetadata(orgId, userId);
          if (response.success) {
            setMetadata(response.data.folders, response.data.documents);
          } else {
            setError(new Error(response.error?.message || 'Failed to load metadata'));
          }
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to load metadata'));
        } finally {
          setLoading(false);
        }
      };

      loadMetadata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId, setMetadata, setLoading, setError, isLoading, lastFetched, clear]);

  return <>{children}</>;
}
