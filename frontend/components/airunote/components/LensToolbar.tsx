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
import { useRouter } from 'next/navigation';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface LensToolbarProps {
  viewMode: 'grid' | 'tree' | 'lens';
  selectedLensId: string | null;
  currentLens: AiruLens | null;
  lenses: AiruLens[];
  folderId: string | null;
  orgId: string;
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
    <div className="fixed top-20 right-4 z-40 flex items-center gap-2">
      {/* View Switcher */}
      <div className="relative" ref={viewDropdownRef}>
        <button
          onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>{getActiveViewText()}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
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
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-75">
                        {typeLabels[lens.type] || lens.type}
                      </span>
                      <span className="flex-1 truncate">{lens.name}</span>
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
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-200"
            title="Lens actions"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Actions Menu */}
          {isActionsMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
              <div className="py-1">
                {onEditLens && (
                  <button
                    onClick={() => {
                      onEditLens(currentLens);
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Lens</span>
                  </button>
                )}
                {onDeleteLens && (
                  <button
                    onClick={() => {
                      onDeleteLens(currentLens);
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Lens</span>
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
