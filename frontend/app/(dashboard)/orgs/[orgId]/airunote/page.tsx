/**
 * Airunote Home Page
 * Root view showing user's folder tree and documents
 */

'use client';

import { useState, useEffect } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteTree } from '@/components/airunote/hooks/useAirunoteTree';
import { FolderTree } from '@/components/airunote/components/FolderTree';
import { DocumentList } from '@/components/airunote/components/DocumentList';
import { CreateFolderModal } from '@/components/airunote/components/CreateFolderModal';
import { CreateDocumentModal } from '@/components/airunote/components/CreateDocumentModal';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
import type { AiruFolder } from '@/components/airunote/types';

export default function AirunoteHomePage() {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  
  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);

  // Fetch root folder tree
  const { data: tree, isLoading, error } = useAirunoteTree(orgId, userId);

  // Get root folder ID from tree structure
  // The root folder ID is the parentFolderId of the first folder, or we need to provision
  // For now, we'll use a placeholder and let the backend handle provisioning
  // When creating folders/documents, if root doesn't exist, backend will auto-provision
  const rootFolderId = tree?.folders[0]?.parentFolderId || 'root';
  
  // Store root folder ID once we have it
  const [actualRootFolderId, setActualRootFolderId] = useState<string | null>(null);
  
  // Try to provision root if tree is empty
  useEffect(() => {
    if (!isLoading && !error && tree && tree.folders.length === 0 && tree.documents.length === 0 && orgId && userId && !actualRootFolderId) {
      // Tree is empty - try to provision
      airunoteApi
        .provision(orgId, userId, userId)
        .then((response) => {
          if (response.success) {
            setActualRootFolderId(response.data.rootFolder.id);
          }
        })
        .catch((err) => {
          console.error('Failed to provision root:', err);
          // Continue anyway - backend will auto-provision on first create
        });
    } else if (tree?.folders[0]?.parentFolderId) {
      setActualRootFolderId(tree.folders[0].parentFolderId);
    }
  }, [isLoading, error, tree, orgId, userId, actualRootFolderId]);
  
  // Use actual root folder ID if available, otherwise use placeholder
  const effectiveRootFolderId = actualRootFolderId || rootFolderId;

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
        <div className="text-gray-600">Loading folder tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-600">Error loading folder tree: {error.message}</div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="p-8">
        <div className="text-gray-600">No data available</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - Folder Tree */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Folders</h2>
          <button
            onClick={() => setIsCreateFolderModalOpen(true)}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Folder
          </button>
        </div>
        <FolderTree tree={tree} orgId={orgId} />
      </div>

      {/* Main Content - Documents */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Airunote</h1>
            <button
              onClick={() => setIsCreateDocumentModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Document
            </button>
          </div>
          <p className="text-gray-600">Your private workspace</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
          <DocumentList documents={tree.documents} orgId={orgId} />
        </div>
      </div>

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
    </div>
  );
}
