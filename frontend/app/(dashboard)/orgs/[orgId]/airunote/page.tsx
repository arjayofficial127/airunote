/**
 * Airunote Home Page
 * Root view showing user's folder tree and documents
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { useLoadMetadata } from '@/components/airunote/hooks/useLoadMetadata';
import { DocumentList } from '@/components/airunote/components/DocumentList';
import { CreateFolderModal } from '@/components/airunote/components/CreateFolderModal';
import { CreateDocumentModal } from '@/components/airunote/components/CreateDocumentModal';
import { PasteDock } from '@/components/airunote/components/PasteDock';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
import type { AiruFolder } from '@/components/airunote/types';

export default function AirunoteHomePage() {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  
  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  // Load metadata on mount
  useLoadMetadata();

  // Get store state
  const {
    foldersById,
    getFolderById,
    getFoldersByParent,
    getDocumentsByFolder,
    isLoading,
    error,
  } = useAirunoteStore();

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isPasteDockOpen, setIsPasteDockOpen] = useState(false);

  // Find user root folder (self-parent pattern)
  const allFolders = Array.from(foldersById.values()) as AiruFolder[];
  const userRoot = allFolders.find(
    (f) => f.humanId === '__user_root__' && f.parentFolderId === f.id
  );

  // Get root folder ID
  const effectiveRootFolderId = userRoot?.id || null;

  // Get root-level folders (children of user root)
  const rootFolders: AiruFolder[] = userRoot
    ? getFoldersByParent(userRoot.id)
    : [];

  // Get root-level documents (documents in user root)
  const rootDocuments = userRoot
    ? getDocumentsByFolder(userRoot.id)
    : [];

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
    <div className="p-8 overflow-y-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Airunote</h1>
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
          <p className="text-gray-600">Your private workspace</p>
        </div>

        {/* Root-level folders */}
        {rootFolders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Folders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rootFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <a
                    href={`/orgs/${orgIdFromParams}/airunote/folder/${folder.id}`}
                    className="block"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📁</span>
                      <div>
                        <h3 className="font-medium text-gray-900">{folder.humanId}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Root-level documents */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
          {rootDocuments.length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Create your first document to get started. You can create text files, markdown documents, or rich text files."
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
          ) : (
            <DocumentList documents={rootDocuments} orgId={orgId} />
          )}
        </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        orgId={orgId}
        userId={userId}
        parentFolderId={effectiveRootFolderId || ''} // Will be resolved on submit if needed
        onSuccess={handleCreateFolderSuccess}
      />

      <CreateDocumentModal
        isOpen={isCreateDocumentModalOpen}
        onClose={() => setIsCreateDocumentModalOpen(false)}
        orgId={orgId}
        userId={userId}
        folderId={effectiveRootFolderId || ''} // Will be resolved on submit if needed
      />

      <PasteDock
        isOpen={isPasteDockOpen}
        onClose={() => setIsPasteDockOpen(false)}
        orgId={orgId}
        userId={userId}
        defaultFolderId={effectiveRootFolderId || ''} // Will be resolved on submit if needed
      />
    </div>
  );
}
