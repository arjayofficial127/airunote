/**
 * Document View Page
 * View/edit document based on type (TXT/MD editor, RTF viewer-first)
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteDocument } from '@/components/airunote/hooks/useAirunoteDocument';
import { useUpdateDocument } from '@/components/airunote/hooks/useUpdateDocument';
import { useDeleteDocument } from '@/components/airunote/hooks/useDeleteDocument';
import { DocumentEditor } from '@/components/airunote/components/DocumentEditor';
import { DocumentViewer } from '@/components/airunote/components/DocumentViewer';
import { DeleteConfirmationModal } from '@/components/airunote/components/DeleteConfirmationModal';
import { DocumentEditorSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import Link from 'next/link';

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;
  const orgIdFromParams = params.orgId as string;

  const orgSession = useOrgSession();
  const authSession = useAuthSession();

  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch document
  const { data: document, isLoading, error } = useAirunoteDocument(orgId, userId, documentId);
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  const handleSave = async (content: string) => {
    if (!orgId || !userId || !document) return;

    try {
      await updateDocument.mutateAsync({
        documentId,
        request: {
          orgId,
          userId,
          content,
        },
      });
    } catch (err) {
      console.error('Failed to save document:', err);
      // Error toast is handled by the hook
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!orgId || !userId || !document) return;

    try {
      await deleteDocument.mutateAsync({
        documentId,
        orgId,
        userId,
        folderId: document.folderId,
      });
      // Navigate back to folder or home
      router.push(`/orgs/${orgIdFromParams}/airunote`);
    } catch (err) {
      console.error('Failed to delete document:', err);
      // Error toast is handled by the hook
    }
  };

  const handleRename = async (name: string) => {
    if (!orgId || !userId || !document) return;

    try {
      await updateDocument.mutateAsync({
        documentId,
        request: {
          orgId,
          userId,
          name,
        },
      });
    } catch (err) {
      console.error('Failed to rename document:', err);
      // Error toast is handled by the hook
      throw err;
    }
  };

  if (!orgId || !userId) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return <DocumentEditorSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load document"
        message={error.message || 'An error occurred while loading this document.'}
        onRetry={() => window.location.reload()}
        backUrl={`/orgs/${orgIdFromParams}/airunote`}
        backLabel="Back to Home"
      />
    );
  }

  if (!document) {
    return (
      <ErrorState
        title="Document not found"
        message="This document may have been deleted or you may not have permission to access it."
        backUrl={`/orgs/${orgIdFromParams}/airunote`}
        backLabel="Back to Home"
      />
    );
  }

  // RTF documents: viewer-first (read-only by default)
  if (document.type === 'RTF') {
    return (
      <div className="h-screen flex flex-col">
        <DocumentViewer
          document={document}
          onEdit={() => setIsEditMode(true)}
          onDelete={() => setIsDeleteModalOpen(true)}
          onRename={handleRename}
          isEditMode={isEditMode}
          onSave={isEditMode ? handleSave : undefined}
          isSaving={updateDocument.isPending}
        />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Document"
          message="Are you sure you want to delete this document? This action cannot be undone."
          itemName={document.name}
          isDeleting={deleteDocument.isPending}
        />
      </div>
    );
  }

  // TXT/MD documents: always in editor mode
  // RTF documents: editor mode (after clicking Edit)
  return (
    <div className="h-screen flex flex-col">
      <DocumentEditor
        document={document}
        onSave={handleSave}
        onDelete={() => setIsDeleteModalOpen(true)}
        onRename={handleRename}
        isSaving={updateDocument.isPending}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        itemName={document.name}
        isDeleting={deleteDocument.isPending}
      />
    </div>
  );
}
