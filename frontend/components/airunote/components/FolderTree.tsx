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
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import type { AiruFolder, FolderTreeResponse } from '../types';

interface FolderTreeProps {
  tree: FolderTreeResponse;
  currentFolderId?: string;
  orgId: string;
  showHome?: boolean;
}

export function FolderTree({ tree, currentFolderId, orgId, showHome = true }: FolderTreeProps) {
  const params = useParams();
  const orgIdFromParams = (params.orgId as string) || orgId;
  const { getFolderCounts } = useAirunoteStore();
  const expandColumnWidth = 16;
  const iconColumnWidth = 20;
  const rightColumnMinWidth = 60;
  const trailingChevronWidth = 16;
  
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

    const indentWidth = level === 0 ? 0 : level * 24;

    return (
      <div key={folder.id} className="mb-1">
        <div className="flex min-w-0 items-center" style={{ paddingLeft: `${indentWidth}px` }}>
          {hasChildren ? (
            <button
              onClick={(e) => toggleFolder(folder.id, e)}
              className="flex h-4 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-200"
              style={{ width: `${expandColumnWidth}px` }}
            >
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
            <div style={{ width: `${expandColumnWidth}px` }} className="flex h-4 flex-shrink-0 items-center justify-center" />
          )}
          <Link
            href={folderPath}
            className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md py-2 pl-2 pr-3 text-sm transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="flex flex-shrink-0 items-center justify-center"
                style={{ width: `${iconColumnWidth}px` }}
              >
                {getFolderTypeIcon(folder.type)}
              </span>
              <span className="min-w-0 flex-1 break-words leading-5">{folder.humanId}</span>
            </div>
            <div
              className="flex flex-shrink-0 items-center justify-end gap-2"
              style={{ minWidth: `${rightColumnMinWidth}px` }}
            >
              <FolderCountBadge
                directFolders={counts.directFolders}
                directFiles={counts.directFiles}
                subFolders={counts.subFolders}
                subFiles={counts.subFiles}
                compact={true}
              />
              <span
                aria-hidden="true"
                className="flex flex-shrink-0 items-center justify-center"
                style={{ width: `${trailingChevronWidth}px` }}
              />
            </div>
          </Link>
        </div>
      </div>
    );
  };

  const renderHomeRow = () => {
    return (
      <div className="mb-2">
        <div className="flex min-w-0 items-center">
          {homeHasChildren ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsHomeExpanded(!isHomeExpanded);
              }}
              className="flex h-4 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-200"
              style={{ width: `${expandColumnWidth}px` }}
            >
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${isHomeExpanded ? 'rotate-90' : ''}`}
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
            <div style={{ width: `${expandColumnWidth}px` }} className="flex h-4 flex-shrink-0 items-center justify-center" />
          )}
          <Link
            href={`/orgs/${orgIdFromParams}/airunote`}
            className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              !currentFolderId
                ? 'bg-blue-100 text-blue-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="flex flex-shrink-0 items-center justify-center"
                style={{ width: `${iconColumnWidth}px` }}
              >
                🏠
              </span>
              <span className="min-w-0 flex-1 break-words leading-5">Home</span>
            </div>
            <div
              className="flex flex-shrink-0 items-center justify-end gap-2"
              style={{ minWidth: `${rightColumnMinWidth}px` }}
            >
              <span
                aria-hidden="true"
                className="inline-flex min-w-7 flex-shrink-0 items-center justify-center px-2 py-0.5"
              />
              <span
                aria-hidden="true"
                className="flex flex-shrink-0 items-center justify-center"
                style={{ width: `${trailingChevronWidth}px` }}
              />
            </div>
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
      {showHome ? (
        <>
          {renderHomeRow()}
          {isHomeExpanded && renderTree(tree)}
        </>
      ) : (
        renderTree(tree)
      )}
    </div>
  );
}
