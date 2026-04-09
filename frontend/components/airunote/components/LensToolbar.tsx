/**
 * LensToolbar Component
 * Floating toolbar for Canvas/Board views
 * Modern UI/UX - Always visible, non-intrusive
 * 
 * Features:
 * - View switcher (Grid, Tree, Lenses)
 * - Create new lens
 * - Edit/Delete current lens (if applicable)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import { ViewSwitcher } from './ViewSwitcher';

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
}

const typeLabels: Record<string, string> = {
  box: 'Box',
  board: 'Board',
  canvas: 'Canvas',
  book: 'Book',
  study: 'Study',
  desktop: 'Desktop',
  saved: 'Saved',
};

export function LensToolbar({
  viewMode,
  selectedLensId,
  currentLens,
  lenses,
  folderId,
  orgId,
  placement = 'fixed',
  onViewChange,
  onCreateLens,
  onEditLens,
  onDeleteLens,
}: LensToolbarProps) {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };

    if (isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isActionsMenuOpen]);

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

  // Determine active lens
  const activeLens = selectedLensId ? availableLenses.find((l) => l.id === selectedLensId) : null;
  const headingText = activeLens?.type === 'study' ? 'Study Lens' : activeLens?.name || 'Lens';

  return (
    <div
      className={
        placement === 'fixed'
          ? 'fixed right-4 top-20 z-40 w-[min(28rem,calc(100vw-2rem))]'
          : 'mx-auto w-full max-w-[1400px]'
      }
    >
      <div className={`flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${placement === 'fixed' ? 'min-w-[22rem]' : 'w-full'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 truncate text-lg font-semibold tracking-[-0.02em] text-slate-900">{headingText}</div>

          <div className="flex shrink-0 items-center gap-2 self-start">
            {folderId ? (
              <button
                type="button"
                onClick={onCreateLens}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Lens</span>
              </button>
            ) : null}

            {currentLens && (onEditLens || onDeleteLens) ? (
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  title="Manage lens"
                >
                  <svg className="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {isActionsMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <div className="truncate text-sm font-semibold text-slate-900">{currentLens.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{typeLabels[currentLens.type] || currentLens.type} lens</div>
                    </div>
                    <div className="py-1">
                      {onEditLens && (
                        <button
                          onClick={() => {
                            onEditLens(currentLens);
                            setIsActionsMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Manage lens</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onViewChange('lens', currentLens.id);
                          setIsActionsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                        </svg>
                        <span>Set as default view</span>
                      </button>
                      {onDeleteLens && (
                        <button
                          onClick={() => {
                            onDeleteLens(currentLens);
                            setIsActionsMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete lens</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <ViewSwitcher
            viewMode={viewMode}
            selectedLensId={selectedLensId}
            lenses={availableLenses}
            onViewChange={onViewChange}
          />
        </div>
      </div>
    </div>
  );
}
