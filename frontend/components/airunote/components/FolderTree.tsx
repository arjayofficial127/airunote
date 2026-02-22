/**
 * FolderTree Component
 * Displays nested folder structure with navigation
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAirunoteStore } from '../stores/airunoteStore';
import { FolderCountBadge } from './FolderCountBadge';
import type { AiruFolder, FolderTreeResponse } from '../types';

interface FolderTreeProps {
  tree: FolderTreeResponse;
  currentFolderId?: string;
  orgId: string;
}

export function FolderTree({ tree, currentFolderId, orgId }: FolderTreeProps) {
  const params = useParams();
  const orgIdFromParams = (params.orgId as string) || orgId;
  const { getFolderCounts } = useAirunoteStore();
  
  // Track expanded folders and Home
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isHomeExpanded, setIsHomeExpanded] = useState(true); // Home expanded by default

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const renderFolder = (
    folder: AiruFolder,
    level: number,
    hasChildren: boolean
  ) => {
    const isActive = folder.id === currentFolderId;
    const folderPath = `/orgs/${orgIdFromParams}/airunote/folder/${folder.id}`;
    const counts = getFolderCounts(folder.id);
    const isExpanded = expandedFolders.has(folder.id);

    // Calculate consistent indentation width
    const indentWidth = 12 + level * 16;
    const chevronWidth = 20; // Button + icon width

    return (
      <div key={folder.id} className="mb-1">
        <div className="flex items-center">
          <div style={{ width: `${indentWidth}px` }} />
          {hasChildren ? (
            <button
              onClick={(e) => toggleFolder(folder.id, e)}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
              style={{ width: `${chevronWidth}px` }}
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
            <div style={{ width: `${chevronWidth}px` }} className="flex-shrink-0" />
          )}
          <Link
            href={folderPath}
            className={`flex items-center justify-between flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center flex-1 min-w-0">
              <span className="mr-2">📁</span>
              <span className="truncate">{folder.humanId}</span>
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
      </div>
    );
  };

  const renderTree = (node: FolderTreeResponse, level: number = 0) => {
    return (
      <div key={node.folders[0]?.id || 'root'}>
        {node.folders.map((folder) => {
          const hasChildren = node.children.some((child) => 
            child.folders.some((f) => f.parentFolderId === folder.id)
          );
          const isExpanded = expandedFolders.has(folder.id);
          
          return (
            <div key={folder.id}>
              {renderFolder(folder, level, hasChildren)}
              {hasChildren && isExpanded && node.children
                .filter((child) => child.folders.some((f) => f.parentFolderId === folder.id))
                .map((child) => renderTree(child, level + 1))}
            </div>
          );
        })}
      </div>
    );
  };

  // Check if Home has children (root-level folders)
  const homeHasChildren = tree.folders.length > 0;

  return (
    <div className="w-full">
      <div className="mb-2">
        <div className="flex items-center">
          {homeHasChildren ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsHomeExpanded(!isHomeExpanded);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
              style={{ width: '20px' }}
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isHomeExpanded ? 'rotate-90' : ''}`}
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
            <div style={{ width: '20px' }} />
          )}
          <Link
            href={`/orgs/${orgIdFromParams}/airunote`}
            className={`flex items-center flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
              !currentFolderId
                ? 'bg-blue-100 text-blue-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="mr-2">🏠</span>
            Home
          </Link>
        </div>
      </div>
      {isHomeExpanded && renderTree(tree)}
    </div>
  );
}
