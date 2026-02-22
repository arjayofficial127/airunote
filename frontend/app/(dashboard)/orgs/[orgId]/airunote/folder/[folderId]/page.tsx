/**
 * Folder View Page
 * Displays contents of a specific folder (child folders + documents)
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteTree } from '@/components/airunote/hooks/useAirunoteTree';
import { DocumentList } from '@/components/airunote/components/DocumentList';
import { FolderBreadcrumb } from '@/components/airunote/components/FolderBreadcrumb';
import { buildFolderPath } from '@/components/airunote/utils/folderPath';
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

  // Fetch tree for this specific folder
  const { data: tree, isLoading, error } = useAirunoteTree(orgId ?? null, userId ?? null, folderId ?? undefined);

  // Also fetch root tree for breadcrumb path building
  const { data: rootTree } = useAirunoteTree(orgId ?? null, userId ?? null);

  // Build folder path for breadcrumb
  const folderPath = rootTree && folderId ? buildFolderPath(rootTree, folderId) : [];

  const handleCreateFolderSuccess = (folder: AiruFolder) => {
    // Modal will close automatically
    // Tree will refetch automatically via React Query invalidation
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

  if (!tree) {
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

  return (
    <div className="p-8 overflow-y-auto">
        {/* Breadcrumb */}
        {rootTree ? (
          folderPath.length > 0 ? (
            <FolderBreadcrumb path={folderPath} orgId={orgId} />
          ) : (
            <nav className="mb-6">
              <ol className="flex items-center space-x-2 text-sm text-gray-600">
                <li>
                  <Link
                    href={`/orgs/${orgIdFromParams}/airunote`}
                    className="hover:text-blue-600"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-900 font-medium">Folder</span>
                </li>
              </ol>
            </nav>
          )
        ) : null}

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Folder</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsPasteDockOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Paste Dock - Quick paste and save"
              >
                📋 Paste Dock
              </button>
              <button
                onClick={() => setIsCreateDocumentModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Document
              </button>
            </div>
          </div>
        </div>

        {/* Child Folders */}
        {tree.folders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Folders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tree.folders.map((folder) => (
                <div
                  key={folder.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group relative"
                >
                  <Link
                    href={`/orgs/${orgIdFromParams}/airunote/folder/${folder.id}`}
                    className="flex items-center space-x-3"
                  >
                    <span className="text-2xl">📁</span>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{folder.humanId}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMoveFolderModal(folder);
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      title="Move folder"
                    >
                      Move
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteFolderModal(folder);
                      }}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                      title="Delete folder"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
          <div className="space-y-2">
            {tree.documents.map((doc) => (
              <div key={doc.id} className="group relative">
                <Link
                  href={`/orgs/${orgIdFromParams}/airunote/document/${doc.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-2xl">
                        {doc.type === 'TXT' ? '📄' : doc.type === 'MD' ? '📝' : '📋'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900 truncate">
                          {doc.name}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMoveDocumentModal(doc);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    title="Move document"
                  >
                    Move
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteDocumentModal(doc);
                    }}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                    title="Delete document"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          {tree.documents.length === 0 && (
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
                  onClick={() => setIsCreateDocumentModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Document
                </button>
              }
            />
          )}
          </div>
        </div>

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
    </div>
  );
}
