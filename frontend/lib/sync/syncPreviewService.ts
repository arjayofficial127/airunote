/**
 * Feb042026.6.1 — Manual Sync UI (Read-Only Preview)
 * 
 * Provides a READ-ONLY preview of sync state:
 * - Lists drafts vs server state
 * - Shows freshness and conflicts
 * - Never performs writes, merges, or server mutations
 */

import * as draftsStore from '@/lib/offline/stores/drafts.store';
import * as offlineContentStore from '@/lib/offline/stores/offlineContent.store';
import { hasConflict as checkConflict, type ServerMetadata } from '@/lib/drafts/draftConflictService';
import { getCurrentConnectivityState } from '@/lib/offline/offlineConnectivityService';

export type SyncItemStatus = 'clean' | 'draft_only' | 'offline_only' | 'conflict' | 'server_deleted';

export interface SyncItemPreview {
  sourceItemId?: string | null;
  appId: string;
  orgId: string;
  hasDraft: boolean;
  hasOfflineCopy: boolean;
  hasConflict: boolean;
  lastDraftEditAt?: number;
  lastServerUpdateAt?: number | string | null;
  status: SyncItemStatus;
  draftId?: string; // Most recent active draft ID
  conflictReason?: string;
}


/**
 * Get sync preview for all items in an org.
 * READ ONLY - never throws, never mutates.
 */
export async function getSyncPreviewForOrg(orgId: string): Promise<SyncItemPreview[]> {
  try {
    // Get all drafts for this org
    const allDrafts = await draftsStore.listByOrg(orgId);
    
    // Group drafts by (appId, sourceItemId)
    const draftMap = new Map<string, {
      draft: draftsStore.DraftEntity;
      appId: string;
      sourceItemId: string | null;
    }>();

    for (const draft of allDrafts) {
      // Only consider active drafts
      if (draft.status !== 'active') continue;

      const key = `${draft.appId}:${draft.sourceItemId ?? 'new'}`;
      const existing = draftMap.get(key);
      
      // Keep the most recent draft (by lastEditedAt)
      if (!existing || draft.lastEditedAt > existing.draft.lastEditedAt) {
        draftMap.set(key, { draft, appId: draft.appId, sourceItemId: draft.sourceItemId });
      }
    }

    // Get all offline content for this org
    const allOfflineContent = await offlineContentStore.listByOrg(orgId);
    const offlineMap = new Map<string, Set<string>>(); // appId -> Set<sourceItemId>
    
    for (const item of allOfflineContent) {
      if (!offlineMap.has(item.appId)) {
        offlineMap.set(item.appId, new Set());
      }
      offlineMap.get(item.appId)!.add(item.sourceItemId);
    }

    // Build preview items
    const previews: SyncItemPreview[] = [];

    for (const { draft, appId, sourceItemId } of draftMap.values()) {
      const hasOfflineCopy = offlineMap.get(appId)?.has(sourceItemId ?? '') ?? false;
      
      let status: SyncItemStatus = 'draft_only';
      let itemHasConflict = false;
      let lastServerUpdateAt: number | string | null = null;
      let conflictReason: string | undefined = undefined;
      let serverDeleted = false;

      // Note: Server state checking removed - pages/apps are out of BASE scope
      // For BASE scope entities (posts, collections), server checks would be added here if needed
      if (sourceItemId) {
        // For now, treat as draft-only (no server check)
        status = 'draft_only';
      }

      previews.push({
        sourceItemId: sourceItemId ?? undefined,
        appId,
        orgId,
        hasDraft: true,
        hasOfflineCopy,
        hasConflict: itemHasConflict,
        lastDraftEditAt: draft.lastEditedAt,
        lastServerUpdateAt,
        status,
        draftId: draft.localDraftId,
        conflictReason,
      });
    }

    // Also include offline-only items (no draft, but has offline copy)
    for (const item of allOfflineContent) {
      const key = `${item.appId}:${item.sourceItemId}`;
      const hasDraft = Array.from(draftMap.values()).some(
        d => d.appId === item.appId && d.sourceItemId === item.sourceItemId
      );
      
      if (!hasDraft) {
        // Offline-only item (no server check - pages/apps out of BASE scope)
        previews.push({
          sourceItemId: item.sourceItemId,
          appId: item.appId,
          orgId,
          hasDraft: false,
          hasOfflineCopy: true,
          hasConflict: false,
          lastServerUpdateAt: null,
          status: 'offline_only',
        });
      }
    }

    return previews;
  } catch (err) {
    // Never throw - return empty array on error
    console.error('[syncPreviewService] Error getting sync preview:', err);
    return [];
  }
}
