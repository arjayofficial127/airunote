/**
 * FolderTreeView Component
 * Tree view for main content area (similar to Knowledge Base UI)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAirunoteStore } from '../stores/airunoteStore';
import { FolderCountBadge } from './FolderCountBadge';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import type { AiruFolder, AiruDocumentMetadata } from '../types';

interface FolderTreeViewProps {
  folders: AiruFolder[];
  documents: AiruDocumentMetadata[];
  currentFolderId?: string;
  orgId: string;
  parentFolderId?: string | null;
}

export function FolderTreeView({
  folders,
  documents,
  currentFolderId,
  orgId,
  parentFolderId = null,
}: FolderTreeViewProps) {
  const params = useParams();
  const orgIdFromParams = (params.orgId as string) || orgId;
  const { getFolderCounts, getFoldersByParent, getDocumentsByFolder } = useAirunoteStore();
  
  // Track expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder: AiruFolder, level: number = 0) => {
    const isActive = folder.id === currentFolderId;
    const folderPath = `/orgs/${orgIdFromParams}/airunote/folder/${folder.id}`;
    const counts = getFolderCounts(folder.id);
    const childFolders = getFoldersByParent(folder.id);
    const hasChildren = childFolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id} className="mb-1">
        <div className="flex items-center group">
          {hasChildren ? (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <div className="w-6 mr-2" />
          )}
          <Link
            href={folderPath}
            className={`flex items-center justify-between flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${level * 20}px` }}
          >
            <div className="flex items-center flex-1 min-w-0">
              <span className="mr-2 text-lg">{getFolderTypeIcon(folder.type)}</span>
              <span className="truncate font-medium">{folder.humanId}</span>
            </div>
            <FolderCountBadge
              directFolders={counts.directFolders}
              directFiles={counts.directFiles}
              subFolders={counts.subFolders}
              subFiles={counts.subFiles}
              compact={true}
            />
          </Link>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-6">
            <FolderTreeView
              folders={childFolders}
              documents={getDocumentsByFolder(folder.id)}
              currentFolderId={currentFolderId}
              orgId={orgId}
              parentFolderId={folder.id}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {folders.map((folder) => renderFolder(folder, 0))}
      {documents.length > 0 && (
        <div className="mt-2">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/orgs/${orgIdFromParams}/airunote/document/${doc.id}`}
              className="flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors mb-1"
              style={{ paddingLeft: '26px' }}
            >
              <span className="mr-2">📄</span>
              <span className="truncate">{doc.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
