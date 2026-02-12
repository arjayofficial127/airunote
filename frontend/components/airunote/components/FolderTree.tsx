/**
 * FolderTree Component
 * Displays nested folder structure with navigation
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AiruFolder, FolderTreeResponse } from '../types';

interface FolderTreeProps {
  tree: FolderTreeResponse;
  currentFolderId?: string;
  orgId: string;
}

export function FolderTree({ tree, currentFolderId, orgId }: FolderTreeProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;

  const renderFolder = (folder: AiruFolder, level: number = 0) => {
    const isActive = folder.id === currentFolderId;
    const folderPath = `/orgs/${orgIdFromParams}/airunote/folder/${folder.id}`;

    return (
      <div key={folder.id} className="mb-1">
        <Link
          href={folderPath}
          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
            isActive
              ? 'bg-blue-100 text-blue-900 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          <span className="mr-2">📁</span>
          {folder.humanId}
        </Link>
      </div>
    );
  };

  const renderTree = (node: FolderTreeResponse, level: number = 0) => {
    return (
      <div key={node.folders[0]?.id || 'root'}>
        {node.folders.map((folder) => (
          <div key={folder.id}>
            {renderFolder(folder, level)}
            {node.children
              .filter((child) => child.folders.some((f) => f.parentFolderId === folder.id))
              .map((child) => renderTree(child, level + 1))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-2">
        <Link
          href={`/orgs/${orgIdFromParams}/airunote`}
          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
            !currentFolderId
              ? 'bg-blue-100 text-blue-900 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="mr-2">🏠</span>
          Home
        </Link>
      </div>
      {renderTree(tree)}
    </div>
  );
}
