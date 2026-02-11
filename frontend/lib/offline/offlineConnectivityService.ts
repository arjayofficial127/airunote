/**
 * Phase 3.6 — Reconnect awareness. Read-only.
 * Detects offline ↔ online; summarizes draft/offline counts; emits non-blocking signals.
 * NO syncing, saving, merging, deletion, providers, UI, or hooks.
 */

import * as draftsStore from '@/lib/offline/stores/drafts.store';
import * as offlineContentStore from '@/lib/offline/stores/offlineContent.store';

export interface ConnectivityState {
  isOnline: boolean;
  draftCount: number;
  hasDrafts: boolean;
  offlineItemCount: number;
  hasOfflineItems: boolean;
  lastChangedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function getIsOnline(): boolean {
  return isBrowser() && navigator.onLine;
}

let currentState: ConnectivityState = {
  isOnline: false,
  draftCount: 0,
  hasDrafts: false,
  offlineItemCount: 0,
  hasOfflineItems: false,
  lastChangedAt: 0,
};

const listeners = new Set<(state: ConnectivityState) => void>();
let initialized = false;

async function refreshCounts(): Promise<void> {
  if (!isBrowser()) return;
  let draftCount = 0;
  let offlineItemCount = 0;
  try {
    draftCount = await draftsStore.countAll();
  } catch {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('[offlineConnectivity] drafts count failed, using 0');
    }
  }
  try {
    offlineItemCount = await offlineContentStore.countAll();
  } catch {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('[offlineConnectivity] offline content count failed, using 0');
    }
  }
  const next: ConnectivityState = {
    ...currentState,
    draftCount,
    hasDrafts: draftCount > 0,
    offlineItemCount,
    hasOfflineItems: offlineItemCount > 0,
    lastChangedAt: Date.now(),
  };
  currentState = next;
  listeners.forEach((l) => {
    try {
      l(next);
    } catch {
      // fail silently
    }
  });
}

function updateState(partial: Partial<ConnectivityState>): void {
  const next: ConnectivityState = {
    ...currentState,
    ...partial,
    lastChangedAt: Date.now(),
  };
  currentState = next;
  listeners.forEach((l) => {
    try {
      l(next);
    } catch {
      // fail silently
    }
  });
}

function handleOnline(): void {
  updateState({ isOnline: true });
  refreshCounts();
}

function handleOffline(): void {
  updateState({ isOnline: false });
}

function ensureInitialized(): void {
  if (!isBrowser() || initialized) return;
  initialized = true;
  currentState = {
    ...currentState,
    isOnline: getIsOnline(),
    lastChangedAt: Date.now(),
  };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  refreshCounts();
}

/**
 * Returns the current connectivity state. Safe to call from SSR (returns default state).
 * In browser, first call triggers listener setup and async count refresh.
 */
export function getCurrentConnectivityState(): ConnectivityState {
  ensureInitialized();
  return { ...currentState };
}

/**
 * Subscribe to connectivity state changes. Returns unsubscribe.
 * In browser, first call triggers listener setup and async count refresh.
 * No React hooks or providers in this step.
 */
export function subscribe(listener: (state: ConnectivityState) => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  try {
    listener(currentState);
  } catch {
    // fail silently
  }
  return () => {
    listeners.delete(listener);
  };
}
