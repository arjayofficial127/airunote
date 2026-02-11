/**
 * Phase 3 — Save-time conflict detection (Step 3.3).
 * Conflict checks happen ONLY on save. Metadata-only (revision, updatedAt, hash).
 * No auto-merge; no API calls; no provider changes.
 */

import * as draftsStore from '@/lib/offline/stores/drafts.store';
import type { DraftEntity } from '@/lib/offline/stores/drafts.store';

/**
 * Current server metadata for conflict check. Caller provides this (e.g. from API).
 * Compare against draft.baseRevision / draft.baseHash only.
 */
export interface ServerMetadata {
  revision?: string | null;
  updatedAt?: string | number | null;
  hash?: string | null;
}

/**
 * Cheap, deterministic check: has server state diverged from draft base?
 * Uses only revision and hash; no deep diffs.
 */
export function hasConflict(draft: DraftEntity, server: ServerMetadata): boolean {
  if (draft.sourceItemId == null) return false;

  if (server.revision != null && draft.baseRevision != null && server.revision !== draft.baseRevision) {
    return true;
  }
  if (server.hash != null && draft.baseHash != null && server.hash !== draft.baseHash) {
    return true;
  }
  return false;
}

/**
 * Mark draft as conflicted. Call only at save-time when hasConflict returned true.
 */
export async function markDraftConflicted(localDraftId: string): Promise<DraftEntity | null> {
  const draft = await draftsStore.get(localDraftId);
  if (!draft) return null;

  const updated: DraftEntity = {
    ...draft,
    status: 'conflicted',
    lastEditedAt: Date.now(),
  };
  await draftsStore.put(updated);
  return updated;
}

/**
 * Save-time guard: fetch current server metadata (via callback), compare with draft, return result.
 * Does NOT mark draft; caller (e.g. saveDraftAttempt) marks when hasConflict is true.
 */
export async function checkSaveTimeConflict(
  draft: DraftEntity,
  getServerMetadata: () => Promise<ServerMetadata>
): Promise<{ hasConflict: boolean; reason?: string }> {
  if (draft.sourceItemId == null) return { hasConflict: false };

  const server = await getServerMetadata();
  const conflict = hasConflict(draft, server);
  if (conflict) {
    return {
      hasConflict: true,
      reason:
        (server.revision != null && draft.baseRevision != null && server.revision !== draft.baseRevision
          ? 'revision_changed'
          : null) ??
        (server.hash != null && draft.baseHash != null && server.hash !== draft.baseHash ? 'hash_changed' : null) ??
        'server_changed',
    };
  }
  return { hasConflict: false };
}
