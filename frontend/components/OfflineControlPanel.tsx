'use client';

/**
 * Phase 3 — Offline control panel (Step 3.5). Minimal UI.
 * User visibility and control; user-initiated cleanup only. No automation, no punishment.
 */

import { useCallback, useEffect, useState } from 'react';
import { openDb } from '@/lib/offline/offlineDb';
import {
  clearOfflineData,
  discardDrafts,
  exportSnapshot,
  getDraftsList,
  getOfflineContentList,
  getOfflineSummary,
  getPerItemInfo,
  getSnapshotsList,
  importSnapshot,
  removeOfflineCopy,
  type OfflinePerItemInfo,
  type OfflineSummary,
} from '@/lib/offline/offlineSummaryService';
import type { DraftEntity } from '@/lib/offline/stores/drafts.store';
import type { OfflineContentEntity } from '@/lib/offline/stores/offlineContent.store';
import type { SnapshotEntity } from '@/lib/offline/stores/snapshots.store';
import SyncPreviewPanel from '@/components/sync/SyncPreviewPanel';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export interface OfflineControlPanelProps {
  orgId: string;
  appId?: string | null;
}

export default function OfflineControlPanel({ orgId, appId }: OfflineControlPanelProps) {
  const [summary, setSummary] = useState<OfflineSummary | null>(null);
  const [perItemInfo, setPerItemInfo] = useState<OfflinePerItemInfo[]>([]);
  const [drafts, setDrafts] = useState<DraftEntity[]>([]);
  const [offlineContent, setOfflineContent] = useState<OfflineContentEntity[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [importJson, setImportJson] = useState('');

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      await openDb();
      const [sum, items, draftList, offlineList, snapList] = await Promise.all([
        getOfflineSummary(orgId, appId),
        appId ? getPerItemInfo(orgId, appId) : Promise.resolve([]),
        getDraftsList(orgId, appId),
        getOfflineContentList(orgId, appId),
        getSnapshotsList(orgId, appId),
      ]);
      setSummary(sum);
      setPerItemInfo(items);
      setDrafts(draftList);
      setOfflineContent(offlineList);
      setSnapshots(snapList);
      setSelectedDraftIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [orgId, appId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemoveOfflineCopy = async (offlineItemId: string) => {
    try {
      await removeOfflineCopy(offlineItemId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  };

  const handleDiscardDrafts = async () => {
    if (selectedDraftIds.size === 0) return;
    if (!confirm(`Discard ${selectedDraftIds.size} draft(s)? This cannot be undone.`)) return;
    try {
      await discardDrafts(Array.from(selectedDraftIds));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discard failed');
    }
  };

  const handleExportSnapshot = async (snapshotId: string) => {
    try {
      const json = await exportSnapshot(snapshotId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapshot-${snapshotId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const handleImportSnapshot = async () => {
    if (!importJson.trim()) return;
    try {
      await importSnapshot(importJson.trim());
      setImportJson('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
  };

  const handleClearOfflineData = async () => {
    const scope = appId ? `this app (${appId})` : 'this organization';
    if (!confirm(`Clear ALL offline data for ${scope}? Drafts, offline copies, cache, and snapshots will be removed. This cannot be undone.`)) return;
    try {
      await clearOfflineData(orgId, appId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clear failed');
    }
  };

  const toggleDraftSelection = (localDraftId: string) => {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(localDraftId)) next.delete(localDraftId);
      else next.add(localDraftId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-600">
        Loading offline data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        {error}
        <button type="button" onClick={load} className="ml-2 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl">
      <h2 className="text-xl font-semibold text-gray-900">Offline data</h2>

      {/* Summary */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
        <p className="text-sm text-gray-600">
          Offline enabled: <strong>{summary.offlineEnabled ? 'Yes' : 'No'}</strong>
        </p>
        <p className="text-sm text-gray-600">
          Estimated size: <strong>{formatBytes(summary.totalEstimatedSize)}</strong>
        </p>
        <p className="text-sm text-gray-600">
          Drafts: {summary.counts.drafts} · Offline saved: {summary.counts.offlineSavedItems} ·
          Metadata cache: {summary.counts.metadataEntries} · Snapshots: {summary.counts.snapshots}
        </p>
        <p className="text-sm text-gray-500">Last updated: {formatDate(summary.lastUpdatedAt)}</p>
      </section>

      {/* Per-item info */}
      {perItemInfo.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-2">Per item</h3>
          <ul className="text-sm space-y-1">
            {perItemInfo.map((item) => (
              <li key={item.itemId} className="flex gap-2 flex-wrap">
                <span className="font-mono">{item.itemId}</span>
                <span>drafts: {item.draftCount}</span>
                {item.offlineSaved && <span>· offline saved</span>}
                {item.conflictStatus === 'conflicted' && <span className="text-amber-600">· conflicted</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-2">Drafts</h3>
          <p className="text-sm text-gray-600 mb-2">Select drafts to discard (user-initiated only).</p>
          <ul className="space-y-2 mb-3">
            {drafts.map((d) => (
              <li key={d.localDraftId} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDraftIds.has(d.localDraftId)}
                  onChange={() => toggleDraftSelection(d.localDraftId)}
                  className="rounded border-gray-300"
                />
                <span className="font-mono">{d.localDraftId.slice(0, 8)}…</span>
                <span>source: {d.sourceItemId ?? 'new'}</span>
                <span className="text-gray-500">{d.status}</span>
                <span className="text-gray-400">{formatDate(d.lastEditedAt)}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleDiscardDrafts}
            disabled={selectedDraftIds.size === 0}
            className="px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 disabled:opacity-50"
          >
            Discard selected ({selectedDraftIds.size})
          </button>
        </section>
      )}

      {/* Offline content */}
      {offlineContent.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-2">Offline saved copies</h3>
          <p className="text-sm text-gray-600 mb-2">Remove offline copy only (server data is kept).</p>
          <ul className="space-y-2">
            {offlineContent.map((o) => (
              <li key={o.offlineItemId} className="flex items-center justify-between text-sm">
                <span className="font-mono">{o.sourceItemId}</span>
                <span className="text-gray-500">{formatDate(o.savedAt)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveOfflineCopy(o.offlineItemId)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Snapshots */}
      {snapshots.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-2">Snapshots</h3>
          <ul className="space-y-2 mb-3">
            {snapshots.map((s) => (
              <li key={s.snapshotId} className="flex items-center justify-between text-sm">
                <span className="font-mono">{s.snapshotId.slice(0, 20)}…</span>
                <span className="text-gray-500">{formatBytes(s.estimatedSize)} · {formatDate(s.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => handleExportSnapshot(s.snapshotId)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                >
                  Export
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Import snapshot */}
      <section className="rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-2">Import snapshot</h3>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder="Paste snapshot JSON…"
          rows={3}
          className="w-full text-sm border border-gray-300 rounded p-2 font-mono"
        />
        <button
          type="button"
          onClick={handleImportSnapshot}
          disabled={!importJson.trim()}
          className="mt-2 px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Import
        </button>
      </section>

      {/* Sync Preview */}
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">Sync & Conflicts (Preview)</h3>
        <p className="text-sm text-blue-800 mb-3">
          Read-only preview of drafts vs server state. No actions are performed.
        </p>
        <SyncPreviewPanel orgId={orgId} />
      </section>

      {/* Clear all */}
      <section className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-medium text-red-900 mb-2">Clear offline data</h3>
        <p className="text-sm text-red-800 mb-2">
          Remove all offline data for {appId ? `app ${appId}` : 'this organization'}. User-initiated only. Cannot be undone.
        </p>
        <button
          type="button"
          onClick={handleClearOfflineData}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear offline data
        </button>
      </section>
    </div>
  );
}
