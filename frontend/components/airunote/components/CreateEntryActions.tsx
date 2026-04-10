'use client';

import { useEffect, useRef, useState } from 'react';

interface CreateEntryActionsProps {
  onCreateFolder: () => void;
  onCreateDocument: () => void;
  onPasteDock?: () => void;
  className?: string;
}

export function CreateEntryActions({
  onCreateFolder,
  onCreateDocument,
  onPasteDock,
  className = '',
}: CreateEntryActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
          title="Create new content"
        >
          <span>New</span>
          <svg className={`h-4 w-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen ? (
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => {
                onCreateDocument();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition-all duration-150 hover:bg-gray-50"
              title="Create a new note in this folder"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>New Note</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onCreateFolder();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition-all duration-150 hover:bg-gray-50"
              title="Create a new folder inside this workspace"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>New Folder</span>
            </button>
          </div>
        ) : null}
      </div>

      {onPasteDock ? (
        <button
          onClick={onPasteDock}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
          title="Paste Dock - Quick paste and save"
        >
          Paste Dock
        </button>
      ) : null}
    </div>
  );
}