'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { postsApi, type Post } from '@/lib/api/posts';
import { collectionsApi, type Collection } from '@/lib/api/collections';
import { filesApi, type OrgFile } from '@/lib/api/files';

/**
 * Metadata Index status lifecycle
 * 'idle' → 'loading' → 'ready' | 'error'
 */
type MetadataIndexStatus = 'idle' | 'loading' | 'ready' | 'error';


/**
 * Lightweight post metadata (NO body, NO attachments, NO comments)
 */
export interface PostMetadata {
  id: string;
  orgId: string;
  authorUserId: string;
  title: string;
  isPublished: boolean;
  updatedAt: string;
  createdAt: string;
}

/**
 * Collection metadata (already lightweight)
 */
export interface CollectionMetadata {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  visibility: 'private' | 'org' | 'public';
  updatedAt: string;
  createdAt: string;
}

/**
 * File metadata (NO content blobs)
 */
export interface FileMetadata {
  id: string;
  orgId: string;
  ownerUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: 'private' | 'org' | 'public' | 'users';
  updatedAt: string;
  createdAt: string;
}


/**
 * Entity type keys for metadata index
 */
export type MetadataKey = 'posts' | 'collections' | 'files';

/**
 * Metadata index state shape
 */
interface MetadataIndexState {
  status: MetadataIndexStatus;
  activeOrgId: string | null; // For debugging
  index: {
    posts: PostMetadata[];
    collections: CollectionMetadata[];
    files: FileMetadata[];
  };
  error: string | null;
}

/**
 * Metadata index context value
 */
interface MetadataIndexContextValue extends MetadataIndexState {
  refreshAll: () => Promise<void>;
  refreshKey: (key: MetadataKey) => Promise<void>;
}

const MetadataIndexContext = createContext<MetadataIndexContextValue | null>(null);


/**
 * Extract lightweight post metadata from full Post
 */
function extractPostMetadata(post: Post): PostMetadata {
  return {
    id: post.id,
    orgId: post.orgId,
    authorUserId: post.authorUserId,
    title: post.title,
    isPublished: post.isPublished,
    updatedAt: post.updatedAt,
    createdAt: post.createdAt,
  };
}

/**
 * Extract collection metadata (already lightweight)
 */
function extractCollectionMetadata(collection: Collection): CollectionMetadata {
  return {
    id: collection.id,
    orgId: collection.orgId,
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    icon: collection.icon,
    color: collection.color,
    visibility: collection.visibility,
    updatedAt: collection.updatedAt,
    createdAt: collection.createdAt,
  };
}

/**
 * Extract file metadata (NO content blobs)
 */
function extractFileMetadata(file: OrgFile): FileMetadata {
  return {
    id: file.id,
    orgId: file.orgId,
    ownerUserId: file.ownerUserId,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    visibility: file.visibility,
    updatedAt: file.updatedAt,
    createdAt: file.createdAt,
  };
}


/**
 * MetadataIndexProvider
 * 
 * SINGLE authoritative source for metadata index state.
 * 
 * Responsibilities (ONLY THIS PROVIDER MAY):
 * - Call list APIs to load metadata
 * - Extract lightweight metadata fields (NO layout, NO body, NO content)
 * - Own metadata lifecycle
 * - Reset state when:
 *   - active org changes
 *   - user logs out
 * 
 * Provider rules (NON-NEGOTIABLE):
 * - MUST consume useOrgSession()
 * - MUST NOT call auth APIs
 * - MUST NOT call org APIs
 * - MUST fetch metadata ONLY when:
 *   - orgSession.status === 'ready'
 *   - activeOrgId is not null
 * - MUST deduplicate in-flight requests
 * - MUST clear state when activeOrgId changes
 * - MUST extract only lightweight fields (NO layout, NO body, NO content blobs)
 */
export function MetadataIndexProvider({ children }: { children: React.ReactNode }) {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  
  const [status, setStatus] = useState<MetadataIndexStatus>('idle');
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [index, setIndex] = useState<MetadataIndexState['index']>({
    posts: [],
    collections: [],
    files: [],
  });
  const [error, setError] = useState<string | null>(null);

  // Request deduplication: cache in-flight request promise per key
  const inFlightRequestsRef = useRef<Record<string, Promise<void>>>({});
  
  // Track current activeOrgId to detect changes
  const activeOrgIdRef = useRef<string | null>(null);
  
  // Track current index state for cache-first checks (avoid recreating callbacks)
  const indexRef = useRef<MetadataIndexState['index']>(index);
  
  // Track previous authInvalidateKey to detect changes
  const previousAuthInvalidateKeyRef = useRef<number>(authSession.authInvalidateKey);
  
  // Keep refs in sync with state
  useEffect(() => {
    activeOrgIdRef.current = orgSession.activeOrgId;
  }, [orgSession.activeOrgId]);
  
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Reset on auth invalidation (Phase 2.5)
  useEffect(() => {
    // Check if auth was invalidated
    if (authSession.authInvalidateKey !== previousAuthInvalidateKeyRef.current) {
      previousAuthInvalidateKeyRef.current = authSession.authInvalidateKey;
      
      // FULLY reset state on auth invalidation
      setStatus('idle');
      setActiveOrgId(null);
      setIndex({
        posts: [],
        collections: [],
        files: [],
      });
      setError(null);
      // Clear in-flight requests
      inFlightRequestsRef.current = {};
      // Clear refs
      activeOrgIdRef.current = null;
      indexRef.current = {
        posts: [],
        collections: [],
        files: [],
      };
    }
  }, [authSession.authInvalidateKey]);

  /**
   * Load metadata for a specific key
   * 
   * - Cache-first: Returns immediately if data already exists
   * - If request is in-flight, waits for it
   * - Otherwise creates new request and stores it
   * - Extracts only lightweight metadata fields
   * - Safe for SSR/SSG (catches all errors)
   */
  const loadMetadataKey = useCallback(async (orgId: string, key: MetadataKey) => {
    const requestKey = `${orgId}:${key}`;
    
    // Cache-first: Check if data already exists for this key
    // Use ref to avoid recreating callback on every state change
    const hasData = (() => {
      const currentIndex = indexRef.current;
      switch (key) {
        case 'posts':
          return currentIndex.posts.length > 0;
        case 'collections':
          return currentIndex.collections.length > 0;
        case 'files':
          return currentIndex.files.length > 0;
        default:
          return false;
      }
    })();

    // If data exists and orgId matches, return immediately (cache-first)
    if (hasData && activeOrgIdRef.current === orgId) {
      return;
    }
    
    // If there's already an in-flight request, wait for it
    const existingRequest = inFlightRequestsRef.current[requestKey];
    if (existingRequest) {
      await existingRequest;
      return;
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
        // This ensures session authority and routing lock are respected
        if (!orgId) {
          return;
        }

        switch (key) {
          case 'posts': {
            const res = await postsApi.list(orgId).catch((err) => {
              console.error('[MetadataIndexProvider] Failed to load posts:', err);
              return { success: false, data: [] };
            });
            const postsMetadata = (res.success ? res.data : []).map(extractPostMetadata);
            setIndex((prev) => ({ ...prev, posts: postsMetadata }));
            break;
          }
          case 'collections': {
            const res = await collectionsApi.list(orgId).catch((err) => {
              console.error('[MetadataIndexProvider] Failed to load collections:', err);
              return { success: false, data: [] };
            });
            const collectionsMetadata = (res.success ? res.data : []).map(extractCollectionMetadata);
            setIndex((prev) => ({ ...prev, collections: collectionsMetadata }));
            break;
          }
          case 'files': {
            const files = await filesApi.list(orgId).catch((err) => {
              console.error('[MetadataIndexProvider] Failed to load files:', err);
              return [];
            });
            const filesMetadata = files.map(extractFileMetadata);
            setIndex((prev) => ({ ...prev, files: filesMetadata }));
            break;
          }
        }
      } catch (err: any) {
        console.error(`[MetadataIndexProvider] Failed to load ${key}:`, err);
        // Don't set error state for individual key failures, just log
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
   * Load all metadata
   * 
   * - If request is in-flight, waits for it
   * - Otherwise creates new request and stores it
   * - Extracts only lightweight metadata fields
   */
  const loadAllMetadata = useCallback(async (orgId: string) => {
    const requestKey = `${orgId}:all`;
    
    // If there's already an in-flight request, wait for it
    const existingRequest = inFlightRequestsRef.current[requestKey];
    if (existingRequest) {
      await existingRequest;
      return;
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        setStatus('loading');
        setError(null);

        // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
        // This ensures session authority and routing lock are respected
        if (!orgId) {
          setStatus('idle');
          return;
        }

        // Load all metadata in parallel
        await Promise.all([
          loadMetadataKey(orgId, 'posts'),
          loadMetadataKey(orgId, 'collections'),
          loadMetadataKey(orgId, 'files'),
        ]);

        setStatus('ready');
      } catch (err: any) {
        console.error('[MetadataIndexProvider] Failed to load metadata:', err);
        setError(err.response?.data?.error?.message || 'Failed to load metadata');
        setStatus('error');
      } finally {
        // Clear in-flight request
        delete inFlightRequestsRef.current[requestKey];
      }
    })();

    // Store in-flight request
    inFlightRequestsRef.current[requestKey] = requestPromise;
    await requestPromise;
  }, [loadMetadataKey]);

  /**
   * Refresh all metadata
   */
  const refreshAll = useCallback(async () => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    // This ensures session authority and routing lock are respected
    if (!orgSession.activeOrgId) {
      return;
    }
    // Clear in-flight requests to force new calls
    inFlightRequestsRef.current = {};
    await loadAllMetadata(orgSession.activeOrgId);
  }, [orgSession.activeOrgId, loadAllMetadata]);

  /**
   * Refresh a specific metadata key
   */
  const refreshKey = useCallback(async (key: MetadataKey) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    // This ensures session authority and routing lock are respected
    if (!orgSession.activeOrgId) {
      return;
    }
    // Clear in-flight request for this key to force new call
    const requestKey = `${orgSession.activeOrgId}:${key}`;
    delete inFlightRequestsRef.current[requestKey];
    await loadMetadataKey(orgSession.activeOrgId, key);
  }, [orgSession.activeOrgId, loadMetadataKey]);

  // Load metadata when org session is ready and activeOrgId is set
  useEffect(() => {
    // Only run on client (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    // Wait for org session to be ready
    if (orgSession.status !== 'ready') {
      return;
    }

    // If no active org, reset state
    if (!orgSession.activeOrgId) {
      setStatus('idle');
      setActiveOrgId(null);
      setIndex({
        posts: [],
        collections: [],
        files: [],
      });
      setError(null);
      // Clear in-flight requests
      inFlightRequestsRef.current = {};
      return;
    }

    // Check if activeOrgId changed
    const previousOrgId = activeOrgIdRef.current;
    const currentOrgId = orgSession.activeOrgId;

    // If org changed, hard reset index to empty + status idle
    if (previousOrgId !== null && previousOrgId !== currentOrgId) {
      setStatus('idle');
      setIndex({
        posts: [],
        collections: [],
        files: [],
      });
      setError(null);
      // Clear in-flight requests
      inFlightRequestsRef.current = {};
    }

    // Update activeOrgId ref regardless
    activeOrgIdRef.current = currentOrgId;

    // Cache-first: Only load if data is missing or org changed
    // If we already have data for this org, reuse it (cache-first navigation)
    const hasData = 
      index.posts.length > 0 ||
      index.collections.length > 0 ||
      index.files.length > 0;

    // Only fetch if data is missing or org changed
    if (!hasData || (previousOrgId !== null && previousOrgId !== currentOrgId)) {
      setActiveOrgId(currentOrgId);
      loadAllMetadata(currentOrgId);
    } else {
      // Data exists, mark as ready (cache-first: use existing data)
      setActiveOrgId(currentOrgId);
      if (status !== 'ready') {
        setStatus('ready');
      }
    }
  }, [orgSession.status, orgSession.activeOrgId, loadAllMetadata]);

  // Reset state when org session resets (user logs out)
  useEffect(() => {
    if (orgSession.status === 'idle' && !orgSession.activeOrgId) {
      setStatus('idle');
      setActiveOrgId(null);
      setIndex({
        posts: [],
        collections: [],
        files: [],
      });
      setError(null);
      // Clear in-flight requests
      inFlightRequestsRef.current = {};
    }
  }, [orgSession.status, orgSession.activeOrgId]);

  const value: MetadataIndexContextValue = {
    status,
    activeOrgId,
    index,
    error,
    refreshAll,
    refreshKey,
  };

  return <MetadataIndexContext.Provider value={value}>{children}</MetadataIndexContext.Provider>;
}

/**
 * useMetadataIndex hook
 * 
 * Reads ONLY from MetadataIndexProvider.
 * Throws if used outside provider.
 * NO direct API calls allowed here.
 */
export function useMetadataIndex(): MetadataIndexContextValue {
  const context = useContext(MetadataIndexContext);
  if (!context) {
    throw new Error('useMetadataIndex must be used within MetadataIndexProvider');
  }
  return context;
}
