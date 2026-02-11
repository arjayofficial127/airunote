'use client';

/**
 * Feb042026.1 — Awareness Surface (READ-ONLY UI SIGNALS)
 * 
 * Provides CLEAR, READ-ONLY awareness of:
 * - Offline / online state
 * - Presence of drafts
 * - Presence of offline-saved content
 * 
 * This is VISIBILITY ONLY.
 * NO syncing. NO refreshing. NO cache mutation. NO API calls.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentConnectivityState,
  subscribe,
  type ConnectivityState,
} from '@/lib/offline/offlineConnectivityService';

export function ConnectivityAwarenessBanner() {
  const router = useRouter();
  const [state, setState] = useState<ConnectivityState>(() => {
    // Initialize with current state (SSR-safe)
    if (typeof window !== 'undefined') {
      return getCurrentConnectivityState();
    }
    return {
      isOnline: true,
      draftCount: 0,
      hasDrafts: false,
      offlineItemCount: 0,
      hasOfflineItems: false,
      lastChangedAt: 0,
    };
  });

  useEffect(() => {
    // Subscribe to connectivity state changes
    const unsubscribe = subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Only show banner when offline
  if (state.isOnline) {
    return null;
  }

  // Build message parts
  const messageParts: string[] = ["You're offline"];

  if (state.draftCount > 0) {
    messageParts.push(`${state.draftCount} ${state.draftCount === 1 ? 'draft' : 'drafts'}`);
  }

  if (state.offlineItemCount > 0) {
    messageParts.push(
      `${state.offlineItemCount} ${state.offlineItemCount === 1 ? 'item' : 'items'} saved for offline`
    );
  }

  const message = messageParts.join(' · ');

  const handleViewControlPanel = () => {
    // Navigate to offline control panel (future route)
    // For now, this is a placeholder - control panel will be implemented later
    router.push('/offline-control-panel');
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-gray-600 text-white text-sm py-2 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <span>{message}</span>
      </div>
      <button
        onClick={handleViewControlPanel}
        className="text-white hover:text-gray-200 underline text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-600 rounded"
      >
        View Offline Control Panel
      </button>
    </div>
  );
}
