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
}: ViewSwitcherProps) {
  // Filter available lenses (box, board, canvas, book)
  const availableLenses = lenses.filter((lens) =>
    ['box', 'board', 'canvas', 'book', 'study'].includes(lens.type)
  );

  const handleViewSelect = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    onViewChange(view, lensId);
  };

  const baseButtonClass =
    'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200';
  const getSegmentClass = (isActive: boolean) =>
    isActive
      ? `${baseButtonClass} bg-slate-900 text-white shadow-sm`
      : `${baseButtonClass} bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900`;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1">
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
  );
}
