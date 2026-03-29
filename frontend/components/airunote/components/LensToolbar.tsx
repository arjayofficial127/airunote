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
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };

    if (isViewDropdownOpen || isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isViewDropdownOpen, isActionsMenuOpen]);

  // Filter available lenses (box, board, canvas, book for folders; desktop/saved for desktop)
  const availableLenses = lenses.filter((lens) => {
    if (folderId) {
      // Folder lenses
      return ['box', 'board', 'canvas', 'book'].includes(lens.type);
    } else {
      // Desktop/saved lenses
      return ['desktop', 'saved', 'canvas', 'board'].includes(lens.type);
    }
  });

  // Determine active lens
  const activeLens = selectedLensId
    ? availableLenses.find((l) => l.id === selectedLensId)
    : null;
  const activeLensTypeLabel = activeLens ? typeLabels[activeLens.type] || activeLens.type : null;

  const handleViewSelect = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    onViewChange(view, lensId);
    setIsViewDropdownOpen(false);
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

  return (
    <div
      className={
        placement === 'fixed'
          ? 'fixed right-4 top-20 z-40 flex items-center gap-3'
          : 'flex items-center gap-3'
      }
    >
      {/* View Switcher */}
      <div className="relative" ref={viewDropdownRef}>
        <button
          onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
          className="flex min-w-[15rem] max-w-[21rem] items-center gap-3 rounded-2xl border border-slate-300/90 bg-white/96 px-4 py-3 text-left shadow-[0_16px_32px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.18)] dark:border-slate-700/90 dark:bg-slate-900/94"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Active view
            </span>
            <span className="mt-1 flex items-center gap-2">
              {activeLensTypeLabel ? (
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {activeLensTypeLabel}
                </span>
              ) : null}
              <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{getActiveViewText()}</span>
            </span>
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
              isViewDropdownOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* View Dropdown Menu */}
        {isViewDropdownOpen && (
          <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Views</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Switch how this folder is presented</div>
            </div>
            <div className="py-2">
              {/* Grid Option */}
              <button
                onClick={() => handleViewSelect('grid')}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Grid</span>
              </button>

              {/* Tree Option */}
              <button
                onClick={() => handleViewSelect('tree')}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  viewMode === 'tree'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Tree</span>
              </button>

              {/* Divider - Only show if there are lenses */}
              {availableLenses.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              )}

              {/* Lens Options */}
              {availableLenses.map((lens) => {
                const isActive = viewMode === 'lens' && selectedLensId === lens.id;
                return (
                  <button
                    key={lens.id}
                    onClick={() => handleViewSelect('lens', lens.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {typeLabels[lens.type] || lens.type}
                      </span>
                      <span className="flex-1 truncate font-medium">{lens.name}</span>
                    </div>
                  </button>
                );
              })}

              {/* Create New Lens Option */}
              {folderId && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => {
                      onCreateLens();
                      setIsViewDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New Lens...</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions Menu (Edit/Delete) - Only show if lens is active */}
      {currentLens && (onEditLens || onDeleteLens) && (
        <div className="relative" ref={actionsMenuRef}>
          <button
            onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300/90 bg-white/96 shadow-[0_16px_32px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.18)] dark:border-slate-700/90 dark:bg-slate-900/94"
            title="Lens actions"
          >
            <svg className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Actions Menu */}
          {isActionsMenuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{currentLens.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{typeLabels[currentLens.type] || currentLens.type} lens</div>
              </div>
              <div className="py-1">
                {onEditLens && (
                  <button
                    onClick={() => {
                      onEditLens(currentLens);
                      setIsActionsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Customize lens</span>
                  </button>
                )}
                {/* Set as default lens action */}
                <button
                  onClick={() => {
                    // Intentionally delegate to parent via onViewChange so persistence behavior
                    // is handled in hooks/services rather than this UI component.
                    onViewChange('lens', currentLens.id);
                    setIsActionsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
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
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
      )}
    </div>
  );
}
