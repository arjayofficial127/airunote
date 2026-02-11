'use client';

/**
 * Feb042026.2 — Freshness Badge
 * 
 * Small, subtle badge showing "Last checked: X ago"
 * Read-only awareness signal.
 */

import { useEffect, useState } from 'react';
import {
  getLastChecked,
  formatFreshness,
  type FreshnessScope,
} from '@/lib/freshness/freshnessService';

interface FreshnessBadgeProps {
  scope: FreshnessScope;
  className?: string;
}

export function FreshnessBadge({ scope, className = '' }: FreshnessBadgeProps) {
  const [lastChecked, setLastChecked] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      return getLastChecked(scope);
    }
    return null;
  });

  useEffect(() => {
    // Update when scope changes (re-check on mount)
    setLastChecked(getLastChecked(scope));

    // Poll for updates (lightweight, only reads from memory)
    const interval = setInterval(() => {
      setLastChecked(getLastChecked(scope));
    }, 1000); // Update every second for "Just now" → "1 min ago" transitions

    return () => clearInterval(interval);
  }, [scope]);

  const freshnessText = formatFreshness(lastChecked);

  return (
    <span
      className={`text-xs text-gray-500 ${className}`}
      title="Data shown from memory"
    >
      Last checked: {freshnessText}
    </span>
  );
}
