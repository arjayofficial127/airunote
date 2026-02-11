'use client';

/**
 * Feb042026.6.1 — Manual Sync UI (Read-Only Preview)
 * 
 * READ-ONLY sync preview panel that shows:
 * - Drafts vs server state
 * - Freshness and conflicts
 * - NO writes, NO merges, NO server mutation
 */

import { useCallback, useEffect, useState } from 'react';
import { getSyncPreviewForOrg, type SyncItemPreview } from '@/lib/sync/syncPreviewService';

export interface SyncPreviewPanelProps {
  orgId: string;
}

function formatDate(ts: number | string | null | undefined): string {
  if (!ts) return 'Unknown';
  const date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return date.toLocaleString();
}

function getStatusBadgeColor(status: SyncItemPreview['status']): string {
  switch (status) {
    case 'clean':
      return 'bg-green-100 text-green-800';
    case 'draft_only':
      return 'bg-yellow-100 text-yellow-800';
    case 'conflict':
      return 'bg-red-100 text-red-800';
    case 'offline_only':
      return 'bg-gray-100 text-gray-800';
    case 'server_deleted':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusLabel(status: SyncItemPreview['status']): string {
  switch (status) {
    case 'clean':
      return 'Clean';
    case 'draft_only':
      return 'Draft Only';
    case 'conflict':
      return 'Conflict';
    case 'offline_only':
      return 'Offline Only';
    case 'server_deleted':
      return 'Server Deleted';
    default:
      return 'Unknown';
  }
}

export default function SyncPreviewPanel({ orgId }: SyncPreviewPanelProps) {
  const [previews, setPreviews] = useState<SyncItemPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await getSyncPreviewForOrg(orgId);
      setPreviews(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sync preview');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-gray-600">Loading sync preview…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600">Error: {error}</div>
        <button
          onClick={load}
          className="mt-2 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (previews.length === 0) {
    return (
      <div className="p-4">
        <div className="text-gray-600">No drafts or offline content to sync.</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Sync Preview</h2>
        <p className="text-sm text-gray-600 mt-1">
          Read-only view of drafts, offline content, and server state. No actions are performed.
        </p>
      </div>

      <div className="space-y-3">
        {previews.map((preview, idx) => (
          <div
            key={`${preview.appId}:${preview.sourceItemId ?? 'new'}:${idx}`}
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {preview.sourceItemId ? `Item ${preview.sourceItemId}` : 'New Item'}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusBadgeColor(preview.status)}`}
                  >
                    {getStatusLabel(preview.status)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  App: {preview.appId}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <span className="text-gray-600">Draft:</span>{' '}
                <span className={preview.hasDraft ? 'text-green-600' : 'text-gray-400'}>
                  {preview.hasDraft ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Offline Copy:</span>{' '}
                <span className={preview.hasOfflineCopy ? 'text-green-600' : 'text-gray-400'}>
                  {preview.hasOfflineCopy ? 'Yes' : 'No'}
                </span>
              </div>
              {preview.lastDraftEditAt && (
                <div>
                  <span className="text-gray-600">Draft Edited:</span>{' '}
                  <span className="text-gray-900">{formatDate(preview.lastDraftEditAt)}</span>
                </div>
              )}
              {preview.lastServerUpdateAt && (
                <div>
                  <span className="text-gray-600">Server Updated:</span>{' '}
                  <span className="text-gray-900">{formatDate(preview.lastServerUpdateAt)}</span>
                </div>
              )}
            </div>

            {preview.hasConflict && preview.conflictReason && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                Conflict: {preview.conflictReason.replace('_', ' ')}
              </div>
            )}

            <div className="flex gap-2">
              {preview.hasDraft && preview.draftId && (
                <button
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                  onClick={() => {
                    // TODO: Navigate to draft view (future implementation)
                    console.log('View draft:', preview.draftId);
                  }}
                >
                  View Draft
                </button>
              )}
              {preview.sourceItemId && (
                <button
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                  onClick={() => {
                    // TODO: Navigate to server view (read-only) (future implementation)
                    console.log('View server (read-only):', preview.sourceItemId);
                  }}
                >
                  View Server (read-only)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
