'use client';

/**
 * Feb042026.1 — Online Indicator
 * 
 * Small, non-intrusive indicator showing online status.
 * Hidden when offline (offline state is handled by banner).
 */

import { useEffect, useState } from 'react';
import {
  getCurrentConnectivityState,
  subscribe,
  type ConnectivityState,
} from '@/lib/offline/offlineConnectivityService';

export function OnlineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Initialize with current state (SSR-safe)
    if (typeof window !== 'undefined') {
      return getCurrentConnectivityState().isOnline;
    }
    return true;
  });

  useEffect(() => {
    // Subscribe to connectivity state changes
    const unsubscribe = subscribe((state: ConnectivityState) => {
      setIsOnline(state.isOnline);
    });

    return unsubscribe;
  }, []);

  // Hidden when offline (offline state is handled by banner)
  if (!isOnline) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
      <span className="hidden sm:inline">Online</span>
    </div>
  );
}
