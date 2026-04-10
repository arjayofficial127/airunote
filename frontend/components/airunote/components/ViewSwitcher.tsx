/**
 * ViewSwitcher Component
 * Unified switcher for Grid, Tree, and Lenses
 *
 * Phase 2 refinement: persistent segmented control so the active view
 * is always visible and feels like part of the page header.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import { CreateEntryActions } from './CreateEntryActions';

interface ViewSwitcherProps {
  viewMode: 'grid' | 'tree' | 'lens';
  selectedLensId: string | null;
  lenses: AiruLens[];
  currentLens?: AiruLens | null;
  onViewChange: (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => void;
  onCreateLens?: () => void;
  onEditLens?: (lens: AiruLens) => void;
  onDeleteLens?: (lens: AiruLens) => void;
  onSetDefaultLens?: (lens: AiruLens) => void;
  onCreateFolder?: () => void;
  onCreateDocument?: () => void;
  onPasteDock?: () => void;
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

export function ViewSwitcher({
  viewMode,
  selectedLensId,
  lenses,
  currentLens = null,
  onViewChange,
  onCreateLens,
  onEditLens,
  onDeleteLens,
  onSetDefaultLens,
  onCreateFolder,
  onCreateDocument,
  onPasteDock,
}: ViewSwitcherProps) {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const activeLensMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const hasManagementActions = Boolean(onEditLens || onDeleteLens || onSetDefaultLens);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedMenu = actionsMenuRef.current?.contains(target);
      const clickedTrigger = activeLensMenuButtonRef.current?.contains(target);
      if (!clickedMenu && !clickedTrigger) {
        setIsActionsMenuOpen(false);
      }
    };

    if (isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isActionsMenuOpen]);

  useEffect(() => {
    if (!isActionsMenuOpen || !activeLensMenuButtonRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!activeLensMenuButtonRef.current) {
        return;
      }

      const triggerRect = activeLensMenuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        left: triggerRect.left,
        top: triggerRect.bottom + 8,
      });
    };

    updatePosition();

    const currentRail = railRef.current;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    currentRail?.addEventListener('scroll', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      currentRail?.removeEventListener('scroll', updatePosition);
    };
  }, [isActionsMenuOpen]);

  const availableLenses = lenses;

  const handleViewSelect = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    onViewChange(view, lensId);
  };

  const baseButtonClass =
    'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150';
  const getSegmentClass = (isActive: boolean, isLens = false) => {
    if (isActive && isLens) {
      return `${baseButtonClass} bg-black text-white shadow-sm hover:bg-black hover:text-white`;
    }

    if (isActive) {
      return `${baseButtonClass} bg-gray-100 text-gray-900`;
    }

    return `${baseButtonClass} bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-2 transition-all duration-150">
      <div className="min-w-0 flex flex-1 items-center gap-1">
        <div ref={railRef} className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto">
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
              <div key={lens.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleViewSelect('lens', lens.id)}
                  className={getSegmentClass(isActive, true)}
                  title={lens.name}
                >
                  <span>{typeLabels[lens.type] || lens.type}</span>
                </button>

                {isActive && hasManagementActions ? (
                  <button
                    ref={activeLensMenuButtonRef}
                    type="button"
                    onClick={() => {
                      if (!currentLens) {
                        return;
                      }
                      setIsActionsMenuOpen((current) => !current);
                    }}
                    disabled={!currentLens}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                    title={currentLens ? 'Manage selected lens' : 'Select a lens to manage it'}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                ) : null}
              </div>
            );
          })}

          {onCreateLens ? (
            <button
              type="button"
              onClick={onCreateLens}
              className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
              title="Create lens"
            >
              + Lens
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onCreateFolder && onCreateDocument ? (
          <CreateEntryActions
            onCreateFolder={onCreateFolder}
            onCreateDocument={onCreateDocument}
            onPasteDock={onPasteDock}
          />
        ) : null}
      </div>

      {isActionsMenuOpen && currentLens && menuPosition ? (
        <div
          ref={actionsMenuRef}
          className="fixed z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.18)]"
          style={{ left: menuPosition.left, top: menuPosition.top }}
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="truncate text-sm font-semibold text-slate-900">{currentLens.name}</div>
            <div className="mt-1 text-xs text-slate-500">{typeLabels[currentLens.type] || currentLens.type} lens</div>
          </div>
          <div className="py-1">
            {onEditLens ? (
              <button
                type="button"
                onClick={() => {
                  onEditLens(currentLens);
                  setIsActionsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Manage lens</span>
              </button>
            ) : null}

            {onSetDefaultLens ? (
              <button
                type="button"
                onClick={() => {
                  onSetDefaultLens(currentLens);
                  setIsActionsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                </svg>
                <span>Set as default view</span>
              </button>
            ) : null}

            {onDeleteLens ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteLens(currentLens);
                  setIsActionsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete lens</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
