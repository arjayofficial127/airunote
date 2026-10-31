'use client';

import type { ContentFilter, ContentSort } from '../utils/contentViewOptions';

interface ContentViewControlsProps {
  contentFilter?: ContentFilter;
  onContentFilterChange?: (value: ContentFilter) => void;
  sortOrder?: ContentSort;
  onSortOrderChange?: (value: ContentSort) => void;
  resultCount?: number;
}

export function ContentViewControls({
  contentFilter = 'all', onContentFilterChange,
  sortOrder = 'updated', onSortOrderChange, resultCount,
}: ContentViewControlsProps) {
  const selectClass = 'min-h-10 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {resultCount !== undefined && <span role="status" className="mr-1 text-xs text-slate-500">{resultCount} {resultCount === 1 ? 'item' : 'items'}</span>}
      {onContentFilterChange && (
        <select aria-label="Show content type" value={contentFilter} onChange={(event) => onContentFilterChange(event.target.value as ContentFilter)} className={selectClass}>
          <option value="all">All content</option><option value="documents">Documents</option><option value="folders">Folders</option>
        </select>
      )}
      {onSortOrderChange && (
        <select aria-label="Sort content" value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value as ContentSort)} className={selectClass}>
          <option value="updated">Recently updated</option><option value="name">Name A–Z</option><option value="created">Newest created</option>
        </select>
      )}
    </div>
  );
}
