/**
 * Airunote Home Page
 * Root view showing user's folder tree and documents
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { HomeOverview } from '@/components/airunote/components/HomeOverview';
import { compareContentItems, type ContentFilter, type ContentSort } from '@/components/airunote/utils/contentViewOptions';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { FolderViewLayout } from '@/components/airunote/components/FolderViewLayout';
import { CreateFolderModal } from '@/components/airunote/components/CreateFolderModal';
import { CreateDocumentModal } from '@/components/airunote/components/CreateDocumentModal';
import { CreateDesktopLensModal } from '@/components/airunote/components/CreateDesktopLensModal';
import { CreateSavedViewModal } from '@/components/airunote/components/CreateSavedViewModal';
import { CreateFolderLensModal } from '@/components/airunote/components/CreateFolderLensModal';
import { EditLensModal } from '@/components/airunote/components/EditLensModal';
import { MoveFolderModal } from '@/components/airunote/components/MoveFolderModal';
import { DeleteConfirmationModal } from '@/components/airunote/components/DeleteConfirmationModal';
import { PasteDock } from '@/components/airunote/components/PasteDock';
import { LensToolbar } from '@/components/airunote/components/LensToolbar';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeleteFolder } from '@/components/airunote/hooks/useDeleteFolder';
import { useFolderLenses, useLens, useUpdateLensItems, useUpdateFolderLens, useDeleteLens, useSetFolderDefaultLens } from '@/hooks/useAirunoteLenses';
import { CanvasLens } from '@/components/airunote/lenses/CanvasLens';
import { BoardLens } from '@/components/airunote/lenses/BoardLens';
import { StudyLensRenderer } from '@/components/airunote/lenses/StudyLensRenderer';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
import type { AiruFolder, AiruDocumentMetadata } from '@/components/airunote/types';
import type { AiruLens, LensItemInput } from '@/lib/api/airunoteLensesApi';

export default function AirunoteHomePage() {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;

  const orgSession = useOrgSession();
  const authSession = useAuthSession();

  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const {
    foldersById,
    documentsById,
    isLoading,
    error,
  } = useAirunoteStore();

  const [pinnedItems, setPinnedItems] = useState<{
    folders: Set<string>;
    documents: Set<string>;
  }>({
    folders: new Set(),
    documents: new Set(),
  });

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isCreateDesktopLensModalOpen, setIsCreateDesktopLensModalOpen] = useState(false);
  const [isCreateSavedViewModalOpen, setIsCreateSavedViewModalOpen] = useState(false);
  const [isCreateLensModalOpen, setIsCreateLensModalOpen] = useState(false);
  const [isEditLensModalOpen, setIsEditLensModalOpen] = useState(false);
  const [editingLens, setEditingLens] = useState<AiruLens | null>(null);
  const [deleteLensModal, setDeleteLensModal] = useState<AiruLens | null>(null);
  const [isPasteDockOpen, setIsPasteDockOpen] = useState(false);
  const [moveFolderModal, setMoveFolderModal] = useState<AiruFolder | null>(null);
  const [deleteFolderModal, setDeleteFolderModal] = useState<AiruFolder | null>(null);

  const deleteFolder = useDeleteFolder();

  const allFolders = Array.from(foldersById.values()) as AiruFolder[];
  const userRoot = allFolders.find(
    (f) => f.humanId === '__user_root__' && f.ownerUserId === userId
  );

  const effectiveRootFolderId = userRoot?.id || null;

  useEffect(() => {
    if (!orgId || !userId) return;
    if (userRoot) return; // Already have root
    if (isLoading) return; // Still loading

    airunoteApi
      .provision(orgId, userId, userId)
      .then((response) => {
        if (response.success) {
          const store = useAirunoteStore.getState();
          store.addFolder(response.data.rootFolder);
        }
      })
      .catch((err) => {
        console.error('Failed to provision root:', err);
      });
  }, [orgId, userId, userRoot, isLoading]);

  const handleCreateFolderSuccess = (folder: AiruFolder) => {
  };

  const handleCreateDesktopLensSuccess = (lens: AiruLens) => {
    const orgIdFromPath = window.location.pathname.split('/')[2];
    window.location.href = `/orgs/${orgIdFromPath}/airunote/lens/${lens.id}`;
  };

  const allDocuments = useMemo(() => {
    return Array.from(documentsById.values()) as AiruDocumentMetadata[];
  }, [documentsById]);

  const recentDocuments = useMemo(() => {
    return allDocuments
      .filter((doc) => doc.state === 'active')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [allDocuments]);

  const pinnedFolders = useMemo(() => {
    return Array.from(foldersById.values())
      .filter((folder) => pinnedItems.folders.has(folder.id))
      .filter((folder) => folder.humanId !== '__user_root__' && folder.humanId !== '__org_root__');
  }, [foldersById, pinnedItems.folders]);

  const pinnedDocs = useMemo(() => {
    return allDocuments.filter((doc) => pinnedItems.documents.has(doc.id));
  }, [allDocuments, pinnedItems.documents]);


  const weeklyActivity = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const documentsUpdated = allDocuments.filter(
      (doc) => new Date(doc.updatedAt) >= oneWeekAgo && doc.state === 'active'
    ).length;

    const foldersCreated = Array.from(foldersById.values()).filter(
      (folder) =>
        new Date(folder.createdAt) >= oneWeekAgo &&
        folder.humanId !== '__user_root__' &&
        folder.humanId !== '__org_root__'
    ).length;

    return { documentsUpdated, foldersCreated };
  }, [allDocuments, foldersById]);

  const firstName = useMemo(() => {
    if (!authSession.user?.name) return '';
    return authSession.user.name.split(' ')[0];
  }, [authSession.user?.name]);

  const { data: folderLenses = [], isLoading: isLoadingLenses, refetch: refetchFolderLenses } = useFolderLenses(
    orgId || undefined,
    effectiveRootFolderId || undefined
  );

  const activeLensId = useMemo(() => {
    if (!userRoot || !folderLenses.length) return null;

    const folderWithDefaultLens = userRoot as AiruFolder & { defaultLensId?: string | null };
    if (folderWithDefaultLens.defaultLensId) {
      const defaultLens = folderLenses.find((l) => l.id === folderWithDefaultLens.defaultLensId);
      if (defaultLens) return defaultLens.id;
    }

    const defaultLens = folderLenses.find((l) => l.isDefault);
    if (defaultLens) return defaultLens.id;

    if (folderLenses.length > 0) {
      return folderLenses[0].id;
    }

    return null;
  }, [userRoot, folderLenses]);

  const [selectedLensId, setSelectedLensId] = useState<string | null>(activeLensId);
  const [desiredViewMode, setDesiredViewMode] = useState<'grid' | 'tree' | null>(null);
  const [lensSearch, setLensSearch] = useState('');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [sortOrder, setSortOrder] = useState<ContentSort>('updated');

  useEffect(() => {
    if (desiredViewMode === null && activeLensId !== null && selectedLensId === null) {
      setSelectedLensId(activeLensId);
    }
  }, [activeLensId, desiredViewMode, selectedLensId]);

  const { data: lensData, isLoading: isLoadingLens } = useLens(
    orgId || undefined,
    selectedLensId || undefined
  );

  const updateLensItems = useUpdateLensItems(orgId || undefined, selectedLensId || undefined);

  const updateFolderLens = useUpdateFolderLens(orgId || undefined, effectiveRootFolderId || undefined);

  const setFolderDefaultLens = useSetFolderDefaultLens(orgId || undefined, effectiveRootFolderId || undefined);

  const deleteLens = useDeleteLens(orgId || undefined, effectiveRootFolderId || undefined);

  const boardChildren = useMemo(() => {
    if (!effectiveRootFolderId) return [];

    const folders = Array.from(foldersById.values()).filter(folder => folder.parentFolderId === effectiveRootFolderId && folder.id !== effectiveRootFolderId && folder.humanId !== '__org_root__');
    const documents = Array.from(documentsById.values()).filter(document => document.folderId === effectiveRootFolderId && document.state === 'active');

    return [
      ...folders.map((f) => ({
        id: f.id,
        type: 'folder' as const,
        title: f.humanId,
        humanId: f.humanId,
        createdAt: f.createdAt,
        updatedAt: f.createdAt,
      })),
      ...documents.map((d) => ({
        id: d.id,
        type: 'document' as const,
        title: d.name,
        name: d.name,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    ];
  }, [effectiveRootFolderId, foldersById, documentsById]);

  const visibleLensItems = useMemo(() => boardChildren.filter(item =>
    (contentFilter === 'all' || item.type === (contentFilter === 'documents' ? 'document' : 'folder')) &&
    item.title.toLowerCase().includes(lensSearch.trim().toLowerCase())
  ).sort((a, b) => compareContentItems(a, b, sortOrder)), [boardChildren, contentFilter, lensSearch, sortOrder]);

  const handleBoardPersist = useCallback(
    async (items: LensItemInput[]) => {
      if (!updateLensItems.mutateAsync) return;
      await updateLensItems.mutateAsync({ items });
    },
    [updateLensItems]
  );


  const shouldRenderBoardLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'board' &&
    !isLoadingLens;

  const shouldRenderCanvasLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'canvas' &&
    !isLoadingLens;

  const shouldRenderStudyLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'study' &&
    !isLoadingLens;
  const pageShellClassName = 'mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8';

  const handleViewChangeFromToolbar = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    if (view === 'grid' || view === 'tree') {
      setSelectedLensId(null);
      setDesiredViewMode(view);
      return;
    }

    setSelectedLensId(lensId || null);
    setDesiredViewMode(null);
  };

  const handleEditLensRequest = (lens: AiruLens) => {
    setEditingLens(lens);
    setIsEditLensModalOpen(true);
  };

  const handleDeleteLensRequest = (lens: AiruLens) => {
    setDeleteLensModal(lens);
  };

  const lensToolbar = (
    <LensToolbar
                viewMode="lens"
                selectedLensId={selectedLensId}
                currentLens={lensData?.lens || null}
                lenses={folderLenses}
                folderId={effectiveRootFolderId}
                orgId={orgId || orgIdFromParams}
                placement="inline"
                showSearchRow={lensData?.lens.type !== 'study'}
                searchValue={lensSearch}
                onSearchChange={setLensSearch}
                contentFilter={contentFilter}
                onContentFilterChange={setContentFilter}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                resultCount={visibleLensItems.length}
                onViewChange={handleViewChangeFromToolbar}
                onCreateLens={() => setIsCreateLensModalOpen(true)}
                onEditLens={handleEditLensRequest}
                onDeleteLens={handleDeleteLensRequest}
                onSetDefaultLens={(lens) => void setFolderDefaultLens.mutateAsync({ lensId: lens.id })}
                onCreateFolder={() => setIsCreateFolderModalOpen(true)}
                onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
                onPasteDock={() => setIsPasteDockOpen(true)}
              />
  );

  if (!orgId || !userId) {
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
          title="Failed to load metadata"
          message={error.message || 'An error occurred while loading your folders and documents.'}
          onRetry={() => {
            const store = useAirunoteStore.getState();
            store.setLoading(true);
            store.setError(null);
            store.clear();
            window.location.reload();
          }}
          backUrl={`/orgs/${orgIdFromParams}/dashboard`}
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  return (
    <>
      <HomeOverview orgId={orgId} firstName={firstName} documents={recentDocuments}
        folderCount={allFolders.filter(folder => !folder.humanId.startsWith('__')).length}
        documentCount={allDocuments.length} updatedCount={weeklyActivity.documentsUpdated}
        pinnedFolders={pinnedFolders} pinnedDocuments={pinnedDocs} />

      {/* Lens switcher is now handled by ViewSwitcher in FolderViewLayout */}

      {/* Render Board Lens if active */}
      {shouldRenderBoardLens ? (
        <div className="min-h-[480px] bg-gray-50">
          <div className="w-full bg-gray-100" style={{ boxShadow: 'inset 0 -6px 8px -6px rgba(0,0,0,0.18)' }}>
            <div className={`${pageShellClassName} pb-0 pt-2`}>
              {lensToolbar}
            </div>
          </div>
          <div className={`${pageShellClassName} pt-6`}>
            <BoardLens
              orgId={orgId || orgIdFromParams}
              lens={lensData.lens}
              items={visibleLensItems}
              lensItems={lensData.items}
              onPersist={handleBoardPersist}
            />
          </div>
        </div>
      ) : shouldRenderCanvasLens ? (
        <div className="flex min-h-[560px] flex-col overflow-hidden bg-gray-50">
          <div className="w-full bg-gray-100" style={{ boxShadow: 'inset 0 -6px 8px -6px rgba(0,0,0,0.18)' }}>
            <div className={`${pageShellClassName} pb-0 pt-2`}>
              {lensToolbar}
            </div>
          </div>
          {isLoadingLens ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading canvas...</div>
            </div>
          ) : (
            <CanvasLens
              orgId={orgId || orgIdFromParams}
              lens={lensData.lens}
              items={visibleLensItems}
              lensItems={lensData.items || []}
              onPersist={handleBoardPersist}
            />
          )}
        </div>
      ) : shouldRenderStudyLens && effectiveRootFolderId ? (
        <div className="min-h-[480px] bg-gray-50">
          <div className="w-full bg-gray-100" style={{ boxShadow: 'inset 0 -6px 8px -6px rgba(0,0,0,0.18)' }}>
            <div className={`${pageShellClassName} pb-0 pt-2`}>
              {lensToolbar}
            </div>
          </div>
          <StudyLensRenderer folderId={effectiveRootFolderId} />
        </div>
      ) : (
        <FolderViewLayout
          folderId={effectiveRootFolderId}
          folderName="Home"
          breadcrumbPath={[]}
          orgId={orgId || orgIdFromParams}
          userId={userId || ''}
          onCreateFolder={() => setIsCreateFolderModalOpen(true)}
          onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
          onPasteDock={() => setIsPasteDockOpen(true)}
          onMoveFolder={(folder) => setMoveFolderModal(folder)}
          onDeleteFolder={(folder) => setDeleteFolderModal(folder)}
          hideHeader={true}
          selectedLensId={selectedLensId}
          onLensSelected={(lensId: string | null) => {
            setSelectedLensId(lensId);
            if (lensId) {
              setDesiredViewMode(null);
            }
          }}
          defaultViewMode={desiredViewMode || undefined}
          onEditLens={handleEditLensRequest}
          onDeleteLens={handleDeleteLensRequest}
          onSetDefaultLens={(lens) => void setFolderDefaultLens.mutateAsync({ lensId: lens.id })}
          onLensCreated={async (lens) => {
            await refetchFolderLenses();
            setSelectedLensId(lens.id);
            setDesiredViewMode(null);
          }}
        />
      )}

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        orgId={orgId}
        userId={userId}
        parentFolderId={effectiveRootFolderId}
        onSuccess={handleCreateFolderSuccess}
      />

      <CreateDocumentModal
        isOpen={isCreateDocumentModalOpen}
        onClose={() => setIsCreateDocumentModalOpen(false)}
        orgId={orgId}
        userId={userId}
        folderId={effectiveRootFolderId}
      />

      <PasteDock
        isOpen={isPasteDockOpen}
        onClose={() => setIsPasteDockOpen(false)}
        orgId={orgId}
        userId={userId}
        defaultFolderId={effectiveRootFolderId || ''} // Will be resolved on submit if needed
      />

      <CreateDesktopLensModal
        isOpen={isCreateDesktopLensModalOpen}
        onClose={() => setIsCreateDesktopLensModalOpen(false)}
        orgId={orgId}
        userId={userId}
        onSuccess={handleCreateDesktopLensSuccess}
      />

      <CreateSavedViewModal
        isOpen={isCreateSavedViewModalOpen}
        onClose={() => setIsCreateSavedViewModalOpen(false)}
        orgId={orgId}
        userId={userId}
        onSuccess={(lens) => {
          const orgIdFromPath = window.location.pathname.split('/')[2];
          window.location.href = `/orgs/${orgIdFromPath}/airunote/lens/${lens.id}`;
        }}
      />

      <CreateFolderLensModal
        isOpen={isCreateLensModalOpen}
        onClose={() => setIsCreateLensModalOpen(false)}
        orgId={orgId}
        userId={userId}
        folderId={effectiveRootFolderId || ''}
        onSuccess={async (lens) => {
          await refetchFolderLenses();
          setSelectedLensId(lens.id);
        }}
      />

      {/* Edit Lens Modal */}
      {editingLens && (
        <EditLensModal
          isOpen={isEditLensModalOpen}
          onClose={() => {
            setIsEditLensModalOpen(false);
            setEditingLens(null);
          }}
          onSuccess={async (updatedLens) => {
            await refetchFolderLenses();
            setIsEditLensModalOpen(false);
            setEditingLens(null);
          }}
          lens={editingLens}
          orgId={orgId}
          folderId={effectiveRootFolderId}
        />
      )}

      {/* Delete Lens Modal */}
      {deleteLensModal && (
        <DeleteConfirmationModal
          isOpen={!!deleteLensModal}
          onClose={() => setDeleteLensModal(null)}
          onConfirm={async () => {
            if (!orgId) return;
            await deleteLens.mutateAsync({ lensId: deleteLensModal.id });
            if (selectedLensId === deleteLensModal.id) {
              const remainingLenses = folderLenses.filter((l) => l.id !== deleteLensModal.id);
              if (remainingLenses.length > 0) {
                setSelectedLensId(remainingLenses[0].id);
              } else {
                setSelectedLensId(null);
              }
            }
            setDeleteLensModal(null);
          }}
          title="Delete Lens"
          message="Are you sure you want to delete this lens? This action cannot be undone."
          itemName={deleteLensModal.name}
          isDeleting={deleteLens.isPending}
        />
      )}

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
            setDeleteFolderModal(null);
          }}
          title="Delete Folder"
          message="Are you sure you want to delete this folder? This will delete all contents permanently."
          itemName={deleteFolderModal.humanId}
          isDeleting={deleteFolder.isPending}
        />
      )}
    </>
  );
}
