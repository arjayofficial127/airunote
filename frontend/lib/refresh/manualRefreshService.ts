/**
 * Feb042026.3 — Manual Refresh Hooks (Metadata-Only)
 * 
 * Allows the user to INTENTIONALLY refresh data WITHOUT:
 * - Auto refresh
 * - Background polling
 * - Sync
 * - Merge
 * - Draft mutation
 * 
 * This is a *manual re-check*, not a data replacement.
 */

import { dashboardApi, type AdminDashboardData } from '@/lib/api/dashboard';
import { collectionsApi, type Collection } from '@/lib/api/collections';
import { filesApi, type OrgFile } from '@/lib/api/files';
import { markChecked } from '@/lib/freshness/freshnessService';
import { getCurrentConnectivityState } from '@/lib/offline/offlineConnectivityService';
import type { CollectionMetadata, FileMetadata } from '@/providers/MetadataIndexProvider';

/**
 * Refresh scope
 */
export type RefreshScope =
  | 'dashboard'
  | 'collections'
  | 'files';

/**
 * Refresh result
 */
export interface RefreshResult {
  scope: RefreshScope;
  checkedAt: number;
  hasUpdates: boolean;
  reason?: 'server_newer' | 'network_error' | 'offline';
}

/**
 * Compare metadata arrays to detect if server has newer data
 * Compares by updatedAt timestamps
 */
function compareMetadataForUpdates<T extends { id: string; updatedAt: string }>(
  cached: T[],
  server: T[]
): boolean {
  // Create maps for quick lookup
  const cachedMap = new Map(cached.map(item => [item.id, item]));
  const serverMap = new Map(server.map(item => [item.id, item]));

  // Check for new items (in server but not in cache)
  for (const serverItem of server) {
    if (!cachedMap.has(serverItem.id)) {
      return true; // New item found
    }
  }

  // Check for updated items (same id but newer updatedAt)
  for (const serverItem of server) {
    const cachedItem = cachedMap.get(serverItem.id);
    if (cachedItem) {
      const serverTime = new Date(serverItem.updatedAt).getTime();
      const cachedTime = new Date(cachedItem.updatedAt).getTime();
      if (serverTime > cachedTime) {
        return true; // Server has newer version
      }
    }
  }

  // Check for deleted items (in cache but not in server)
  // Note: We don't consider deletions as "updates" for refresh purposes
  // because the user might have filtered the list

  return false;
}

/**
 * Refresh dashboard scope
 */
async function refreshDashboard(orgId: string, cachedData?: AdminDashboardData | null): Promise<RefreshResult> {
  const checkedAt = Date.now();

  try {
    // Check offline state
    const connectivity = getCurrentConnectivityState();
    if (!connectivity.isOnline) {
      return {
        scope: 'dashboard',
        checkedAt,
        hasUpdates: false,
        reason: 'offline',
      };
    }

    // Call dashboard stats endpoint
    const serverData = await dashboardApi.getAdminStats(orgId);

    // Compare timestamps if available
    // Note: Dashboard API doesn't currently return lastUpdatedAt, so we can't compare
    // For now, we'll mark as checked but assume no updates detected
    // Future: When API includes lastUpdatedAt, compare with cached data

    // Update freshness marker
    markChecked('dashboard');

    // Since we can't compare timestamps yet, we'll return hasUpdates: false
    // This is safe - it means "we checked, but can't determine if updates exist"
    return {
      scope: 'dashboard',
      checkedAt,
      hasUpdates: false, // Can't determine without timestamp comparison
    };
  } catch (err) {
    console.error('[manualRefreshService] Dashboard refresh error:', err);
    return {
      scope: 'dashboard',
      checkedAt,
      hasUpdates: false,
      reason: 'network_error',
    };
  }
}


/**
 * Refresh collections scope
 */
async function refreshCollections(
  orgId: string,
  cachedMetadata: CollectionMetadata[]
): Promise<RefreshResult> {
  const checkedAt = Date.now();

  try {
    // Check offline state
    const connectivity = getCurrentConnectivityState();
    if (!connectivity.isOnline) {
      return {
        scope: 'collections',
        checkedAt,
        hasUpdates: false,
        reason: 'offline',
      };
    }

    // Call collections list endpoint (lightweight metadata only)
    const response = await collectionsApi.list(orgId);
    const serverCollections = response.success ? response.data : [];

    // Extract metadata for comparison
    const serverMetadata: CollectionMetadata[] = serverCollections.map((col: Collection) => ({
      id: col.id,
      orgId: col.orgId,
      slug: col.slug,
      name: col.name,
      description: col.description,
      icon: col.icon,
      color: col.color,
      visibility: col.visibility,
      updatedAt: col.updatedAt,
      createdAt: col.createdAt,
    }));

    // Compare to detect updates
    const hasUpdates = compareMetadataForUpdates(cachedMetadata, serverMetadata);

    // Update freshness marker
    markChecked('collections');

    return {
      scope: 'collections',
      checkedAt,
      hasUpdates,
      reason: hasUpdates ? 'server_newer' : undefined,
    };
  } catch (err) {
    console.error('[manualRefreshService] Collections refresh error:', err);
    return {
      scope: 'collections',
      checkedAt,
      hasUpdates: false,
      reason: 'network_error',
    };
  }
}

/**
 * Refresh files scope
 */
async function refreshFiles(
  orgId: string,
  cachedMetadata: FileMetadata[]
): Promise<RefreshResult> {
  const checkedAt = Date.now();

  try {
    // Check offline state
    const connectivity = getCurrentConnectivityState();
    if (!connectivity.isOnline) {
      return {
        scope: 'files',
        checkedAt,
        hasUpdates: false,
        reason: 'offline',
      };
    }

    // Call files list endpoint (lightweight metadata only)
    const serverFiles = await filesApi.list(orgId).catch(() => []);

    // Extract metadata for comparison
    const serverMetadata: FileMetadata[] = serverFiles.map((file: OrgFile) => ({
      id: file.id,
      orgId: file.orgId,
      ownerUserId: file.ownerUserId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      visibility: file.visibility,
      updatedAt: file.updatedAt,
      createdAt: file.createdAt,
    }));

    // Compare to detect updates
    const hasUpdates = compareMetadataForUpdates(cachedMetadata, serverMetadata);

    // Update freshness marker
    markChecked('files');

    return {
      scope: 'files',
      checkedAt,
      hasUpdates,
      reason: hasUpdates ? 'server_newer' : undefined,
    };
  } catch (err) {
    console.error('[manualRefreshService] Files refresh error:', err);
    return {
      scope: 'files',
      checkedAt,
      hasUpdates: false,
      reason: 'network_error',
    };
  }
}

/**
 * Refresh a specific scope
 * 
 * @param scope - The scope to refresh
 * @param orgId - Organization ID
 * @param cachedData - Optional cached data for comparison (from MetadataIndexProvider or dashboard)
 */
export async function refreshScope(
  scope: RefreshScope,
  orgId: string,
  cachedData?: {
    dashboard?: AdminDashboardData | null;
    collections?: CollectionMetadata[];
    files?: FileMetadata[];
  }
): Promise<RefreshResult> {
  switch (scope) {
    case 'dashboard':
      return refreshDashboard(orgId, cachedData?.dashboard);
    case 'collections':
      return refreshCollections(orgId, cachedData?.collections || []);
    case 'files':
      return refreshFiles(orgId, cachedData?.files || []);
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = scope;
      return {
        scope,
        checkedAt: Date.now(),
        hasUpdates: false,
        reason: 'network_error',
      };
  }
}

/**
 * Refresh all scopes
 * 
 * @param orgId - Organization ID
 * @param cachedData - Optional cached data for comparison
 */
export async function refreshAll(
  orgId: string,
  cachedData?: {
    dashboard?: AdminDashboardData | null;
    collections?: CollectionMetadata[];
    files?: FileMetadata[];
  }
): Promise<RefreshResult[]> {
  const scopes: RefreshScope[] = ['dashboard', 'collections', 'files'];
  
  // Refresh all scopes in parallel
  const results = await Promise.all(
    scopes.map(scope => refreshScope(scope, orgId, cachedData))
  );

  return results;
}
