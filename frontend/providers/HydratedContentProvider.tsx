'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { postsApi, type Post } from '@/lib/api/posts';

/**
 * Hydrated Content Provider status lifecycle
 * 'idle' → 'loading' → 'ready' | 'error'
 */
type HydratedContentStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Entity types that can be hydrated
 */
export type HydratedEntityType = 'post';

/**
 * Hydrated record with metadata
 */
interface HydratedRecord<T> {
  data: T;
  hydratedAt: string; // ISO timestamp
  lastKnownUpdatedAt: string; // ISO timestamp from entity
}

/**
 * Hydrated content state
 */
interface HydratedContentState {
  status: HydratedContentStatus;
  hydrated: {
    post: Record<string, HydratedRecord<Post>>;
  };
  error: string | null;
}

/**
 * Hydrated content context value
 */
interface HydratedContentContextValue {
  status: HydratedContentStatus;
  hydrate: (entityType: HydratedEntityType, id: string) => Promise<void>;
  getHydrated: <T>(entityType: HydratedEntityType, id: string) => T | null;
  isHydrated: (entityType: HydratedEntityType, id: string) => boolean;
  isHydrating: (entityType: HydratedEntityType, id: string) => boolean;
  clearHydrated: () => void;
  clearEntity: (entityType: HydratedEntityType, id: string) => void;
  error: string | null;
}

const HydratedContentContext = createContext<HydratedContentContextValue | null>(null);

/**
 * Hydrated Content Provider
 * 
 * Manages in-memory cache of fully hydrated entities (pages, posts, documents).
 * Hydration happens ONLY on explicit user intent (open, edit, preview).
 * 
 * Rules:
 * - NO persistence (memory only)
 * - Resets on org change or logout
 * - Deduplicates in-flight requests
 * - Guards against null activeOrgId
 */
export function HydratedContentProvider({ children }: { children: React.ReactNode }) {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  
  const [state, setState] = useState<HydratedContentState>({
    status: 'idle',
    hydrated: {
      post: {},
    },
    error: null,
  });

  // Request deduplication: cache in-flight request promise per (entityType + id)
  const inFlightRequestsRef = useRef<Record<string, Promise<void>>>({});
  
  // Track current activeOrgId to detect changes
  const activeOrgIdRef = useRef<string | null>(null);
  
  // Track current hydrated state for cache-first checks (avoid recreating callbacks)
  const hydratedRef = useRef<HydratedContentState['hydrated']>(state.hydrated);
  
  // Track previous authInvalidateKey to detect changes
  const previousAuthInvalidateKeyRef = useRef<number>(authSession.authInvalidateKey);
  
  // Keep refs in sync with state
  useEffect(() => {
    activeOrgIdRef.current = orgSession.activeOrgId;
  }, [orgSession.activeOrgId]);
  
  useEffect(() => {
    hydratedRef.current = state.hydrated;
  }, [state.hydrated]);

  // Reset on auth invalidation (Phase 2.5)
  useEffect(() => {
    // Check if auth was invalidated
    if (authSession.authInvalidateKey !== previousAuthInvalidateKeyRef.current) {
      previousAuthInvalidateKeyRef.current = authSession.authInvalidateKey;
      
      // FULLY reset state on auth invalidation
      setState({
        status: 'idle',
        hydrated: {
          post: {},
        },
        error: null,
      });
      // Clear in-flight requests
      inFlightRequestsRef.current = {};
      // Clear refs
      activeOrgIdRef.current = null;
      hydratedRef.current = {
        post: {},
      };
    }
  }, [authSession.authInvalidateKey]);

  /**
   * Hydrate a specific entity
   * 
   * - Cache-first: Returns immediately if entity already hydrated
   * - If request is in-flight, waits for it
   * - Otherwise creates new request and stores it
   * - Guards against null activeOrgId
   * - Deduplicates per (entityType + id)
   */
  const hydrate = useCallback(async (entityType: HydratedEntityType, id: string) => {
    const requestKey = `${entityType}:${id}`;
    
    // Cache-first: Check if entity is already hydrated
    // Use ref to avoid recreating callback on every state change
    const existingRecord = hydratedRef.current[entityType]?.[id];
    if (existingRecord) {
      // Entity already hydrated, return immediately (cache-first navigation)
      return;
    }
    
    // If there's already an in-flight request, wait for it
    const existingRequest = inFlightRequestsRef.current[requestKey];
    if (existingRequest) {
      await existingRequest;
      return;
    }

    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    // This ensures session authority and routing lock are respected
    const orgId = activeOrgIdRef.current;
    if (!orgId) {
      console.warn('[HydratedContentProvider] Cannot hydrate: activeOrgId is null');
      return;
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        setState((prev) => ({ ...prev, status: 'loading', error: null }));

        let hydratedData: Post;
        let updatedAt: string;

        switch (entityType) {
          case 'post': {
            const res = await postsApi.getById(orgId, id);
            hydratedData = res.data;
            updatedAt = res.data.updatedAt;
            break;
          }
          default: {
            throw new Error(`Unknown entity type: ${entityType}`);
          }
        }

        // Store hydrated data
        setState((prev) => ({
          ...prev,
          hydrated: {
            ...prev.hydrated,
            [entityType]: {
              ...prev.hydrated[entityType],
              [id]: {
                data: hydratedData,
                hydratedAt: new Date().toISOString(),
                lastKnownUpdatedAt: updatedAt,
              },
            },
          },
          status: 'ready',
        }));
      } catch (err: any) {
        console.error(`[HydratedContentProvider] Failed to hydrate ${entityType} ${id}:`, err);
        setState((prev) => ({
          ...prev,
          error: err.response?.data?.error?.message || `Failed to hydrate ${entityType}`,
          status: 'error',
        }));
      } finally {
        // Clear in-flight request
        delete inFlightRequestsRef.current[requestKey];
      }
    })();

    // Store in-flight request
    inFlightRequestsRef.current[requestKey] = requestPromise;
    await requestPromise;
  }, []);

  /**
   * Get hydrated entity
   */
  const getHydrated = useCallback(<T,>(entityType: HydratedEntityType, id: string): T | null => {
    const record = state.hydrated[entityType]?.[id];
    if (!record) {
      return null;
    }
    return record.data as T;
  }, [state.hydrated]);

  /**
   * Check if entity is hydrated
   */
  const isHydrated = useCallback((entityType: HydratedEntityType, id: string): boolean => {
    return !!state.hydrated[entityType]?.[id];
  }, [state.hydrated]);

  /**
   * Check if entity is currently being hydrated
   */
  const isHydrating = useCallback((entityType: HydratedEntityType, id: string): boolean => {
    const requestKey = `${entityType}:${id}`;
    return !!inFlightRequestsRef.current[requestKey];
  }, []);

  /**
   * Clear all hydrated data
   * Called on org change or logout
   */
  const clearHydrated = useCallback(() => {
    setState({
      status: 'idle',
      hydrated: {
        post: {},
      },
      error: null,
    });
    // Clear all in-flight requests
    inFlightRequestsRef.current = {};
  }, []);

  /**
   * Clear a specific entity
   */
  const clearEntity = useCallback((entityType: HydratedEntityType, id: string) => {
    setState((prev) => {
      const newHydrated = { ...prev.hydrated };
      const entityHydrated = { ...newHydrated[entityType] };
      delete entityHydrated[id];
      return {
        ...prev,
        hydrated: {
          ...newHydrated,
          [entityType]: entityHydrated,
        },
      };
    });
  }, []);

  // Reset hydrated data when activeOrgId changes
  useEffect(() => {
    const currentOrgId = orgSession.activeOrgId;
    const previousOrgId = activeOrgIdRef.current;
    
    if (previousOrgId !== null && currentOrgId !== previousOrgId) {
      // Org changed - clear all hydrated data
      clearHydrated();
    }
  }, [orgSession.activeOrgId, clearHydrated]);

  // Reset hydrated data when user logs out
  useEffect(() => {
    if (authSession.status === 'ready' && !authSession.user) {
      // User logged out - clear all hydrated data
      clearHydrated();
    }
  }, [authSession.status, authSession.user, clearHydrated]);

  const value: HydratedContentContextValue = {
    status: state.status,
    hydrate,
    getHydrated,
    isHydrated,
    isHydrating,
    clearHydrated,
    clearEntity,
    error: state.error,
  };

  return (
    <HydratedContentContext.Provider value={value}>
      {children}
    </HydratedContentContext.Provider>
  );
}

/**
 * Hook to access hydrated content
 * 
 * Throws if used outside HydratedContentProvider
 */
export function useHydratedContent(): HydratedContentContextValue {
  const context = useContext(HydratedContentContext);
  if (!context) {
    throw new Error('useHydratedContent must be used within HydratedContentProvider');
  }
  return context;
}
