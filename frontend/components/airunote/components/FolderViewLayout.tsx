/**
 * FolderViewLayout Component
 * Reusable layout for displaying folder contents (used by Home and Folder pages)
 */

'use client';

import { useState, useEffect } from 'react';
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
import { useFolderLens } from '../hooks/useFolderLens';
import { useLens } from '../hooks/useLens';
import { useUpdateFolder } from '../hooks/useUpdateFolder';
import { CreateFolderLensModal } from './CreateFolderLensModal';
import { ViewSwitcher } from './ViewSwitcher';
import { useFolderLenses } from '@/hooks/useAirunoteLenses';
import type { AiruFolder, AiruDocument, AiruDocumentMetadata, AiruFolderType } from '../types';

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
  onLensCreated?: (lens: { id: string; type: string }) => void;
  hideHeader?: boolean; // Hide header block (for Home page)
  onLensSelected?: (lensId: string | null) => void; // Callback when lens is selected
  selectedLensId?: string | null; // External lens selection (from parent)
  defaultViewMode?: 'grid' | 'tree'; // Default view mode when switching from lens
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
  onLensCreated,
  hideHeader = false,
  onLensSelected,
  selectedLensId: externalSelectedLensId,
  defaultViewMode,
}: FolderViewLayoutProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'lens'>(defaultViewMode || 'grid');
  
  // Update view mode when defaultViewMode changes (e.g., when switching from lens)
  useEffect(() => {
    if (defaultViewMode && (defaultViewMode === 'grid' || defaultViewMode === 'tree')) {
      setViewMode(defaultViewMode);
    }
  }, [defaultViewMode]);
  const [internalSelectedLensId, setInternalSelectedLensId] = useState<string | null>(null);
  
  // Use external selectedLensId if provided, otherwise use internal state
  const selectedLensId = externalSelectedLensId !== undefined ? externalSelectedLensId : internalSelectedLensId;
  const [editingFolder, setEditingFolder] = useState<AiruFolder | null>(null);
  const [isEditingFolderName, setIsEditingFolderName] = useState(false);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isCreateLensModalOpen, setIsCreateLensModalOpen] = useState(false);
  const updateFolder = useUpdateFolder();

  // Fetch folder lenses
  const { data: folderLenses = [] } = useFolderLenses(
    orgId || undefined,
    folderId || undefined
  );

  const {
    getFilteredFolders,
    getFilteredDocuments,
    getFolderCounts,
    foldersById,
  } = useAirunoteStore();
  
  // Get current folder for inline editing
  const currentFolder = folderId ? foldersById.get(folderId) as AiruFolder | undefined : null;
  const isRootFolder = !currentFolder || currentFolder.humanId === '__user_root__' || currentFolder.humanId === '__org_root__' || folderName === 'Home';
  
  // Initialize editing folder name
  useEffect(() => {
    if (currentFolder && !isRootFolder) {
      setEditingFolderName(currentFolder.humanId);
    }
  }, [currentFolder, isRootFolder]);
  
  // Handle inline folder name save
  const handleSaveFolderName = async () => {
    if (!currentFolder || isRootFolder || !editingFolderName.trim()) return;
    
    if (editingFolderName.trim() === currentFolder.humanId) {
      setIsEditingFolderName(false);
      return;
    }
    
    try {
      await updateFolder.mutateAsync({
        folderId: currentFolder.id,
        orgId,
        userId,
        humanId: editingFolderName.trim(),
      });
      setIsEditingFolderName(false);
    } catch (err) {
      // Error is handled by the hook (toast notification)
      setEditingFolderName(currentFolder.humanId); // Revert on error
    }
  };
  
  // Handle inline folder name cancel
  const handleCancelFolderName = () => {
    if (currentFolder) {
      setEditingFolderName(currentFolder.humanId);
    }
    setIsEditingFolderName(false);
  };

  // Fetch lens for folder (Phase 1+)
  // Phase 5: For desktop lenses, we need to fetch via GET /lenses/:id
  // But FolderViewLayout is folder-based, so we only use useFolderLens here
  // Desktop lenses will have their own page route
  const { data: lens, isLoading: isLoadingLens } = useFolderLens({
    folderId,
    orgId,
    userId,
    enabled: !!folderId && !!orgId && !!userId,
  });

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
  const shouldShowViewHeader = !!folderId;
  const pageShellClassName = 'mx-auto w-full max-w-[1400px] overflow-y-auto px-6 py-8 lg:px-8';
  const actionButtons = (
    <div className="flex items-center gap-2">
      <button
        onClick={onCreateFolder}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
        title="Create folder"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span>New Folder</span>
      </button>

      <button
        onClick={onCreateDocument}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>New Document</span>
      </button>

      <button
        onClick={onPasteDock}
        className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
        title="Paste Dock - Quick paste and save"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className={pageShellClassName}>
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

      {hideHeader && (
        <div className="mb-6 flex justify-end">
          {actionButtons}
        </div>
      )}

      {/* Header */}
      {!hideHeader && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              {isEditingFolderName && !isRootFolder && currentFolder ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveFolderName();
                      } else if (e.key === 'Escape') {
                        handleCancelFolderName();
                      }
                    }}
                    onBlur={handleSaveFolderName}
                    autoFocus
                    className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                  />
                  <button
                    onClick={handleSaveFolderName}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Save"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelFolderName}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    title="Cancel"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-3xl font-bold text-gray-900">{folderName}</h1>
                  {!isRootFolder && currentFolder && (
                    <button
                      onClick={() => setIsEditingFolderName(true)}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-all duration-150"
                      title="Edit folder name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-600 mt-1">{countText}</p>
              {currentFolder && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg">{getFolderTypeIcon(currentFolder.type)}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentFolder.type ? currentFolder.type.charAt(0).toUpperCase() + currentFolder.type.slice(1) : 'Folder'}
                  </span>
                </div>
              )}
            </div>
            {actionButtons}
          </div>
          <SearchBar placeholder="Search..." />
        </div>
      )}

      {shouldShowViewHeader && (
        <div className={`${hideHeader ? 'mb-6' : 'mb-8'} overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 shadow-sm`}>
          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.9))] px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">View System</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">Switch between structure, browsing, and lens-based work</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 font-medium text-slate-600">
                  {childFolders.length} folder{childFolders.length === 1 ? '' : 's'}
                </span>
                <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 font-medium text-slate-600">
                  {documents.length} document{documents.length === 1 ? '' : 's'}
                </span>
                <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 font-medium text-slate-600">
                  {folderLenses.length} lens{folderLenses.length === 1 ? '' : 'es'}
                </span>
              </div>
            </div>
          </div>
          <div className="p-4">
          <ViewSwitcher
            viewMode={viewMode}
            selectedLensId={selectedLensId}
            lenses={folderLenses}
            onViewChange={(view, lensId) => {
              setViewMode(view);
              const newLensId = lensId || null;
              if (onLensSelected) {
                onLensSelected(newLensId);
              } else {
                setInternalSelectedLensId(newLensId);
              }
            }}
            onCreateLens={() => setIsCreateLensModalOpen(true)}
            folderId={folderId}
          />
          </div>
        </div>
      )}

      {/* Folders Section */}
      {childFolders.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Folders</h2>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {childFolders.map((folder) => {
                const counts = getFolderCounts(folder.id);
                return (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    counts={counts}
                    orgIdFromParams={orgIdFromParams}
                    onMoveFolder={onMoveFolder}
                    onDeleteFolder={onDeleteFolder}
                    setEditingFolder={setEditingFolder}
                  />
                );
              })}
            </div>
          ) : viewMode === 'tree' ? (
            <FolderTreeView
              folders={childFolders}
              documents={documents}
              currentFolderId={folderId ?? undefined}
              orgId={orgId}
              parentFolderId={folderId ?? undefined}
            />
          ) : (
            // Lens view - will be handled by parent component
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {childFolders.map((folder) => {
                const counts = getFolderCounts(folder.id);
                return (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    counts={counts}
                    orgIdFromParams={orgIdFromParams}
                    onMoveFolder={onMoveFolder}
                    onDeleteFolder={onDeleteFolder}
                    setEditingFolder={setEditingFolder}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Documents Section */}
      {documents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
          <DocumentList
            documents={documents}
            orgId={orgId}
            onMove={onMoveDocument}
            onDelete={onDeleteDocument}
          />
        </div>
      )}

      {childFolders.length === 0 && documents.length === 0 && (
        <EmptyState
          title="Empty folder"
          message="Create a folder or document to get started."
          actionLabel="Create folder"
          onAction={onCreateFolder}
        />
      )}

      {/* Create Folder Lens Modal */}
      {folderId && (
        <CreateFolderLensModal
          isOpen={isCreateLensModalOpen}
          onClose={() => setIsCreateLensModalOpen(false)}
          onSuccess={(lens) => {
            if (onLensCreated) {
              onLensCreated(lens);
            }
            setIsCreateLensModalOpen(false);
          }}
          folderId={folderId}
          orgId={orgId}
          userId={userId}
        />
      )}
    </div>
  );
}

// Separate component for folder card
function FolderCard({
  folder,
  counts,
  orgIdFromParams,
  onMoveFolder,
  onDeleteFolder,
  setEditingFolder,
}: {
  folder: AiruFolder;
  counts: { directFolders: number; directFiles: number; subFolders: number; subFiles: number; lensCount: number };
  orgIdFromParams: string;
  onMoveFolder?: (folder: AiruFolder) => void;
  onDeleteFolder?: (folder: AiruFolder) => void;
  setEditingFolder: (folder: AiruFolder) => void;
}) {

  return (
    <div
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
            lensCount={counts.lensCount}
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
}
