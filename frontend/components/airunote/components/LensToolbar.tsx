/**
 * LensToolbar Component
 * Thin wrapper around the shared ViewSwitcher so lens views use the
 * same control surface as grid and tree views.
 */

'use client';

import { useState } from 'react';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import { ViewSwitcher } from './ViewSwitcher';
import { ContentViewControls } from './ContentViewControls';
import type { ContentFilter, ContentSort } from '../utils/contentViewOptions';

interface LensToolbarProps {
  viewMode: 'grid' | 'tree' | 'lens';
  selectedLensId: string | null;
  currentLens: AiruLens | null;
  lenses: AiruLens[];
  folderId: string | null;
  orgId: string;
  placement?: 'fixed' | 'inline';
  onViewChange: (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => void;
  onCreateLens: () => void;
  onEditLens?: (lens: AiruLens) => void;
  onDeleteLens?: (lens: AiruLens) => void;
  onSetDefaultLens?: (lens: AiruLens) => void;
  onCreateFolder?: () => void;
  onCreateDocument?: () => void;
  onPasteDock?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearchRow?: boolean;
  contentFilter?: ContentFilter;
  onContentFilterChange?: (value: ContentFilter) => void;
  sortOrder?: ContentSort;
  onSortOrderChange?: (value: ContentSort) => void;
  resultCount?: number;
}

export function LensToolbar({
  viewMode,
  selectedLensId,
  currentLens,
  lenses,
  folderId,
  placement = 'fixed',
  onViewChange,
  onCreateLens,
  onEditLens,
  onDeleteLens,
  onSetDefaultLens,
  onCreateFolder,
  onCreateDocument,
  onPasteDock,
  searchValue,
  onSearchChange,
  showSearchRow = true,
  contentFilter, onContentFilterChange, sortOrder, onSortOrderChange, resultCount,
}: LensToolbarProps) {
  const [internalSearchValue, setInternalSearchValue] = useState('');

  // Filter available lenses (box, board, canvas, book for folders; desktop/saved for desktop)
  const availableLenses = lenses.filter((lens) => {
    if (folderId) {
      // Folder lenses
      return ['box', 'board', 'canvas', 'book', 'study'].includes(lens.type);
    } else {
      // Desktop/saved lenses
      return ['desktop', 'saved', 'canvas', 'board', 'study'].includes(lens.type);
    }
  });

  const resolvedSearchValue = searchValue ?? internalSearchValue;
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setInternalSearchValue(value);
  };

  return (
    <div
      className={
        placement === 'fixed'
          ? 'fixed right-4 top-20 z-40 w-[min(28rem,calc(100vw-2rem))]'
          : 'mx-auto w-full max-w-[1400px]'
      }
    >
      <div className={placement === 'fixed' ? 'min-w-[22rem]' : 'w-full'}>
        <ViewSwitcher
          bookFolderId={folderId}
          viewMode={viewMode}
          selectedLensId={selectedLensId}
          lenses={availableLenses}
          currentLens={currentLens}
          onViewChange={onViewChange}
          onCreateLens={onCreateLens}
          onEditLens={onEditLens}
          onDeleteLens={onDeleteLens}
          onSetDefaultLens={onSetDefaultLens}
          onCreateFolder={onCreateFolder}
          onCreateDocument={onCreateDocument}
          onPasteDock={onPasteDock}
        />

        {showSearchRow ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 py-1 sm:px-4">
            <div className="relative min-w-0 basis-full sm:min-w-[12rem] sm:flex-1 sm:basis-0">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                aria-label="Search notes"
                value={resolvedSearchValue}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search notes, tags, concepts..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {resolvedSearchValue ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-all duration-150 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>

            <ContentViewControls
              contentFilter={contentFilter} onContentFilterChange={onContentFilterChange}
              sortOrder={sortOrder} onSortOrderChange={onSortOrderChange} resultCount={resultCount}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
