'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSessionAppStore } from '@/contexts/SessionAppStoreContext';
import { recordsApi, type CollectionRecord } from '@/lib/api/records';

/**
 * Intent type for hydration
 * Hydration occurs ONLY on explicit user intent: open, edit, or preview.
 * Navigation (lists, trees, sidebars) MUST NOT trigger hydration.
 */
export type HydrationIntent = 'open' | 'edit' | 'preview';

/**
 * Hook for intent-based record hydration
 * 
 * Fetches full record data ONLY on explicit user intent (open/edit/preview).
 * Avoids refetch if already hydrated and fresh (compares updatedAt timestamps).
 * 
 * Rules:
 * - List views never hydrate (they use metadata-only from Prompt 2)
 * - Hover/focus/selection never hydrate
 * - Only explicit open/edit/preview actions trigger hydration
 * 
 * @param metadataRecord - Optional metadata record for freshness comparison.
 *                         If provided, compares metadata.updatedAt with hydrated.lastKnownUpdatedAt
 *                         to detect stale data before hydration.
 */
export function useHydrateRecord(
  orgId: string,
  collectionSlug: string,
  recordId: string | null,
  intent: HydrationIntent | null,
  options?: {
    enabled?: boolean;
    metadataRecord?: CollectionRecord | null; // Metadata for freshness check
    onStaleDetected?: (isStale: boolean) => void;
  }
) {
  const {
    getHydratedRecord,
    storeHydratedRecord,
    updateHydratedRecord,
    isRecordStale,
    getCachedMetadata,
  } = useSessionAppStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [record, setRecord] = useState<CollectionRecord | null>(null);
  const [isStale, setIsStale] = useState(false);

  const enabled = options?.enabled !== false;
  const shouldHydrate = enabled && recordId !== null && intent !== null;

  // Check if record is already hydrated and fresh
  // Compares hydrated.lastKnownUpdatedAt with metadata.updatedAt
  const checkFreshness = useCallback(
    (recordId: string, metadataRecord?: CollectionRecord | null): { isFresh: boolean; hydrated: CollectionRecord | null } => {
      const hydrated = getHydratedRecord(recordId);
      if (!hydrated) {
        return { isFresh: false, hydrated: null };
      }

      // If metadata available, check if stale (metadata.updatedAt > hydrated.lastKnownUpdatedAt)
      if (metadataRecord) {
        const stale = isRecordStale(recordId, metadataRecord.updatedAt);
        if (stale) {
          return { isFresh: false, hydrated: hydrated.data };
        }
      }

      // Record is hydrated and fresh (or no metadata to compare)
      return { isFresh: true, hydrated: hydrated.data };
    },
    [getHydratedRecord, isRecordStale]
  );

  const hydrateRecord = useCallback(async () => {
    if (!shouldHydrate || !recordId) return;

    // Get metadata record for freshness check (if provided)
    const metadataRecord = options?.metadataRecord || null;

    // Check if already hydrated and fresh
    // Compares hydrated.lastKnownUpdatedAt with metadata.updatedAt
    const { isFresh, hydrated } = checkFreshness(recordId, metadataRecord);
    if (isFresh && hydrated) {
      // Use cached hydrated record (no network call)
      setRecord(hydrated);
      setLoading(false);
      setIsStale(false);
      return;
    }

    // If stale, mark as stale but continue to fetch
    if (hydrated && !isFresh) {
      setIsStale(true);
      options?.onStaleDetected?.(true);
    }

    // Fetch full record (intent-based hydration)
    try {
      setLoading(true);
      setError(null);
      setIsStale(false);

      const response = await recordsApi.getById(orgId, collectionSlug, recordId);

      if (response.success && response.data) {
        const fetchedRecord = response.data;

        // Store hydrated record
        storeHydratedRecord(recordId, fetchedRecord);

        // Update local state
        setRecord(fetchedRecord);
      } else {
        throw new Error('Failed to hydrate record');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to hydrate record');
      setError(error);
      console.error(`[useHydrateRecord] Failed to hydrate record ${recordId}:`, error);
    } finally {
      setLoading(false);
    }
  }, [shouldHydrate, recordId, orgId, collectionSlug, getHydratedRecord, storeHydratedRecord, checkFreshness, options]);

  // Check for stale data before edit
  // If metadata.updatedAt is newer than hydrated.lastKnownUpdatedAt, record is stale
  const checkStaleBeforeEdit = useCallback(
    (metadataRecord: CollectionRecord): boolean => {
      if (!recordId) return false;

      const stale = isRecordStale(recordId, metadataRecord.updatedAt);
      if (stale) {
        setIsStale(true);
        options?.onStaleDetected?.(true);
        // Auto-refetch if stale
        hydrateRecord();
        return true;
      }
      return false;
    },
    [recordId, isRecordStale, hydrateRecord, options]
  );

  // Hydrate on mount or when intent/intent changes
  // Only hydrates on explicit intent: open, edit, or preview
  useEffect(() => {
    if (shouldHydrate && intent) {
      hydrateRecord();
    }
  }, [shouldHydrate, intent, recordId, hydrateRecord]);

  // Update record after save/mutation
  const updateAfterSave = useCallback(
    (updatedRecord: CollectionRecord) => {
      if (!recordId) return;

      // Update hydrated record (keeps metadata + hydrated state consistent)
      updateHydratedRecord(recordId, updatedRecord);

      // Update local state
      setRecord(updatedRecord);
      setIsStale(false);
    },
    [recordId, updateHydratedRecord]
  );

  return {
    record,
    loading,
    error,
    isStale,
    checkStaleBeforeEdit,
    updateAfterSave,
    refresh: hydrateRecord,
  };
}
