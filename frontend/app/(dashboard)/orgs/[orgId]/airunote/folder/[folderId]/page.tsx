/**
 * Folder View Page
 * Displays contents of a specific folder (child folders + documents)
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { FolderViewLayout } from '@/components/airunote/components/FolderViewLayout';
import { CreateFolderModal } from '@/components/airunote/components/CreateFolderModal';
import { CreateDocumentModal } from '@/components/airunote/components/CreateDocumentModal';
import { CreateFolderLensModal } from '@/components/airunote/components/CreateFolderLensModal';
import { MoveFolderModal } from '@/components/airunote/components/MoveFolderModal';
import { MoveDocumentModal } from '@/components/airunote/components/MoveDocumentModal';
import { PasteDock } from '@/components/airunote/components/PasteDock';
import { DeleteConfirmationModal } from '@/components/airunote/components/DeleteConfirmationModal';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeleteFolder } from '@/components/airunote/hooks/useDeleteFolder';
import { useDeleteDocument } from '@/components/airunote/hooks/useDeleteDocument';
import { useFolderLenses, useLens, useUpdateLensItems } from '@/hooks/useAirunoteLenses';
import { buildLensProjection } from '@/components/airunote/utils/lensProjection';
import { BoardLens } from '@/components/airunote/lenses/BoardLens';
import { CanvasLens } from '@/components/airunote/lenses/CanvasLens';
import Link from 'next/link';
import type { AiruFolder, AiruDocument } from '@/components/airunote/types';
import type { LensItemInput } from '@/lib/api/airunoteLensesApi';

export default function FolderViewPage() {
  const params = useParams();
  const router = useRouter();
  const folderId: string | null = typeof params.folderId === 'string' ? params.folderId : null;
  const orgIdFromParams = params.orgId as string;

  const orgSession = useOrgSession();
  const authSession = useAuthSession();

  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isCreateLensModalOpen, setIsCreateLensModalOpen] = useState(false);
  const [isPasteDockOpen, setIsPasteDockOpen] = useState(false);
  const [moveFolderModal, setMoveFolderModal] = useState<AiruFolder | null>(null);
  const [moveDocumentModal, setMoveDocumentModal] = useState<AiruDocument | null>(null);
  const [deleteFolderModal, setDeleteFolderModal] = useState<AiruFolder | null>(null);
  const [deleteDocumentModal, setDeleteDocumentModal] = useState<AiruDocument | null>(null);

  const deleteFolder = useDeleteFolder();
  const deleteDocument = useDeleteDocument();

  // Get data from store (metadata loaded by AirunoteDataProvider)
  const {
    getFolderById,
    getFilteredFolders,
    getFilteredDocuments,
    getFoldersByParent,
    getDocumentsByFolder,
    isLoading,
    error,
  } = useAirunoteStore();

  // Get current folder
  const currentFolder = folderId ? getFolderById(folderId) : null;

  // Fetch folder lenses
  const { data: folderLenses = [], isLoading: isLoadingLenses, refetch: refetchFolderLenses } = useFolderLenses(
    orgId || undefined,
    folderId || undefined
  );

  // Determine active lens
  const activeLensId = useMemo(() => {
    if (!currentFolder || !folderLenses.length) return null;
    
    // Priority 1: folder.defaultLensId (if it exists in folder metadata or type)
    const folderWithDefaultLens = currentFolder as AiruFolder & { defaultLensId?: string | null };
    if (folderWithDefaultLens.defaultLensId) {
      const defaultLens = folderLenses.find((l) => l.id === folderWithDefaultLens.defaultLensId);
      if (defaultLens) return defaultLens.id;
    }
    
    // Priority 2: first default lens in list
    const defaultLens = folderLenses.find((l) => l.isDefault);
    if (defaultLens) return defaultLens.id;
    
    // Priority 3: first lens in list
    if (folderLenses.length > 0) {
      return folderLenses[0].id;
    }
    
    return null;
  }, [currentFolder, folderLenses]);

  // Local state for lens switching
  const [selectedLensId, setSelectedLensId] = useState<string | null>(activeLensId);

  // Update selected lens when active lens changes
  useEffect(() => {
    if (activeLensId !== null && selectedLensId === null) {
      setSelectedLensId(activeLensId);
    }
  }, [activeLensId, selectedLensId]);

  // Fetch active lens data
  const { data: lensData, isLoading: isLoadingLens } = useLens(
    orgId || undefined,
    selectedLensId || undefined
  );

  // Hook for updating lens items
  const updateLensItems = useUpdateLensItems(orgId || undefined, selectedLensId || undefined);

  // Build lens projection when lens data is available
  const lensProjection = useMemo(() => {
    if (!lensData || !selectedLensId) return null;

    const children = {
      folders: getFilteredFolders(folderId || ''),
      documents: getFilteredDocuments(folderId || ''),
    };

    const projection = buildLensProjection(children, lensData.items, lensData.lens.type as 'board' | 'canvas' | 'book');
    
    // Console log for debugging (as requested)
    console.log('Lens Projection:', {
      lensId: selectedLensId,
      lensType: lensData.lens.type,
      projection,
    });

    return projection;
  }, [lensData, selectedLensId, folderId, getFilteredFolders, getFilteredDocuments]);

  // Prepare children for BoardLens and CanvasLens
  // Use direct store methods to avoid stale closure issues
  const boardChildren = useMemo(() => {
    if (!folderId) return [];
    
    // Use direct store methods instead of filtered versions to ensure we get all items
    // Filtered versions might be affected by search query or other state
    const folders = getFoldersByParent(folderId);
    const documents = getDocumentsByFolder(folderId);
    
    console.log('[FolderPage] boardChildren computation:', {
      folderId,
      foldersCount: folders.length,
      documentsCount: documents.length,
      selectedLensId,
      lensType: lensData?.lens.type,
    });
    
    return [
      ...folders.map((f) => ({
        id: f.id,
        type: 'folder' as const,
        title: f.humanId,
        humanId: f.humanId,
      })),
      ...documents.map((d) => ({
        id: d.id,
        type: 'document' as const,
        title: d.name,
        name: d.name,
      })),
    ];
  }, [folderId, getFoldersByParent, getDocumentsByFolder, selectedLensId, lensData]);

  // Handle persist for board lens
  const handleBoardPersist = useCallback(
    async (items: LensItemInput[]) => {
      if (!updateLensItems.mutateAsync) return;
      await updateLensItems.mutateAsync({ items });
    },
    [updateLensItems]
  );

  // Filter lenses for switcher (show ALL lenses, not just one per type)
  const availableLenses = useMemo(() => {
    return folderLenses.filter((lens) => 
      ['box', 'board', 'canvas', 'book'].includes(lens.type)
    );
  }, [folderLenses]);

  // Build breadcrumb path from store (for clickable navigation)
  const breadcrumbPath: Array<{ id: string; name: string }> = [];
  if (folderId && currentFolder) {
    let folder: AiruFolder | null = currentFolder;
    const pathFolders: AiruFolder[] = [];

    // Build path upward from current to root
    while (folder) {
      const currentFolderItem: AiruFolder = folder;
      
      // Stop conditions: root folders or parent not found
      if (
        !currentFolderItem.parentFolderId ||
        currentFolderItem.parentFolderId === '' ||
        currentFolderItem.humanId === '__user_root__' ||
        currentFolderItem.humanId === '__org_root__'
      ) {
        // Don't add root folders to path
        break;
      }

      pathFolders.unshift(currentFolderItem);

      const parent = getFolderById(currentFolderItem.parentFolderId);
      if (!parent) {
        // Parent not found, stop
        break;
      }

      folder = parent;
    }

    // Build breadcrumb path (filter out root folders)
    for (const pathFolder of pathFolders) {
      // Skip root folders
      if (
        pathFolder.humanId === '__user_root__' ||
        pathFolder.humanId === '__org_root__' ||
        !pathFolder.parentFolderId ||
        pathFolder.parentFolderId === ''
      ) {
        continue;
      }

      breadcrumbPath.push({
        id: pathFolder.id,
        name: pathFolder.humanId,
      });
    }
  }

  const handleCreateFolderSuccess = (folder: AiruFolder) => {
    // Folder is automatically added to store by the modal
    // No need to refetch - store is updated
  };

  if (!orgId || !userId || !folderId) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <DocumentListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load folder"
          message={error.message || 'An error occurred while loading this folder.'}
          onRetry={() => window.location.reload()}
          backUrl={`/orgs/${orgIdFromParams}/airunote`}
          backLabel="Back to Home"
        />
      </div>
    );
  }

  if (!currentFolder) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Folder not found</div>
        <Link
          href={`/orgs/${orgIdFromParams}/airunote`}
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  // Build breadcrumb with Home first
  const fullBreadcrumbPath = [
    { id: '', name: 'Home' },
    ...breadcrumbPath,
  ];

  // Render board lens if active
  const shouldRenderBoardLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'board' &&
    !isLoadingLens;

  // Render canvas lens if active
  const shouldRenderCanvasLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'canvas' &&
    !isLoadingLens;

  return (
    <>
      {/* Lens Switcher UI - Shows ALL lenses */}
      <div className="px-8 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          {availableLenses.map((lens) => {
            const isActive = selectedLensId === lens.id;
            const typeLabels: Record<string, string> = {
              box: 'Box',
              board: 'Board',
              canvas: 'Canvas',
              book: 'Book',
            };

            return (
              <button
                key={lens.id}
                onClick={() => setSelectedLensId(lens.id)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
                title={lens.name}
              >
                <span className="text-xs opacity-75">
                  {typeLabels[lens.type] || lens.type}
                </span>
                <span>{lens.name}</span>
              </button>
            );
          })}
          {/* Always show + Lens button */}
          <button
            onClick={() => setIsCreateLensModalOpen(true)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 border-2 border-dashed border-gray-300 dark:border-gray-600"
            title="Create new lens"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Lens</span>
          </button>
        </div>
      </div>

      {/* Render Board Lens if active */}
      {shouldRenderBoardLens ? (
        <div className="p-8">
          <BoardLens
            orgId={orgId || orgIdFromParams}
            lens={lensData.lens}
            items={boardChildren}
            lensItems={lensData.items}
            onPersist={handleBoardPersist}
          />
        </div>
      ) : shouldRenderCanvasLens ? (
        <div className="h-screen overflow-hidden">
          {isLoadingLens ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading canvas...</div>
            </div>
          ) : (
            <CanvasLens
              orgId={orgId || orgIdFromParams}
              lens={lensData.lens}
              items={boardChildren}
              lensItems={lensData.items || []}
              onPersist={handleBoardPersist}
            />
          )}
        </div>
      ) : (
        <FolderViewLayout
        folderId={folderId}
        folderName={currentFolder?.humanId || 'Folder'}
        breadcrumbPath={fullBreadcrumbPath}
        orgId={orgId || orgIdFromParams}
        userId={userId || ''}
        onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
        onPasteDock={() => setIsPasteDockOpen(true)}
        onMoveFolder={(folder) => setMoveFolderModal(folder)}
        onDeleteFolder={(folder) => setDeleteFolderModal(folder)}
        onMoveDocument={(doc) => setMoveDocumentModal(doc as AiruDocument)}
        onDeleteDocument={(doc) => setDeleteDocumentModal(doc as AiruDocument)}
        onLensCreated={async (lens) => {
          // Refetch folder lenses to get the new lens
          await refetchFolderLenses();
          // Auto-select the new lens
          setSelectedLensId(lens.id);
        }}
        />
      )}

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        orgId={orgId}
        userId={userId}
        parentFolderId={folderId}
        onSuccess={handleCreateFolderSuccess}
      />

      <CreateDocumentModal
        isOpen={isCreateDocumentModalOpen}
        onClose={() => setIsCreateDocumentModalOpen(false)}
        orgId={orgId}
        userId={userId}
        folderId={folderId}
        folderType={currentFolder?.type}
      />

      <PasteDock
        isOpen={isPasteDockOpen}
        onClose={() => setIsPasteDockOpen(false)}
        orgId={orgId}
        userId={userId}
        defaultFolderId={folderId}
      />

      {moveFolderModal && (
        <MoveFolderModal
          isOpen={!!moveFolderModal}
          onClose={() => setMoveFolderModal(null)}
          folder={moveFolderModal}
          orgId={orgId}
          userId={userId}
          onSuccess={() => setMoveFolderModal(null)}
        />
      )}

      {moveDocumentModal && (
        <MoveDocumentModal
          isOpen={!!moveDocumentModal}
          onClose={() => setMoveDocumentModal(null)}
          document={moveDocumentModal}
          orgId={orgId}
          userId={userId}
          onSuccess={() => setMoveDocumentModal(null)}
        />
      )}

      {deleteFolderModal && (
        <DeleteConfirmationModal
          isOpen={!!deleteFolderModal}
          onClose={() => setDeleteFolderModal(null)}
          onConfirm={async () => {
            if (!orgId || !userId) return;
            await deleteFolder.mutateAsync({
              folderId: deleteFolderModal.id,
              orgId,
              userId,
            });
            router.push(`/orgs/${orgIdFromParams}/airunote`);
          }}
          title="Delete Folder"
          message="Are you sure you want to delete this folder? This will delete all contents permanently."
          itemName={deleteFolderModal.humanId}
          isDeleting={deleteFolder.isPending}
        />
      )}

      {deleteDocumentModal && (
        <DeleteConfirmationModal
          isOpen={!!deleteDocumentModal}
          onClose={() => setDeleteDocumentModal(null)}
          onConfirm={async () => {
            if (!orgId || !userId) return;
            await deleteDocument.mutateAsync({
              documentId: deleteDocumentModal.id,
              orgId,
              userId,
              folderId: deleteDocumentModal.folderId,
            });
          }}
          title="Delete Document"
          message="Are you sure you want to delete this document? This action cannot be undone."
          itemName={deleteDocumentModal.name}
          isDeleting={deleteDocument.isPending}
        />
      )}

      {/* Create Lens Modal - Always available */}
      {folderId && (
        <CreateFolderLensModal
          isOpen={isCreateLensModalOpen}
          onClose={() => setIsCreateLensModalOpen(false)}
          onSuccess={async (lens) => {
            // Refetch folder lenses to get the new lens
            await refetchFolderLenses();
            // Auto-select the new lens
            setSelectedLensId(lens.id);
            setIsCreateLensModalOpen(false);
          }}
          folderId={folderId}
          orgId={orgId || orgIdFromParams}
          userId={userId || ''}
        />
      )}
    </>
  );
}
