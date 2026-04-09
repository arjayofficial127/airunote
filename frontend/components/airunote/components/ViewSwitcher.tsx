/**
 * ViewSwitcher Component
 * Unified switcher for Grid, Tree, and Lenses
 *
 * Phase 2 refinement: persistent segmented control so the active view
 * is always visible and feels like part of the page header.
 */

'use client';

import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface ViewSwitcherProps {
  viewMode: 'grid' | 'tree' | 'lens';
  selectedLensId: string | null;
  lenses: AiruLens[];
  onViewChange: (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => void;
  onCreateLens: () => void;
  folderId: string | null;
}

const typeLabels: Record<string, string> = {
  box: 'Box',
  board: 'Board',
  canvas: 'Canvas',
  book: 'Book',
  study: 'Study',
};

export function ViewSwitcher({
  viewMode,
  selectedLensId,
  lenses,
  onViewChange,
  onCreateLens,
  folderId,
}: ViewSwitcherProps) {
  // Filter available lenses (box, board, canvas, book)
  const availableLenses = lenses.filter((lens) =>
    ['box', 'board', 'canvas', 'book', 'study'].includes(lens.type)
  );

  // Determine active lens
  const activeLens = selectedLensId
    ? availableLenses.find((l) => l.id === selectedLensId)
    : null;

  const handleViewSelect = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    onViewChange(view, lensId);
  };

  // Get display text for active view
  const getActiveViewText = () => {
    if (viewMode === 'grid') return 'Grid';
    if (viewMode === 'tree') return 'Tree';
    if (activeLens) {
      return `${typeLabels[activeLens.type] || activeLens.type} ${activeLens.name}`;
    }
    return 'Select View';
  };

  const baseButtonClass =
    'inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200';
  const getSegmentClass = (isActive: boolean) =>
    isActive
      ? `${baseButtonClass} bg-slate-900 text-white shadow-sm`
      : `${baseButtonClass} bg-transparent text-slate-600 hover:bg-white hover:text-slate-900`;
  const activeLensTypeLabel = activeLens ? (typeLabels[activeLens.type] || activeLens.type) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Active View
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-900">{getActiveViewText()}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
            {availableLenses.length} lens{availableLenses.length === 1 ? '' : 'es'}
          </span>
          {activeLensTypeLabel ? (
            <span className="rounded-full border border-sky-200/80 bg-sky-50 px-2.5 py-1 font-medium text-sky-700">
              {activeLensTypeLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5">
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleViewSelect('grid')}
              className={getSegmentClass(viewMode === 'grid')}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => handleViewSelect('tree')}
              className={getSegmentClass(viewMode === 'tree')}
            >
              Tree
            </button>

            {availableLenses.map((lens) => {
              const isActive = viewMode === 'lens' && selectedLensId === lens.id;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => handleViewSelect('lens', lens.id)}
                  className={getSegmentClass(isActive)}
                  title={lens.name}
                >
                  <span>{typeLabels[lens.type] || lens.type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {folderId && (
          <button
            type="button"
            onClick={onCreateLens}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Lens</span>
          </button>
        )}
      </div>
    </div>
  );
}
