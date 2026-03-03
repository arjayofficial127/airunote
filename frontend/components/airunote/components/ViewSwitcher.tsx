/**
 * ViewSwitcher Component
 * Unified switcher for Grid, Tree, and Lenses
 * 
 * Single source of truth - shows all views in a dropdown
 * - Grid and Tree are always in the dropdown
 * - Lenses are added to the dropdown when they exist
 * - No separate buttons, everything is in one dropdown
 */

'use client';

import { useState, useRef, useEffect } from 'react';
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
};

export function ViewSwitcher({
  viewMode,
  selectedLensId,
  lenses,
  onViewChange,
  onCreateLens,
  folderId,
}: ViewSwitcherProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Filter available lenses (box, board, canvas, book)
  const availableLenses = lenses.filter((lens) =>
    ['box', 'board', 'canvas', 'book'].includes(lens.type)
  );

  // Determine active lens
  const activeLens = selectedLensId
    ? availableLenses.find((l) => l.id === selectedLensId)
    : null;

  const handleViewSelect = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    onViewChange(view, lensId);
    setIsDropdownOpen(false);
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
    <div className="flex items-center gap-2">
      {/* Unified Dropdown - Contains Grid, Tree, and all Lenses */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 flex items-center gap-2 ${
            viewMode === 'grid' || viewMode === 'tree' || viewMode === 'lens'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <span>{getActiveViewText()}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isDropdownOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu - Includes Grid, Tree, and all Lenses */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="py-1">
              {/* Grid Option */}
              <button
                onClick={() => handleViewSelect('grid')}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Grid</span>
                </div>
              </button>

              {/* Tree Option */}
              <button
                onClick={() => handleViewSelect('tree')}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Tree</span>
                </div>
              </button>

              {/* Divider - Only show if there are lenses */}
              {availableLenses.length > 0 && (
                <div className="border-t border-gray-200 my-1" />
              )}

              {/* Lens Options */}
              {availableLenses.map((lens) => {
                const isActive = viewMode === 'lens' && selectedLensId === lens.id;
                return (
                  <button
                    key={lens.id}
                    onClick={() => handleViewSelect('lens', lens.id)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-75">
                        {typeLabels[lens.type] || lens.type}
                      </span>
                      <span>{lens.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* + Lens Button - Always show if folderId exists */}
      {folderId && (
        <button
          onClick={onCreateLens}
          className="px-3 py-1 text-sm rounded-md transition-colors duration-150 bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center gap-1"
          title="Create Lens"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Lens
        </button>
      )}
    </div>
  );
}
