/**
 * Feb042026.2 — Freshness Markers (Metadata-Only Awareness)
 * 
 * Shows users HOW FRESH their data is WITHOUT refetching full lists or content.
 * This builds trust and sets up future manual sync / merge.
 * 
 * Rules:
 * - Freshness ≠ refresh
 * - Metadata-only checks
 * - No background polling
 * - No auto-refresh
 * - No list refetch
 * - No content refetch
 * - No provider behavior change
 */

/**
 * Freshness scope
 */
export type FreshnessScope =
  | 'dashboard'
  | 'pages'
  | 'airunote'
  | 'collections'
  | 'files';

// Memory-only storage: scope -> lastCheckedAt timestamp
const freshnessTimestamps = new Map<FreshnessScope, number>();

// Track current orgId to clear on org change
let currentOrgId: string | null = null;

/**
 * Set active org ID (clears freshness on org change)
 */
export function setActiveOrgId(orgId: string | null): void {
  if (orgId !== currentOrgId) {
    // Org changed - clear all freshness timestamps
    freshnessTimestamps.clear();
    currentOrgId = orgId;
  }
}

/**
 * Mark a scope as checked (call when data is resolved)
 */
export function markChecked(scope: FreshnessScope): void {
  freshnessTimestamps.set(scope, Date.now());
}

/**
 * Get last checked timestamp for a scope
 */
export function getLastChecked(scope: FreshnessScope): number | null {
  return freshnessTimestamps.get(scope) ?? null;
}

/**
 * Format freshness timestamp as human-readable string
 * 
 * Examples:
 * - "Just now" (0-30 seconds)
 * - "1 min ago" (30 seconds - 1.5 minutes)
 * - "5 min ago" (1.5 minutes - 1 hour)
 * - "1 hr ago" (1 hour - 24 hours)
 * - "2 days ago" (24+ hours)
 */
export function formatFreshness(ts: number | null): string {
  if (ts === null) {
    return 'Not checked yet';
  }

  const now = Date.now();
  const diffMs = now - ts;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 30) {
    return 'Just now';
  }

  if (diffMinutes < 1.5) {
    return '1 min ago';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
  }

  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
}

/**
 * Clear all freshness timestamps (called on org change or hard refresh)
 */
export function clearAll(): void {
  freshnessTimestamps.clear();
  currentOrgId = null;
}
