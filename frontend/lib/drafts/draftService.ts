/**
 * Phase 3 — Draft mechanics (Step 3.2) + save-time conflict (Step 3.3).
 * Builds on IndexedDB drafts + snapshots stores.
 * NO server save here; conflict detection at save-time only (guard).
 *
 * - Safe offline editing: draft copy only; original never mutated.
 * - Undo protection: pre-edit snapshot stored when starting from existing.
 * - Multiple drafts per item; superseding marks older drafts.
 * - Save-time conflict check: metadata-only; draft marked conflicted on mismatch.
 */

import * as draftsStore from '@/lib/offline/stores/drafts.store';
import type { DraftEntity } from '@/lib/offline/stores/drafts.store';
import * as snapshotsStore from '@/lib/offline/stores/snapshots.store';
import {
  checkSaveTimeConflict,
  markDraftConflicted,
  type ServerMetadata,
} from '@/lib/drafts/draftConflictService';

const DRAFT_UNDO_PREFIX = 'draft_undo_';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Start a draft from existing server data. Creates a local copy and a pre-edit snapshot for undo.
 * Original data is never mutated; payload is deep-cloned.
 */
export async function startDraftFromExisting(
  orgId: string,
  appId: string,
  sourceItemId: string,
  payload: unknown,
  baseRevision?: string | null,
  baseHash?: string | null
): Promise<DraftEntity> {
  const localDraftId = generateId();
  const now = Date.now();
  const payloadCopy = deepClone(payload);

  const draft: DraftEntity = {
    localDraftId,
    orgId,
    appId,
    sourceItemId,
    payload: payloadCopy,
    baseRevision: baseRevision ?? null,
    baseHash: baseHash ?? null,
    createdAt: now,
    lastEditedAt: now,
    status: 'active',
  };
  await draftsStore.put(draft);

  const snapshotPayload = deepClone(payload);
  const snapshotStr = JSON.stringify(snapshotPayload);
  await snapshotsStore.put({
    snapshotId: `${DRAFT_UNDO_PREFIX}${localDraftId}`,
    orgId,
    appId,
    createdAt: now,
    itemCount: 1,
    estimatedSize: snapshotStr.length,
    payload: snapshotPayload,
  });

  return draft;
}

/**
 * Start a new draft (no server item yet). No pre-edit snapshot.
 */
export async function startDraftNew(
  orgId: string,
  appId: string,
  sourceItemId?: string | null
): Promise<DraftEntity> {
  const localDraftId = generateId();
  const now = Date.now();

  const draft: DraftEntity = {
    localDraftId,
    orgId,
    appId,
    sourceItemId: sourceItemId ?? null,
    payload: {},
    baseRevision: null,
    baseHash: null,
    createdAt: now,
    lastEditedAt: now,
    status: 'active',
  };
  await draftsStore.put(draft);
  return draft;
}

/**
 * Update draft payload and lastEditedAt. Uses a deep clone; never mutates the passed-in object.
 */
export async function updateDraft(localDraftId: string, payload: unknown): Promise<DraftEntity | null> {
  const draft = await draftsStore.get(localDraftId);
  if (!draft) return null;

  const updated: DraftEntity = {
    ...draft,
    payload: deepClone(payload),
    lastEditedAt: Date.now(),
  };
  await draftsStore.put(updated);
  return updated;
}

/**
 * Mark a draft as superseded (e.g. when a newer draft exists for the same item). Drafts are never auto-deleted.
 */
export async function markDraftSuperseded(localDraftId: string): Promise<DraftEntity | null> {
  const draft = await draftsStore.get(localDraftId);
  if (!draft) return null;

  const updated: DraftEntity = {
    ...draft,
    status: 'superseded',
    lastEditedAt: Date.now(),
  };
  await draftsStore.put(updated);
  return updated;
}

/**
 * List drafts for a given org, app, and source item. Use sourceItemId === null for "new" item drafts.
 */
export async function listDraftsForItem(
  orgId: string,
  appId: string,
  sourceItemId: string | null
): Promise<DraftEntity[]> {
  const all = await draftsStore.listByOrgAndApp(orgId, appId);
  return all.filter((d) => d.sourceItemId === sourceItemId);
}

/**
 * Get the single active draft for an item, if any. Returns most recent by lastEditedAt when multiple exist.
 * Used by offline read path (priority 1: draft).
 */
export async function getActiveDraftForItem(
  orgId: string,
  appId: string,
  sourceItemId: string | null
): Promise<DraftEntity | null> {
  const drafts = await listDraftsForItem(orgId, appId, sourceItemId);
  const active = drafts.filter((d) => d.status === 'active');
  if (active.length === 0) return null;
  active.sort((a, b) => b.lastEditedAt - a.lastEditedAt);
  return active[0];
}

/**
 * Get the pre-edit snapshot for a draft (for undo/restore). Only present when draft was started via startDraftFromExisting.
 */
export async function getPreEditSnapshot(localDraftId: string): Promise<unknown | null> {
  const snapshot = await snapshotsStore.get(`${DRAFT_UNDO_PREFIX}${localDraftId}`);
  return snapshot?.payload ?? null;
}

/**
 * Result of a save attempt. Does NOT perform server write; guard only.
 */
export type SaveDraftAttemptResult =
  | { canSave: true }
  | { canSave: false; reason: 'draft_not_found' }
  | { canSave: false; reason: 'conflict'; conflictReason?: string };

/**
 * Save-time guard: run conflict check and mark draft conflicted if server changed.
 * Caller provides getCurrentServerMetadata (e.g. from API); this module does not call APIs.
 * Returns canSave so UI can block or prompt; does NOT block or write to server.
 */
export async function saveDraftAttempt(
  localDraftId: string,
  getCurrentServerMetadata: () => Promise<ServerMetadata>
): Promise<SaveDraftAttemptResult> {
  const draft = await draftsStore.get(localDraftId);
  if (!draft) return { canSave: false, reason: 'draft_not_found' };

  if (draft.sourceItemId == null) {
    return { canSave: true };
  }

  const conflictResult = await checkSaveTimeConflict(draft, getCurrentServerMetadata);
  if (conflictResult.hasConflict) {
    await markDraftConflicted(localDraftId);
    return {
      canSave: false,
      reason: 'conflict',
      conflictReason: conflictResult.reason,
    };
  }

  return { canSave: true };
}
