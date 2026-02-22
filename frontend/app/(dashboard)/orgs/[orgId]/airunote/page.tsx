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

  // Get store state (metadata loaded by AirunoteDataProvider)
  const {
    foldersById,
    isLoading,
    error,
  } = useAirunoteStore();

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
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
      />

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
    </>
  );
}
