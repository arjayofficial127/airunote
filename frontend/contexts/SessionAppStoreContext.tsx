'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { CollectionRecord } from '@/lib/api/records';

/**
 * Session-scoped metadata record (metadata-only, from list responses)
 */
export type MetadataRecord = CollectionRecord;

/**
 * Full hydrated record data (from GET by id)
 */
export type FullRecordData = CollectionRecord;

/**
 * Hydrated record state (intent-based hydration)
 * Tracks full record data fetched on open/edit/preview intent.
 */
interface HydratedRecord {
  hydratedAt: Date;
  lastKnownUpdatedAt: string; // ISO timestamp from record.updatedAt
  data: FullRecordData;
}

/**
 * Collection metadata cache
 */
interface CollectionMetadata {
  records: MetadataRecord[];
  lastFetchedAt: Date;
}

/**
 * App metadata state
 */
interface AppMetadata {
  metadataLoaded: boolean;
  lastLoadedAt: Date | null;
  collections: Record<string, CollectionMetadata>;
}

/**
 * Session store structure
 */
interface SessionAppStore {
  sessionKey: { userId: string; orgId: string } | null;
  apps: Record<string, AppMetadata>;
  // Hydrated records tracked separately from metadata
  // Key: recordId, Value: hydrated record state
  hydratedRecords: Record<string, HydratedRecord>;
}

/**
 * SessionAppStore context value
 */
interface SessionAppStoreContextValue {
  // Check if app metadata is loaded
  isMetadataLoaded: (appCode: string) => boolean;
  
  // Get cached metadata for a collection
  getCachedMetadata: (appCode: string, collectionSlug: string) => MetadataRecord[] | null;
  
  // Store metadata after fetch
  storeMetadata: (appCode: string, collectionSlug: string, records: MetadataRecord[]) => void;
  
  // Clear metadata for an app (refresh)
  refreshAppMetadata: (appCode: string) => void;
  
  // Clear all metadata (on logout/org change)
  clearAll: () => void;
  
  // Hydration methods (intent-based)
  // Get hydrated record if available
  getHydratedRecord: (recordId: string) => HydratedRecord | null;
  
  // Store hydrated record after fetch (open/edit/preview intent)
  storeHydratedRecord: (recordId: string, record: FullRecordData) => void;
  
  // Update hydrated record after save/mutation
  updateHydratedRecord: (recordId: string, record: FullRecordData) => void;
  
  // Check if record is stale (metadata.updatedAt > hydrated.lastKnownUpdatedAt)
  isRecordStale: (recordId: string, metadataUpdatedAt: string) => boolean;
  
  // Clear hydrated record (for explicit refresh)
  clearHydratedRecord: (recordId: string) => void;
}

const SessionAppStoreContext = createContext<SessionAppStoreContextValue | null>(null);

/**
 * SessionAppStoreProvider
 * 
 * Manages in-memory session-scoped metadata cache per app per org.
 * Also tracks hydrated records (full data) fetched on explicit intent (open/edit/preview).
 * 
 * Key behaviors:
 * - Metadata (list responses) stored separately from hydrated records (detail responses)
 * - Hydrated records tracked with freshness timestamps
 * - Store clears automatically on auth/org change
 * - No persistence (in-memory only, cleared on page refresh)
 */
export function SessionAppStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const orgId = params.orgId as string | undefined;
  const [store, setStore] = useState<SessionAppStore>({
    sessionKey: null,
    apps: {},
    hydratedRecords: {},
  });

  // Current session key
  const currentSessionKey = useMemo(() => {
    if (user?.id && orgId) {
      return { userId: user.id, orgId };
    }
    return null;
  }, [user?.id, orgId]);

  // Clear store when session key changes (auth/org change)
  // Use ref to track previous session key to avoid infinite loops
  const prevSessionKeyRef = useRef<{ userId: string; orgId: string } | null>(null);
  
  useEffect(() => {
    if (currentSessionKey) {
      const keyChanged =
        !prevSessionKeyRef.current ||
        prevSessionKeyRef.current.userId !== currentSessionKey.userId ||
        prevSessionKeyRef.current.orgId !== currentSessionKey.orgId;

      if (keyChanged) {
        // Clear entire store on session change (metadata + hydrated records)
        setStore({
          sessionKey: currentSessionKey,
          apps: {},
          hydratedRecords: {},
        });
        prevSessionKeyRef.current = currentSessionKey;
      }
    } else {
      // No session (logged out) - clear store
      if (prevSessionKeyRef.current) {
        setStore({
          sessionKey: null,
          apps: {},
          hydratedRecords: {},
        });
        prevSessionKeyRef.current = null;
      }
    }
  }, [currentSessionKey]);

  const isMetadataLoaded = useCallback(
    (appCode: string): boolean => {
      if (!store.sessionKey) return false;
      return store.apps[appCode]?.metadataLoaded === true;
    },
    [store]
  );

  const getCachedMetadata = useCallback(
    (appCode: string, collectionSlug: string): MetadataRecord[] | null => {
      if (!store.sessionKey) return null;
      const app = store.apps[appCode];
      if (!app) return null;
      const collection = app.collections[collectionSlug];
      return collection ? collection.records : null;
    },
    [store]
  );

  const storeMetadata = useCallback(
    (appCode: string, collectionSlug: string, records: MetadataRecord[]) => {
      if (!store.sessionKey) return;

      setStore((prev) => {
        const apps = { ...prev.apps };
        const app = apps[appCode] || {
          metadataLoaded: false,
          lastLoadedAt: null,
          collections: {},
        };

        // Store collection metadata
        app.collections = {
          ...app.collections,
          [collectionSlug]: {
            records,
            lastFetchedAt: new Date(),
          },
        };

        // Mark app as loaded if at least one collection is loaded
        app.metadataLoaded = true;
        app.lastLoadedAt = new Date();

        apps[appCode] = app;

        return {
          ...prev,
          apps,
        };
      });
    },
    [store.sessionKey]
  );

  const refreshAppMetadata = useCallback((appCode: string) => {
    if (!store.sessionKey) return;

    setStore((prev) => {
      const apps = { ...prev.apps };
      delete apps[appCode];
      return {
        ...prev,
        apps,
      };
    });
  }, [store.sessionKey]);

  const clearAll = useCallback(() => {
    setStore({
      sessionKey: null,
      apps: {},
      hydratedRecords: {},
    });
  }, []);

  // Get hydrated record if available
  const getHydratedRecord = useCallback(
    (recordId: string): HydratedRecord | null => {
      if (!store.sessionKey) return null;
      return store.hydratedRecords[recordId] || null;
    },
    [store]
  );

  // Store hydrated record after fetch (intent-based: open/edit/preview)
  // Only called when user explicitly opens, edits, or previews a record.
  // List views never trigger hydration (they use metadata-only from Prompt 2).
  const storeHydratedRecord = useCallback(
    (recordId: string, record: FullRecordData) => {
      if (!store.sessionKey) return;

      setStore((prev) => ({
        ...prev,
        hydratedRecords: {
          ...prev.hydratedRecords,
          [recordId]: {
            hydratedAt: new Date(),
            lastKnownUpdatedAt: record.updatedAt,
            data: record,
          },
        },
      }));
    },
    [store.sessionKey]
  );

  // Update hydrated record after save/mutation
  // Also updates corresponding metadata.updatedAt if it exists in cache.
  // This keeps metadata + hydrated state consistent after mutations.
  const updateHydratedRecord = useCallback(
    (recordId: string, record: FullRecordData) => {
      if (!store.sessionKey) return;

      setStore((prev) => {
        const hydratedRecords = { ...prev.hydratedRecords };
        
        // Update hydrated record with new data and timestamp
        hydratedRecords[recordId] = {
          hydratedAt: new Date(),
          lastKnownUpdatedAt: record.updatedAt,
          data: record,
        };

        // Update corresponding metadata.updatedAt in collections if it exists
        // This keeps metadata + hydrated state consistent (metadata stays metadata-only)
        const apps = { ...prev.apps };
        for (const appCode of Object.keys(apps)) {
          const app = apps[appCode];
          for (const collectionSlug of Object.keys(app.collections)) {
            const collection = app.collections[collectionSlug];
            const metadataIndex = collection.records.findIndex((r) => r.id === recordId);
            if (metadataIndex >= 0) {
              // Update metadata record with new updatedAt (but keep metadata-only shape)
              collection.records[metadataIndex] = {
                ...collection.records[metadataIndex],
                updatedAt: record.updatedAt,
                // Note: We don't replace data with full content - metadata stays metadata-only
              };
            }
          }
        }

        return {
          ...prev,
          apps,
          hydratedRecords,
        };
      });
    },
    [store.sessionKey]
  );

  // Check if record is stale (metadata.updatedAt > hydrated.lastKnownUpdatedAt)
  // Used to detect if hydrated record needs refresh before edit.
  // If metadata was refreshed and has newer updatedAt, hydrated record is stale.
  const isRecordStale = useCallback(
    (recordId: string, metadataUpdatedAt: string): boolean => {
      if (!store.sessionKey) return false;
      const hydrated = store.hydratedRecords[recordId];
      if (!hydrated) return false;
      
      // Compare timestamps - if metadata is newer, hydrated record is stale
      return metadataUpdatedAt > hydrated.lastKnownUpdatedAt;
    },
    [store]
  );

  // Clear hydrated record (for explicit refresh)
  const clearHydratedRecord = useCallback(
    (recordId: string) => {
      if (!store.sessionKey) return;

      setStore((prev) => {
        const hydratedRecords = { ...prev.hydratedRecords };
        delete hydratedRecords[recordId];
        return {
          ...prev,
          hydratedRecords,
        };
      });
    },
    [store.sessionKey]
  );

  const value: SessionAppStoreContextValue = useMemo(
    () => ({
      isMetadataLoaded,
      getCachedMetadata,
      storeMetadata,
      refreshAppMetadata,
      clearAll,
      getHydratedRecord,
      storeHydratedRecord,
      updateHydratedRecord,
      isRecordStale,
      clearHydratedRecord,
    }),
    [
      isMetadataLoaded,
      getCachedMetadata,
      storeMetadata,
      refreshAppMetadata,
      clearAll,
      getHydratedRecord,
      storeHydratedRecord,
      updateHydratedRecord,
      isRecordStale,
      clearHydratedRecord,
    ]
  );

  return <SessionAppStoreContext.Provider value={value}>{children}</SessionAppStoreContext.Provider>;
}

/**
 * Hook to access SessionAppStore
 */
export function useSessionAppStore(): SessionAppStoreContextValue {
  const context = useContext(SessionAppStoreContext);
  if (!context) {
    throw new Error('useSessionAppStore must be used within SessionAppStoreProvider');
  }
  return context;
}
