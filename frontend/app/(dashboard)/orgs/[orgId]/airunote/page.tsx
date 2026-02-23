/**
 * Airunote Home Page
 * Root view showing user's folder tree and documents
 */

'use client';

import { useState, useEffect } from 'react';
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
import { PasteDock } from '@/components/airunote/components/PasteDock';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
import type { AiruFolder, AiruLens } from '@/components/airunote/types';

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
    isLoading,
    error,
  } = useAirunoteStore();

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isCreateDesktopLensModalOpen, setIsCreateDesktopLensModalOpen] = useState(false);
  const [isCreateSavedViewModalOpen, setIsCreateSavedViewModalOpen] = useState(false);
  const [isPasteDockOpen, setIsPasteDockOpen] = useState(false);

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
      <FolderViewLayout
        folderId={effectiveRootFolderId}
        folderName="Home"
        breadcrumbPath={[]}
        orgId={orgId || orgIdFromParams}
        userId={userId || ''}
        onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
        onPasteDock={() => setIsPasteDockOpen(true)}
        onMoveFolder={() => {}} // Enable edit button in Home
        onDeleteFolder={() => {}} // Enable edit button in Home
      />

      {/* Desktop Lens & Saved View Creation Buttons */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        <button
          onClick={() => setIsCreateSavedViewModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-150 flex items-center space-x-2"
          title="Create Saved View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="font-medium">New Saved View</span>
        </button>
        <button
          onClick={() => setIsCreateDesktopLensModalOpen(true)}
          className="px-6 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors duration-150 flex items-center space-x-2"
          title="Create Desktop Lens"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">New Desktop Lens</span>
        </button>
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
    </>
  );
}
