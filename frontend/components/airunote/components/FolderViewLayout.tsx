/**
 * FolderViewLayout Component
 * Reusable layout for displaying folder contents (used by Home and Folder pages)
 */

'use client';

import { DndContext, DragOverlay, PointerSensor, type DragEndEvent, type DragStartEvent, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAirunoteStore } from '../stores/airunoteStore';
import { FolderTreeView } from './FolderTreeView';
import { FolderCountBadge } from './FolderCountBadge';
import { DocumentList } from './DocumentList';
import { EmptyState } from '@/components/ui/EmptyState';
import { LensToolbar } from './LensToolbar';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import { useUpdateFolder } from '../hooks/useUpdateFolder';
import { useMoveDocument } from '../hooks/useMoveDocument';
import { CreateFolderLensModal } from './CreateFolderLensModal';
import { useFolderLenses } from '@/hooks/useAirunoteLenses';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import type { AiruFolder, AiruDocument, AiruDocumentMetadata, AiruFolderType } from '../types';

const FOLDER_TYPE_OPTIONS: AiruFolderType[] = [
  'box',
  'book',
  'board',
  'project',
  'pipeline',
  'ledger',
  'wiki',
  'notebook',
  'journal',
  'contacts',
  'canvas',
  'manual',
  'collection',
];

function formatFolderTypeLabel(type: AiruFolderType | undefined | null) {
  if (!type) {
    return 'Folder';
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

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
  onEditLens?: (lens: AiruLens) => void;
  onDeleteLens?: (lens: AiruLens) => void;
  onSetDefaultLens?: (lens: AiruLens) => void;
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
  onEditLens,
  onDeleteLens,
  onSetDefaultLens,
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
  const [isEditingFolderType, setIsEditingFolderType] = useState(false);
  const [editingFolderType, setEditingFolderType] = useState<AiruFolderType>('box');
  const [isCreateLensModalOpen, setIsCreateLensModalOpen] = useState(false);
  const [activeDraggedDocumentId, setActiveDraggedDocumentId] = useState<string | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const updateFolder = useUpdateFolder();
  const moveDocument = useMoveDocument();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
    documentsById,
    setSearchQuery: setGlobalSearchQuery,
    updateDocumentMetadata,
  } = useAirunoteStore();
  const currentSelectedLens = selectedLensId ? folderLenses.find((lens) => lens.id === selectedLensId) ?? null : null;
  
  // Get current folder for inline editing
  const currentFolder = folderId ? foldersById.get(folderId) as AiruFolder | undefined : null;
  const isRootFolder = !currentFolder || currentFolder.humanId === '__user_root__' || currentFolder.humanId === '__org_root__' || folderName === 'Home';
  
  // Initialize editing folder name
  useEffect(() => {
    if (currentFolder && !isRootFolder) {
      setEditingFolderName(currentFolder.humanId);
      setEditingFolderType(currentFolder.type || 'box');
    }
  }, [currentFolder, isRootFolder]);

  useEffect(() => {
    setGlobalSearchQuery(searchInputValue);
  }, [searchInputValue, setGlobalSearchQuery]);

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

  const handleSaveFolderType = async (nextType?: AiruFolderType) => {
    if (!currentFolder || isRootFolder) return;

    const resolvedType = nextType || editingFolderType;
    if (resolvedType === (currentFolder.type || 'box')) {
      setIsEditingFolderType(false);
      return;
    }

    try {
      await updateFolder.mutateAsync({
        folderId: currentFolder.id,
        orgId,
        userId,
        type: resolvedType,
      });
      setEditingFolderType(resolvedType);
      setIsEditingFolderType(false);
    } catch (err) {
      setEditingFolderType(currentFolder.type || 'box');
    }
  };

  const handleCancelFolderType = () => {
    if (currentFolder) {
      setEditingFolderType(currentFolder.type || 'box');
    }
    setIsEditingFolderType(false);
  };

  // Get direct children (filtered by search)
  const childFolders = folderId ? getFilteredFolders(folderId) : [];
  const documents = folderId ? getFilteredDocuments(folderId) : [];

  const shouldShowViewHeader = !!folderId;
  const pageShellClassName = 'mx-auto w-full max-w-[1400px] overflow-y-auto px-6 py-8 lg:px-8';
  const activeDraggedDocument = activeDraggedDocumentId ? documentsById.get(activeDraggedDocumentId) : null;
  const folderTypeLabel = formatFolderTypeLabel(currentFolder?.type);
  const folderTypeIcon = getFolderTypeIcon(currentFolder?.type);
  const folderDescription =
    currentFolder && typeof currentFolder.metadata?.description === 'string'
      ? currentFolder.metadata.description.trim()
      : '';
  const latestUpdatedAt = documents.reduce<Date | null>((latest, document) => {
    const nextDate = document.updatedAt ? new Date(document.updatedAt) : null;
    if (!nextDate || Number.isNaN(nextDate.getTime())) {
      return latest;
    }
    if (!latest || nextDate.getTime() > latest.getTime()) {
      return nextDate;
    }
    return latest;
  }, null);
  const headerMetadataParts = [
    documents.length > 0 ? `${documents.length} ${documents.length === 1 ? 'note' : 'notes'}` : null,
    childFolders.length > 0 ? `${childFolders.length} ${childFolders.length === 1 ? 'folder' : 'folders'}` : null,
    latestUpdatedAt
      ? `Updated ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(latestUpdatedAt)}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const headerMetadataText = headerMetadataParts.join(' • ');

  const handleControlViewChange = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    setViewMode(view);
    const newLensId = lensId || null;
    if (onLensSelected) {
      onLensSelected(newLensId);
    } else {
      setInternalSelectedLensId(newLensId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDraggedDocumentId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDraggedDocumentId(null);

    if (!over) return;

    const documentId = String(active.id);
    const targetFolderId = String(over.id);

    if (documentId === targetFolderId) return;

    const document = documentsById.get(documentId);
    const targetFolder = foldersById.get(targetFolderId);

    if (!document || !targetFolder || !orgId || !userId || document.folderId === targetFolderId) {
      return;
    }

    const previousDocument = { ...document };

    updateDocumentMetadata({
      ...document,
      folderId: targetFolderId,
    });

    try {
      await moveDocument.mutateAsync({
        documentId,
        orgId,
        userId,
        newFolderId: targetFolderId,
        oldFolderId: previousDocument.folderId,
      });
    } catch (error) {
      updateDocumentMetadata(previousDocument);
      console.error('Failed to move document via drag and drop:', error);
    }
  };

  const handleDragCancel = () => {
    setActiveDraggedDocumentId(null);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
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

      {/* Header */}
      {!hideHeader && (
        <div className="mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex-1">
              {currentFolder && !isRootFolder ? (
                <div className="mb-0.5 flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <span className="text-base" aria-hidden="true">{folderTypeIcon}</span>
                  {isEditingFolderType ? (
                    <select
                      value={editingFolderType}
                      onChange={(event) => {
                        const nextType = event.target.value as AiruFolderType;
                        setEditingFolderType(nextType);
                        void handleSaveFolderType(nextType);
                      }}
                      onBlur={handleCancelFolderType}
                      autoFocus
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-medium text-gray-700 outline-none focus:border-gray-300"
                    >
                      {FOLDER_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {formatFolderTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingFolderType(true)}
                      className="rounded-lg px-2 py-1 text-sm font-medium text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
                      title="Edit folder type"
                    >
                      {folderTypeLabel}
                    </button>
                  )}
                </div>
              ) : null}

              {isEditingFolderName && !isRootFolder && currentFolder ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
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
                      className="min-w-0 flex-1 border-b-2 border-blue-500 bg-transparent text-2xl font-semibold tracking-tight text-gray-900 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveFolderName}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-gray-800"
                      title="Save"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelFolderName}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
                      title="Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="group flex items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{folderName}</h1>
                      {!isRootFolder && currentFolder && (
                        <button
                          onClick={() => setIsEditingFolderName(true)}
                          className="rounded-lg px-2 py-1 text-xs text-gray-500 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-900"
                          title="Edit folder name"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {folderDescription ? (
                      <p className="mt-1 truncate text-sm text-gray-600">{folderDescription}</p>
                    ) : null}

                    {headerMetadataText ? (
                      <p className="mt-1 text-sm text-gray-500">{headerMetadataText}</p>
                    ) : null}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {shouldShowViewHeader && (
        <div className={hideHeader ? 'mb-6' : 'mb-8'}>
          <LensToolbar
            viewMode={viewMode}
            selectedLensId={selectedLensId}
            currentLens={currentSelectedLens}
            lenses={folderLenses}
            folderId={folderId}
            orgId={orgId}
            placement="inline"
            onViewChange={handleControlViewChange}
            onCreateLens={() => setIsCreateLensModalOpen(true)}
            onEditLens={onEditLens}
            onDeleteLens={onDeleteLens}
            onSetDefaultLens={onSetDefaultLens}
            onCreateFolder={onCreateFolder}
            onCreateDocument={onCreateDocument}
            onPasteDock={onPasteDock}
            searchValue={searchInputValue}
            onSearchChange={setSearchInputValue}
          />
        </div>
      )}

      {viewMode === 'tree' && (childFolders.length > 0 || documents.length > 0) && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Contents</h2>
          </div>
          <FolderTreeView
            folders={childFolders}
            documents={documents}
            currentFolderId={folderId ?? undefined}
            orgId={orgId}
            parentFolderId={folderId ?? undefined}
          />
        </div>
      )}

      {/* Folders Section */}
      {viewMode !== 'tree' && childFolders.length > 0 && (
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
      {viewMode !== 'tree' && documents.length > 0 && (
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
      <DragOverlay>
        {activeDraggedDocument ? (
          <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 shadow-xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Moving document</div>
            <div className="mt-1 max-w-[240px] truncate text-sm font-medium text-gray-900">{activeDraggedDocument.name}</div>
          </div>
        ) : null}
      </DragOverlay>
      </div>
    </DndContext>
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
  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folderId: folder.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group relative p-4 border rounded-lg bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all duration-150 ${
        isOver ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-200'
      }`}
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
