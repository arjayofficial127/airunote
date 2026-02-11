/**
 * Phase 3 — Offline control panel data + actions (Step 3.5).
 * User visibility and control; user-initiated cleanup only. No automation, no punishment.
 * Reuses existing stores only.
 */

import * as draftsStore from '@/lib/offline/stores/drafts.store';
import * as metadataCacheStore from '@/lib/offline/stores/metadataCache.store';
import * as offlineContentStore from '@/lib/offline/stores/offlineContent.store';
import * as snapshotsStore from '@/lib/offline/stores/snapshots.store';

/** Unified offline summary per org (optionally scoped by app). */
export interface OfflineSummary {
  offlineEnabled: boolean;
  totalEstimatedSize: number;
  counts: {
    drafts: number;
    offlineSavedItems: number;
    metadataEntries: number;
    snapshots: number;
  };
  lastUpdatedAt: number;
}

/** Per-item / per-group info for control panel. */
export interface OfflinePerItemInfo {
  itemId: string;
  itemType: string;
  hasDrafts: boolean;
  draftCount: number;
  offlineSaved: boolean;
  conflictStatus: 'none' | 'conflicted';
  hotOrCold?: 'hot' | 'cold';
}

function estimatePayloadSize(payload: unknown): number {
  try {
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
}

/**
 * Get unified offline summary for org. When appId is provided, only that app's data is included.
 */
export async function getOfflineSummary(
  orgId: string,
  appId?: string | null
): Promise<OfflineSummary> {
  const [drafts, offlineItems, metadataEntries, snapshots] = appId
    ? await Promise.all([
        draftsStore.listByOrgAndApp(orgId, appId),
        offlineContentStore.listByOrgAndApp(orgId, appId),
        metadataCacheStore.listByOrgAndApp(orgId, appId),
        snapshotsStore.listByOrgAndApp(orgId, appId),
      ])
    : await Promise.all([
        draftsStore.listByOrg(orgId),
        offlineContentStore.listByOrg(orgId),
        metadataCacheStore.listByOrg(orgId),
        snapshotsStore.listByOrg(orgId),
      ]);

  let totalEstimatedSize = 0;
  let lastUpdatedAt = 0;

  for (const d of drafts) {
    totalEstimatedSize += estimatePayloadSize(d.payload);
    if (d.lastEditedAt > lastUpdatedAt) lastUpdatedAt = d.lastEditedAt;
  }
  for (const o of offlineItems) {
    totalEstimatedSize += estimatePayloadSize(o.payload);
    if (o.savedAt > lastUpdatedAt) lastUpdatedAt = o.savedAt;
  }
  for (const m of metadataEntries) {
    totalEstimatedSize += estimatePayloadSize(m.items);
    if (m.updatedAt > lastUpdatedAt) lastUpdatedAt = m.updatedAt;
  }
  for (const s of snapshots) {
    totalEstimatedSize += s.estimatedSize;
    if (s.createdAt > lastUpdatedAt) lastUpdatedAt = s.createdAt;
  }

  const totalCount = drafts.length + offlineItems.length + metadataEntries.length + snapshots.length;

  return {
    offlineEnabled: totalCount > 0,
    totalEstimatedSize,
    counts: {
      drafts: drafts.length,
      offlineSavedItems: offlineItems.length,
      metadataEntries: metadataEntries.length,
      snapshots: snapshots.length,
    },
    lastUpdatedAt,
  };
}

/** Get drafts list for panel (org-wide or org+app). */
export async function getDraftsList(
  orgId: string,
  appId?: string | null
): Promise<draftsStore.DraftEntity[]> {
  return appId != null && appId !== ''
    ? draftsStore.listByOrgAndApp(orgId, appId)
    : draftsStore.listByOrg(orgId);
}

/** Get offline content list for panel (for "Remove offline copy"). */
export async function getOfflineContentList(
  orgId: string,
  appId?: string | null
): Promise<offlineContentStore.OfflineContentEntity[]> {
  return appId != null && appId !== ''
    ? offlineContentStore.listByOrgAndApp(orgId, appId)
    : offlineContentStore.listByOrg(orgId);
}

/** Get snapshots list for panel (for Export snapshot). */
export async function getSnapshotsList(
  orgId: string,
  appId?: string | null
): Promise<snapshotsStore.SnapshotEntity[]> {
  return appId != null && appId !== ''
    ? snapshotsStore.listByOrgAndApp(orgId, appId)
    : snapshotsStore.listByOrg(orgId);
}

/**
 * Get per-item info for org+app (items with drafts or offline-saved content).
 */
export async function getPerItemInfo(
  orgId: string,
  appId: string
): Promise<OfflinePerItemInfo[]> {
  const [drafts, offlineItems] = await Promise.all([
    draftsStore.listByOrgAndApp(orgId, appId),
    offlineContentStore.listByOrgAndApp(orgId, appId),
  ]);

  const itemIds = new Set<string>();
  drafts.forEach((d) => {
    if (d.sourceItemId != null) itemIds.add(d.sourceItemId);
  });
  offlineItems.forEach((o) => itemIds.add(o.sourceItemId));

  const result: OfflinePerItemInfo[] = [];
  for (const itemId of itemIds) {
    const itemDrafts = drafts.filter((d) => d.sourceItemId === itemId);
    const hasConflicted = itemDrafts.some((d) => d.status === 'conflicted');
    const offlineSaved = offlineItems.some((o) => o.sourceItemId === itemId);
    result.push({
      itemId,
      itemType: 'item',
      hasDrafts: itemDrafts.length > 0,
      draftCount: itemDrafts.length,
      offlineSaved,
      conflictStatus: hasConflicted ? 'conflicted' : 'none',
    });
  }
  return result;
}

// ——— User-initiated actions (logic only) ———

/** Remove one offline-saved copy (keeps server data). */
export async function removeOfflineCopy(offlineItemId: string): Promise<void> {
  await offlineContentStore.deleteById(offlineItemId);
}

/** Discard selected draft(s). User-initiated only. */
export async function discardDrafts(localDraftIds: string[]): Promise<void> {
  await Promise.all(localDraftIds.map((id) => draftsStore.deleteById(id)));
}

/** Export snapshot as JSON string. */
export async function exportSnapshot(snapshotId: string): Promise<string> {
  const snapshot = await snapshotsStore.get(snapshotId);
  if (!snapshot) throw new Error('Snapshot not found');
  return JSON.stringify(
    { snapshotId, orgId: snapshot.orgId, appId: snapshot.appId, createdAt: snapshot.createdAt, payload: snapshot.payload },
    null,
    2
  );
}

/** Import snapshot from JSON string. Creates or overwrites by snapshotId in payload. */
export async function importSnapshot(json: string): Promise<void> {
  const parsed = JSON.parse(json) as {
    snapshotId: string;
    orgId: string;
    appId: string;
    createdAt: number;
    payload: unknown;
  };
  const payload = parsed.payload as unknown;
  const estimatedSize = JSON.stringify(payload).length;
  await snapshotsStore.put({
    snapshotId: parsed.snapshotId,
    orgId: parsed.orgId,
    appId: parsed.appId,
    createdAt: parsed.createdAt ?? Date.now(),
    itemCount: Array.isArray(payload) ? (payload as unknown[]).length : 1,
    estimatedSize,
    payload,
  });
}

/** Clear all offline data for org (and optionally for one app). User-initiated only. */
export async function clearOfflineData(orgId: string, appId?: string | null): Promise<void> {
  if (appId != null && appId !== '') {
    const [drafts, offline, metadata, snapshots] = await Promise.all([
      draftsStore.listByOrgAndApp(orgId, appId),
      offlineContentStore.listByOrgAndApp(orgId, appId),
      metadataCacheStore.listByOrgAndApp(orgId, appId),
      snapshotsStore.listByOrgAndApp(orgId, appId),
    ]);
    await Promise.all([
      ...drafts.map((d) => draftsStore.deleteById(d.localDraftId)),
      ...offline.map((o) => offlineContentStore.deleteById(o.offlineItemId)),
      ...metadata.map((m) => metadataCacheStore.deleteById(m.cacheId)),
      ...snapshots.map((s) => snapshotsStore.deleteById(s.snapshotId)),
    ]);
  } else {
    await draftsStore.clearByOrg(orgId);
    await offlineContentStore.clearByOrg(orgId);
    await metadataCacheStore.clearByOrg(orgId);
    await snapshotsStore.clearByOrg(orgId);
  }
}
