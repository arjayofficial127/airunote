/**
 * FolderViewLayout Component
 * Reusable layout for displaying folder contents (used by Home and Folder pages)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAirunoteStore } from '../stores/airunoteStore';
import { SearchBar } from './SearchBar';
import { FolderTreeView } from './FolderTreeView';
import { FolderCountBadge } from './FolderCountBadge';
import { DocumentList } from './DocumentList';
import { EmptyState } from '@/components/ui/EmptyState';
import { EditFolderModal } from './EditFolderModal';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import type { AiruFolder, AiruDocument, AiruDocumentMetadata } from '../types';

interface FolderViewLayoutProps {
  folderId: string | null;
  folderName: string;
  breadcrumbPath?: Array<{ id: string; name: string }>;
  orgId: string;
  userId: string;
  onCreateFolder: () => void;
  onCreateDocument: () => void;
  onPasteDock: () => void;
  onMoveFolder?: (folder: AiruFolder) => void;
  onDeleteFolder?: (folder: AiruFolder) => void;
  onMoveDocument?: (document: AiruDocumentMetadata) => void;
  onDeleteDocument?: (document: AiruDocumentMetadata) => void;
}

export function FolderViewLayout({
  folderId,
  folderName,
  breadcrumbPath = [],
  orgId,
  userId,
  onCreateFolder,
  onCreateDocument,
  onPasteDock,
  onMoveFolder,
  onDeleteFolder,
  onMoveDocument,
  onDeleteDocument,
}: FolderViewLayoutProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');
  const [editingFolder, setEditingFolder] = useState<AiruFolder | null>(null);

  const {
    getFilteredFolders,
    getFilteredDocuments,
    getFolderCounts,
  } = useAirunoteStore();

  // Get direct children (filtered by search)
  const childFolders = folderId ? getFilteredFolders(folderId) : [];
  const documents = folderId ? getFilteredDocuments(folderId) : [];

  // Format count text
  const formatCounts = (folders: number, documents: number) => {
    const parts: string[] = [];
    if (folders > 0) {
      parts.push(`${folders} ${folders === 1 ? 'folder' : 'folders'}`);
    }
    if (documents > 0) {
      parts.push(`${documents} ${documents === 1 ? 'document' : 'documents'}`);
    }
    return parts.length > 0 ? parts.join(' • ') : '0 items';
  };

  const countText = formatCounts(childFolders.length, documents.length);

  return (
    <div className="p-8 overflow-y-auto">
      {/* Breadcrumb Path */}
      {breadcrumbPath.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center space-x-1 text-sm text-gray-500">
            {breadcrumbPath.map((segment, index) => {
              const isLast = index === breadcrumbPath.length - 1;
              const href = segment.id === '' 
                ? `/orgs/${orgIdFromParams}/airunote`
                : `/orgs/${orgIdFromParams}/airunote/folder/${segment.id}`;
              
              return (
                <li key={segment.id || 'home'} className="flex items-center">
                  {index > 0 && <span className="mx-1.5 text-gray-400">›</span>}
                  {isLast ? (
                    <span className="text-gray-700">{segment.name}</span>
                  ) : (
                    <Link
                      href={href}
                      className="hover:text-blue-600 transition-colors duration-150"
                    >
                      {segment.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{folderName}</h1>
            <p className="text-sm text-gray-600 mt-1">{countText}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCreateFolder}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              title="Create folder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={onPasteDock}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              title="Paste Dock - Quick paste and save"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
            <button
              onClick={onCreateDocument}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 text-sm font-medium"
            >
              + New Document
            </button>
          </div>
        </div>
        <SearchBar placeholder="Search..." />
      </div>

      {/* Folders Section */}
      {childFolders.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Folders</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 ${
                  viewMode === 'tree'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tree
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {childFolders.map((folder) => {
                const counts = getFolderCounts(folder.id);
                return (
                  <div
                    key={folder.id}
                    className="group relative p-4 border border-gray-200 rounded-lg bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all duration-150"
                    style={{
                      borderLeft: '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeftColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeftColor = 'transparent';
                    }}
                  >
                    <Link
                      href={`/orgs/${orgIdFromParams}/airunote/folder/${folder.id}`}
                      className="flex flex-col h-full cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0 mb-3">
                        <span className="text-2xl">{getFolderTypeIcon(folder.type)}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{folder.humanId}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <FolderCountBadge
                          directFolders={counts.directFolders}
                          directFiles={counts.directFiles}
                          subFolders={counts.subFolders}
                          subFiles={counts.subFiles}
                          compact={false}
                        />
                      </div>
                    </Link>
                    {(onMoveFolder || onDeleteFolder) && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity duration-150">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingFolder(folder);
                          }}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-150"
                          title="Edit folder"
                        >
                          Edit
                        </button>
                        {onMoveFolder && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onMoveFolder(folder);
                            }}
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-150"
                            title="Move folder"
                          >
                            Move
                          </button>
                        )}
                        {onDeleteFolder && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteFolder(folder);
                            }}
                            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors duration-150"
                            title="Delete folder"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <FolderTreeView
              folders={childFolders}
              documents={documents}
              currentFolderId={folderId || undefined}
              orgId={orgId}
              parentFolderId={folderId}
            />
          )}
        </div>
      )}

      {/* Documents Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
        {documents.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Create your first document in this folder to get started."
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            action={
              <button
                onClick={onCreateDocument}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
              >
                Create Document
              </button>
            }
          />
        ) : (
          <DocumentList 
            documents={documents} 
            orgId={orgId}
            onMove={onMoveDocument}
            onDelete={onDeleteDocument}
          />
        )}
      </div>

      {/* Edit Folder Modal */}
      <EditFolderModal
        isOpen={editingFolder !== null}
        onClose={() => setEditingFolder(null)}
        folder={editingFolder}
        orgId={orgId}
        userId={userId}
        onSuccess={() => setEditingFolder(null)}
      />
    </div>
  );
}
