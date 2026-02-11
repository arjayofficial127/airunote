/**
 * Feb042026.5 — Context-Aware Hard Refresh Capability
 * 
 * Provides a HARD refresh mechanism that:
 * - Clears memory-only caches
 * - Rehydrates data intentionally (on next access)
 * - Preserves drafts and offline data
 * - Is context-aware (scope-based)
 * 
 * This is NOT sync.
 * This is NOT merge.
 * This is NOT auto-triggered.
 * 
 * Rules:
 * - Drafts are NEVER touched
 * - Offline IndexedDB data is NEVER touched
 * - Only memory caches are cleared
 * - Refresh is user-initiated only
 * - Scope-aware (not global unless chosen)
 * - No background refresh
 * - No silent behavior change
 */

// pageStylesCache removed - pages out of BASE scope

/**
 * Hard refresh scope
 */
export type HardRefreshScope =
  | 'dashboard'
  | 'collections'
  | 'files'
  | 'all';

/**
 * Hard refresh result
 */
export interface HardRefreshResult {
  scope: HardRefreshScope;
  clearedAt: number;
}

/**
 * Provider clear functions (passed by components that have provider context)
 */
export interface ProviderClearFunctions {
  /**
   * Clear all hydrated content
   */
  clearHydrated?: () => void;
  
  /**
   * Clear specific entity from hydrated content
   */
  clearEntity?: (entityType: 'post', id: string) => void;
  
  /**
   * Refresh metadata index for specific key (clears and refetches)
   * Components should pass MetadataIndexProvider.refreshKey
   */
  refreshMetadataKey?: (key: 'posts' | 'collections' | 'files') => Promise<void>;
  
  /**
   * Refresh all metadata index (clears and refetches)
   * Components should pass MetadataIndexProvider.refreshAll
   */
  refreshAllMetadata?: () => Promise<void>;
  
  /**
   * Clear dashboard state (component-specific)
   */
  clearDashboard?: () => void;
}

/**
 * Hard refresh service
 * 
 * Clears memory-only caches for the specified scope.
 * Does NOT touch:
 * - IndexedDB (drafts, offline content)
 * - Persistent storage
 * - Provider state that should persist
 * 
 * @param scope - The scope to refresh
 * @param providers - Optional provider clear functions (passed by components with provider context)
 * @returns Result with scope and timestamp
 */
export async function hardRefresh(
  scope: HardRefreshScope,
  providers?: ProviderClearFunctions
): Promise<HardRefreshResult> {
  const clearedAt = Date.now();

  try {
    switch (scope) {
      case 'dashboard': {
        // Clear dashboard in-memory state (if any)
        if (providers?.clearDashboard) {
          providers.clearDashboard();
        }
        // Note: Dashboard will refetch on next view
        break;
      }


      case 'collections': {
        // Clear and refetch MetadataIndexProvider cache for collections
        if (providers?.refreshMetadataKey) {
          await providers.refreshMetadataKey('collections');
        }
        
        // Note: Collections are not in HydratedContentProvider yet
        break;
      }

      case 'files': {
        // Clear and refetch MetadataIndexProvider cache for files
        if (providers?.refreshMetadataKey) {
          await providers.refreshMetadataKey('files');
        }
        
        // Note: Files are not in HydratedContentProvider yet
        break;
      }

      case 'all': {
        // Clear ALL memory-only caches
        
        // Clear and refetch all metadata index
        if (providers?.refreshAllMetadata) {
          await providers.refreshAllMetadata();
        }
        
        // Clear all hydrated content
        if (providers?.clearHydrated) {
          providers.clearHydrated();
        }
        
        // Styles cache removed - pages out of BASE scope
        
        // Clear dashboard state
        if (providers?.clearDashboard) {
          providers.clearDashboard();
        }
        break;
      }
    }
  } catch (error) {
    // Never throw - log error but return result
    console.error('[hardRefreshService] Error during hard refresh:', error);
  }

  return {
    scope,
    clearedAt,
  };
}

/**
 * Check if a scope is valid
 */
export function isValidScope(scope: string): scope is HardRefreshScope {
  return ['dashboard', 'collections', 'files', 'all'].includes(scope);
}
