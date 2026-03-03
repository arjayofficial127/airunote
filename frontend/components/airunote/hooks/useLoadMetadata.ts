/**
 * Hook to load full metadata into store on mount
 * Automatically clears and reloads when orgId or userId changes
 */

import { useEffect, useRef } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '../stores/airunoteStore';
import { airunoteApi } from '../services/airunoteApi';

export function useLoadMetadata() {
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

  // Track if we've already initiated a load in this session (prevents duplicate calls on route changes)
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

    // Only load if not already loading and (never loaded OR context changed)
    if (isLoading) {
      return;
    }

    // Check if we already have data in the store (more reliable than just lastFetched)
    // Use foldersById.size to verify we actually have data, not just a timestamp
    const hasData = foldersById.size > 0 && lastFetched !== null;

    // Only fetch if:
    // 1. Context changed (orgId/userId changed) - we already cleared above, so we need to reload
    // 2. We don't have data in the store (no folders loaded yet)
    // 3. We haven't already initiated a load in this session (prevents duplicate calls on route changes)
    if ((contextChanged || !hasData) && !loadInitiatedRef.current) {
      // Mark as initiated to prevent duplicate calls
      loadInitiatedRef.current = true;

      const loadMetadata = async () => {
        setLoading(true);
        setError(null);

        try {
          const response = await airunoteApi.getFullMetadata(orgId, userId);
          if (response.success) {
            setMetadata(response.data.folders, response.data.documents, response.data.lensCounts || {});
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
  // Note: foldersById is intentionally excluded from deps to avoid unnecessary re-runs
  // We check it inline to verify data exists, but don't want to re-run when Map reference changes
}
