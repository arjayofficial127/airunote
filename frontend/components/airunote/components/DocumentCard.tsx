/**
 * DocumentCard Component
 * Unified card component that renders documents/folders in different view modes
 * Single source of truth for document presentation
 */

'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileTypeChip } from './FileTypeChip';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import { useDocumentContent } from '../hooks/useDocumentContent';
import type { ViewMode } from '@/lib/api/airunoteLensesApi';
import type { AiruDocumentMetadata } from '../types';

interface DocumentCardProps {
  document: AiruDocumentMetadata;
  mode: ViewMode;
  orgId: string;
  onViewModeChange?: (mode: ViewMode | null) => void;
  showViewModeControl?: boolean;
  onMove?: (document: AiruDocumentMetadata) => void;
  onDelete?: (document: AiruDocumentMetadata) => void;
}

export function DocumentCard({
  document,
  mode,
  orgId,
  onViewModeChange,
  showViewModeControl = false,
  onMove,
  onDelete,
}: DocumentCardProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const [isViewModeDropdownOpen, setIsViewModeDropdownOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: document.id,
    data: {
      type: 'document',
      documentId: document.id,
      folderId: document.folderId,
    },
  });

  // Fetch document content if needed for preview/full modes
  const { document: documentData } = useDocumentContent(
    (mode === 'preview' || mode === 'full') ? document.id : null
  );
  const documentContent = documentData?.content || null;

  const documentPath = `/orgs/${orgIdFromParams}/airunote/document/${document.id}`;
  const dragStyle = {
    transform: `${CSS.Translate.toString(transform)}${transform ? ' scale(1.03)' : ''}`,
    opacity: isDragging ? 0.6 : 1,
    transition: 'transform 160ms ease, opacity 160ms ease',
  };

  const getDocumentIcon = (type: 'TXT' | 'MD' | 'RTF') => {
    switch (type) {
      case 'TXT':
        return '📄';
      case 'MD':
        return '📝';
      case 'RTF':
        return '📋';
      default:
        return '📄';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderContent = () => {
    switch (mode) {
      case 'list':
        return (
          <div className="flex items-center space-x-3 flex-1 min-w-0 mb-3">
            <span className="text-2xl flex-shrink-0">{getDocumentIcon(document.type)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {document.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(document.createdAt)}
              </p>
            </div>
          </div>
        );

      case 'icon':
        return (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">{getDocumentIcon(document.type)}</span>
            <span className="text-xs font-medium text-gray-900 text-center truncate max-w-[80px]">
              {document.name}
            </span>
          </div>
        );

      case 'preview':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getDocumentIcon(document.type)}</span>
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {document.name}
              </h3>
            </div>
            {documentContent && (
              <p className="text-xs text-gray-600 line-clamp-3">
                {documentContent.substring(0, 150)}...
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <FileTypeChip type={document.type} />
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">Updated {formatDate(document.updatedAt)}</span>
            </div>
          </div>
        );

      case 'full':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getDocumentIcon(document.type)}</span>
              <h3 className="text-sm font-medium text-gray-900">
                {document.name}
              </h3>
            </div>
            {documentContent && (
              <div className="text-xs text-gray-700 whitespace-pre-wrap max-h-[300px] overflow-auto mb-2">
                {documentContent}
              </div>
            )}
            <div className="flex items-center gap-2">
              <FileTypeChip type={document.type} />
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">Updated {formatDate(document.updatedAt)}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getCardSize = () => {
    switch (mode) {
      case 'list':
        return 'w-full';
      case 'icon':
        return 'w-24 h-24';
      case 'preview':
        return 'w-full';
      case 'full':
        return 'w-full';
      default:
        return 'w-full';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      onContextMenu={(e) => {
        if (!onMove) return;
        e.preventDefault();
        e.stopPropagation();
        onMove(document);
      }}
      className={`group relative ${getCardSize()} border border-gray-200 rounded-lg bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all duration-150 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <Link href={documentPath} className="block p-4 cursor-pointer">
        {renderContent()}
      </Link>
      {(onMove || onDelete) && mode === 'list' && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity duration-150">
          {onMove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMove(document);
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-150"
              title="Move document"
            >
              Move
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(document);
              }}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors duration-150"
              title="Delete document"
            >
              Delete
            </button>
          )}
        </div>
      )}
      {showViewModeControl && onViewModeChange && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsViewModeDropdownOpen(!isViewModeDropdownOpen);
              }}
              className="p-1 text-xs text-gray-500 hover:text-gray-700 bg-white rounded"
              title={`View mode: ${mode}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
            {isViewModeDropdownOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  {(['list', 'icon', 'preview', 'full'] as ViewMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewModeChange(m);
                        setIsViewModeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        mode === m
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewModeChange(null);
                      setIsViewModeDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
