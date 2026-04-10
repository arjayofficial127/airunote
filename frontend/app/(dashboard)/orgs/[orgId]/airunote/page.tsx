/**
 * Airunote Home Page
 * Root view showing user's folder tree and documents
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
import { getFolderTypeIcon } from '@/components/airunote/utils/folderTypeIcon';
import { FileTypeChip } from '@/components/airunote/components/FileTypeChip';
import type { AiruFolder, AiruDocumentMetadata } from '@/components/airunote/types';
import type { AiruLens, LensItemInput } from '@/lib/api/airunoteLensesApi';

export default function AirunoteHomePage() {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  
  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  // Get store state (metadata loaded by AirunoteDataProvider)
  const {
    foldersById,
    documentsById,
    isLoading,
    error,
    getFoldersByParent,
    getDocumentsByFolder,
  } = useAirunoteStore();

  // Pinned items state (local, not persisted)
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

  // Find user root folder
  // Note: User root has humanId='__user_root__' and parentFolderId=orgRoot.id (not self-parent)
  const allFolders = Array.from(foldersById.values()) as AiruFolder[];
  const userRoot = allFolders.find(
    (f) => f.humanId === '__user_root__' && f.ownerUserId === userId
  );

  // Get root folder ID
  const effectiveRootFolderId = userRoot?.id || null;

  // Provision root if needed
  useEffect(() => {
    if (!orgId || !userId) return;
    if (userRoot) return; // Already have root
    if (isLoading) return; // Still loading

    // No root found, provision it
    airunoteApi
      .provision(orgId, userId, userId)
      .then((response) => {
        if (response.success) {
          // Add root folder to store
          const store = useAirunoteStore.getState();
          store.addFolder(response.data.rootFolder);
        }
      })
      .catch((err) => {
        console.error('Failed to provision root:', err);
      });
  }, [orgId, userId, userRoot, isLoading]);

  const handleCreateFolderSuccess = (folder: AiruFolder) => {
    // Modal will close automatically
    // Tree will refetch automatically via React Query invalidation
  };

  const handleCreateDesktopLensSuccess = (lens: AiruLens) => {
    // Navigate to lens view
    const orgIdFromPath = window.location.pathname.split('/')[2];
    window.location.href = `/orgs/${orgIdFromPath}/airunote/lens/${lens.id}`;
  };

  // Utility: Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get all documents (across all folders) for Continue Working and Activity
  const allDocuments = useMemo(() => {
    return Array.from(documentsById.values()) as AiruDocumentMetadata[];
  }, [documentsById]);

  // Recent Documents: Top 3 recently updated documents
  const recentDocuments = useMemo(() => {
    return allDocuments
      .filter((doc) => doc.state === 'active')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [allDocuments]);

  // Pinned items (folders + documents)
  const pinnedFolders = useMemo(() => {
    return Array.from(foldersById.values())
      .filter((folder) => pinnedItems.folders.has(folder.id))
      .filter((folder) => folder.humanId !== '__user_root__' && folder.humanId !== '__org_root__');
  }, [foldersById, pinnedItems.folders]);

  const pinnedDocs = useMemo(() => {
    return allDocuments.filter((doc) => pinnedItems.documents.has(doc.id));
  }, [allDocuments, pinnedItems.documents]);

  const hasPinnedItems = pinnedFolders.length > 0 || pinnedDocs.length > 0;

  // Activity Snapshot: Weekly counts
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

  // Extract first name from user name
  const firstName = useMemo(() => {
    if (!authSession.user?.name) return '';
    return authSession.user.name.split(' ')[0];
  }, [authSession.user?.name]);

  // Fetch folder lenses for root folder
  const { data: folderLenses = [], isLoading: isLoadingLenses, refetch: refetchFolderLenses } = useFolderLenses(
    orgId || undefined,
    effectiveRootFolderId || undefined
  );

  // Determine active lens
  const activeLensId = useMemo(() => {
    if (!userRoot || !folderLenses.length) return null;
    
    // Priority 1: folder.defaultLensId
    const folderWithDefaultLens = userRoot as AiruFolder & { defaultLensId?: string | null };
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
  }, [userRoot, folderLenses]);

  // Local state for lens switching
  const [selectedLensId, setSelectedLensId] = useState<string | null>(activeLensId);
  const [desiredViewMode, setDesiredViewMode] = useState<'grid' | 'tree' | null>(null);

  // Update selected lens when active lens changes
  useEffect(() => {
    if (desiredViewMode === null && activeLensId !== null && selectedLensId === null) {
      setSelectedLensId(activeLensId);
    }
  }, [activeLensId, desiredViewMode, selectedLensId]);

  // Fetch active lens data
  const { data: lensData, isLoading: isLoadingLens } = useLens(
    orgId || undefined,
    selectedLensId || undefined
  );

  // Hook for updating lens items
  const updateLensItems = useUpdateLensItems(orgId || undefined, selectedLensId || undefined);

  // Hook for updating folder lens
  const updateFolderLens = useUpdateFolderLens(orgId || undefined, effectiveRootFolderId || undefined);

  // Hook for setting default lens for the root folder
  const setFolderDefaultLens = useSetFolderDefaultLens(orgId || undefined, effectiveRootFolderId || undefined);
  
  // Hook for deleting lens
  const deleteLens = useDeleteLens(orgId || undefined, effectiveRootFolderId || undefined);

  // Prepare children for BoardLens and CanvasLens
  const boardChildren = useMemo(() => {
    if (!effectiveRootFolderId) return [];

    const folders = getFoldersByParent(effectiveRootFolderId);
    const documents = getDocumentsByFolder(effectiveRootFolderId);
    
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
  }, [effectiveRootFolderId, getFoldersByParent, getDocumentsByFolder]);

  // Handle persist for lens items
  const handleBoardPersist = useCallback(
    async (items: LensItemInput[]) => {
      if (!updateLensItems.mutateAsync) return;
      await updateLensItems.mutateAsync({ items });
    },
    [updateLensItems]
  );

  // Filter lenses for switcher
  // availableLenses removed - now handled by ViewSwitcher in FolderViewLayout

  // Determine which lens to render
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
  const pageShellClassName = 'mx-auto w-full max-w-[1400px] px-6 lg:px-8';
  const sectionStackClassName = `${pageShellClassName} py-8`;

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
            // Trigger reload via useLoadMetadata
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
      <div className={sectionStackClassName}>
        {/* Welcome Header with Latest Document */}
        <div className="mt-2 flex flex-col gap-8">
          <div>
          <h1 className="text-2xl font-medium text-gray-900 mb-1">
            Welcome back{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-base text-gray-600 mb-4">Continue where you left off.</p>
          </div>
          
          {/* Recent Documents - Top 3, always visible */}
          {recentDocuments.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent documents</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recentDocuments.map((doc) => {
                  const documentPath = `/orgs/${orgIdFromParams}/airunote/document/${doc.id}`;
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
                  return (
                    <div key={doc.id} className="group relative rounded-lg border border-gray-200 bg-white p-4 transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm">
                      <Link
                        href={documentPath}
                        className="flex flex-col h-full cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0 mb-3">
                          <span className="text-2xl flex-shrink-0">{getDocumentIcon(doc.type)}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {doc.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(doc.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center gap-2">
                          <FileTypeChip type={doc.type} />
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">Updated {formatDate(doc.updatedAt)}</span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Pinned Items Section */}
        {hasPinnedItems && (
          <section className="mt-8 flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Pinned</h2>
            <div className="space-y-3">
              {pinnedFolders.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/orgs/${orgIdFromParams}/airunote/folder/${folder.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getFolderTypeIcon(folder.type)}</span>
                    <span className="text-base font-medium text-gray-900">{folder.humanId}</span>
                    <span className="text-xs text-gray-500">[Folder]</span>
                  </div>
                </Link>
              ))}
              {pinnedDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/orgs/${orgIdFromParams}/airunote/document/${doc.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-900">{doc.name}</span>
                    <span className="text-xs text-gray-500">[Doc]</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lens switcher is now handled by ViewSwitcher in FolderViewLayout */}

      {/* Render Board Lens if active */}
      {shouldRenderBoardLens ? (
        <div className="min-h-screen bg-gray-50">
          <div className={`${pageShellClassName} pb-0 pt-8`}>
            <LensToolbar
              viewMode="lens"
              selectedLensId={selectedLensId}
              currentLens={lensData?.lens || null}
              lenses={folderLenses}
              folderId={effectiveRootFolderId}
              orgId={orgId || orgIdFromParams}
              placement="inline"
              onViewChange={handleViewChangeFromToolbar}
              onCreateLens={() => setIsCreateLensModalOpen(true)}
              onEditLens={handleEditLensRequest}
              onDeleteLens={handleDeleteLensRequest}
              onSetDefaultLens={(lens) => void setFolderDefaultLens.mutateAsync({ lensId: lens.id })}
              onCreateFolder={() => setIsCreateFolderModalOpen(true)}
              onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
              onPasteDock={() => setIsPasteDockOpen(true)}
            />
          </div>
          <div className={`${pageShellClassName} pt-6`}>
            <BoardLens
              orgId={orgId || orgIdFromParams}
              lens={lensData.lens}
              items={boardChildren}
              lensItems={lensData.items}
              onPersist={handleBoardPersist}
            />
          </div>
        </div>
      ) : shouldRenderCanvasLens ? (
        <div className="h-screen overflow-hidden bg-gray-50">
          <div className={`${pageShellClassName} pb-0 pt-8`}>
            <LensToolbar
              viewMode="lens"
              selectedLensId={selectedLensId}
              currentLens={lensData?.lens || null}
              lenses={folderLenses}
              folderId={effectiveRootFolderId}
              orgId={orgId || orgIdFromParams}
              placement="inline"
              onViewChange={handleViewChangeFromToolbar}
              onCreateLens={() => setIsCreateLensModalOpen(true)}
              onEditLens={handleEditLensRequest}
              onDeleteLens={handleDeleteLensRequest}
              onSetDefaultLens={(lens) => void setFolderDefaultLens.mutateAsync({ lensId: lens.id })}
              onCreateFolder={() => setIsCreateFolderModalOpen(true)}
              onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
              onPasteDock={() => setIsPasteDockOpen(true)}
            />
          </div>
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
      ) : shouldRenderStudyLens && effectiveRootFolderId ? (
        <div className="min-h-screen bg-gray-50">
          <div className={`${pageShellClassName} pb-0 pt-8`}>
            <LensToolbar
              viewMode="lens"
              selectedLensId={selectedLensId}
              currentLens={lensData?.lens || null}
              lenses={folderLenses}
              folderId={effectiveRootFolderId}
              orgId={orgId || orgIdFromParams}
              placement="inline"
              onViewChange={handleViewChangeFromToolbar}
              onCreateLens={() => setIsCreateLensModalOpen(true)}
              onEditLens={handleEditLensRequest}
              onDeleteLens={handleDeleteLensRequest}
              onSetDefaultLens={(lens) => void setFolderDefaultLens.mutateAsync({ lensId: lens.id })}
              onCreateFolder={() => setIsCreateFolderModalOpen(true)}
              onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
              onPasteDock={() => setIsPasteDockOpen(true)}
              showSearchRow={false}
            />
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
            // Refetch folder lenses to get the new lens
            await refetchFolderLenses();
            // Auto-select the new lens
            setSelectedLensId(lens.id);
            setDesiredViewMode(null);
          }}
        />
      )}

      {/* Activity Snapshot - Moved to bottom */}
      {(weeklyActivity.documentsUpdated > 0 || weeklyActivity.foldersCreated > 0) && (
        <div className={`${pageShellClassName} pb-8`}>
          <h2 className="text-lg font-medium text-gray-700 mb-3">This Week</h2>
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
            <div className="space-y-1 text-sm text-gray-600">
              {weeklyActivity.documentsUpdated > 0 && (
                <div>{weeklyActivity.documentsUpdated} document{weeklyActivity.documentsUpdated !== 1 ? 's' : ''} updated</div>
              )}
              {weeklyActivity.foldersCreated > 0 && (
                <div>{weeklyActivity.foldersCreated} folder{weeklyActivity.foldersCreated !== 1 ? 's' : ''} created</div>
              )}
            </div>
          </div>
        </div>
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
          // Navigate to lens view
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
          // Refetch folder lenses to get the new lens
          await refetchFolderLenses();
          // Auto-select the new lens
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
            // Refetch folder lenses to get the updated lens
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
            // If deleted lens was selected, switch to first available lens or null
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
