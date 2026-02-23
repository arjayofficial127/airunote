/**
 * Folder View Page
 * Displays contents of a specific folder (child folders + documents)
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { FolderViewLayout } from '@/components/airunote/components/FolderViewLayout';
import { CreateFolderModal } from '@/components/airunote/components/CreateFolderModal';
import { CreateDocumentModal } from '@/components/airunote/components/CreateDocumentModal';
import { MoveFolderModal } from '@/components/airunote/components/MoveFolderModal';
import { MoveDocumentModal } from '@/components/airunote/components/MoveDocumentModal';
import { PasteDock } from '@/components/airunote/components/PasteDock';
import { DeleteConfirmationModal } from '@/components/airunote/components/DeleteConfirmationModal';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeleteFolder } from '@/components/airunote/hooks/useDeleteFolder';
import { useDeleteDocument } from '@/components/airunote/hooks/useDeleteDocument';
import Link from 'next/link';
import type { AiruFolder, AiruDocument } from '@/components/airunote/types';

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
    isLoading,
    error,
  } = useAirunoteStore();

  // Get current folder
  const currentFolder = folderId ? getFolderById(folderId) : null;

  // Build breadcrumb path from store (for clickable navigation)
  const breadcrumbPath: Array<{ id: string; name: string }> = [];
  if (folderId && currentFolder) {
    let folder: AiruFolder | null = currentFolder;
    const pathFolders: AiruFolder[] = [];

    // Build path upward from current to root
    while (folder) {
      const currentFolderItem: AiruFolder = folder;
      pathFolders.unshift(currentFolderItem);

      // Find parent folder
      if (currentFolderItem.parentFolderId === currentFolderItem.id) {
        // Self-parent means root, stop here
        break;
      }

      const parent = getFolderById(currentFolderItem.parentFolderId);
      if (!parent) {
        // Parent not found, stop
        break;
      }

      folder = parent;
    }

    // Build breadcrumb path (filter out root folders and user root)
    for (const pathFolder of pathFolders) {
      // Skip root folders (self-parent pattern)
      if (pathFolder.parentFolderId === pathFolder.id) {
        continue;
      }

      // Skip user root folder (__user_root__) - it's internal
      if (pathFolder.humanId === '__user_root__') {
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

  return (
    <>
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
      />

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
    </>
  );
}
