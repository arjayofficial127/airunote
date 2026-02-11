/**
 * Phase 3 — Offline read path (Step 3.4).
 * Read priority: 1) Draft (active) 2) Offline-saved 3) In-memory cache 4) Server (if online).
 * Explicitly saved offline content MUST open offline. Never throw; return fallback state when nothing found.
 * NO providers, NO UI, NO blocking, NO forced refresh, NO background sync, NO API changes.
 */

import { getActiveDraftForItem } from '@/lib/drafts/draftService';
import * as offlineContentStore from '@/lib/offline/stores/offlineContent.store';

/** Read source for resolved content. */
export type ReadSource = 'draft' | 'offline' | 'cache' | 'server' | 'unavailable';

/** Fallback state when content cannot be read (e.g. offline, no saved copy). UI interprets later. */
export type FallbackState =
  | { type: 'offline_no_content' }
  | { type: 'stale_offline'; payload: unknown }
  | { type: 'unavailable'; reason?: string };

/** Result of resolving content for read. Never throws; uses fallbackState when nothing found. */
export interface ResolvedReadResult {
  source: ReadSource;
  payload: unknown;
  fallbackState?: FallbackState;
}

/** Options for resolveContentForRead. Caller provides cache/server getters; this module does not call APIs. */
export interface ResolveReadOptions {
  getCached?: () => Promise<unknown | null>;
  getFromServer?: () => Promise<unknown | null>;
  isOnline?: () => boolean;
}

function defaultIsOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Get offline-saved content for an item, if any. Returns most recent by savedAt when multiple exist.
 */
export async function getOfflineContentForItem(
  orgId: string,
  appId: string,
  sourceItemId: string
): Promise<offlineContentStore.OfflineContentEntity | null> {
  const list = await offlineContentStore.listByOrgAndApp(orgId, appId);
  const forItem = list.filter((item) => item.sourceItemId === sourceItemId);
  if (forItem.length === 0) return null;
  forItem.sort((a, b) => b.savedAt - a.savedAt);
  return forItem[0];
}

/**
 * Resolve content for read using priority order: draft → offline-saved → cache → server (if online).
 * Returns readable result or fallback state; NEVER throws hard errors.
 */
export async function resolveContentForRead(
  orgId: string,
  appId: string,
  sourceItemId: string,
  options: ResolveReadOptions = {}
): Promise<ResolvedReadResult> {
  const { getCached, getFromServer, isOnline = defaultIsOnline } = options;

  try {
    const draft = await getActiveDraftForItem(orgId, appId, sourceItemId);
    if (draft != null) {
      return { source: 'draft', payload: draft.payload };
    }

    const offlineItem = await getOfflineContentForItem(orgId, appId, sourceItemId);
    if (offlineItem != null) {
      return { source: 'offline', payload: offlineItem.payload };
    }

    if (getCached) {
      const cached = await getCached();
      if (cached != null) {
        return { source: 'cache', payload: cached };
      }
    }

    if (isOnline() && getFromServer) {
      const server = await getFromServer();
      if (server != null) {
        return { source: 'server', payload: server };
      }
    }

    return {
      source: 'unavailable',
      payload: null,
      fallbackState: { type: 'offline_no_content' },
    };
  } catch (err) {
    return {
      source: 'unavailable',
      payload: null,
      fallbackState: { type: 'unavailable', reason: err instanceof Error ? err.message : 'unknown' },
    };
  }
}
