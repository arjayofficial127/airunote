/**
 * Document View Page
 * View/edit document based on type (TXT/MD editor, RTF viewer-first)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useDocumentContent } from '@/components/airunote/hooks/useDocumentContent';
import { useUpdateDocument } from '@/components/airunote/hooks/useUpdateDocument';
import { useDeleteDocument } from '@/components/airunote/hooks/useDeleteDocument';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { DocumentEditor } from '@/components/airunote/components/DocumentEditor';
import { DocumentViewer } from '@/components/airunote/components/DocumentViewer';
import { DeleteConfirmationModal } from '@/components/airunote/components/DeleteConfirmationModal';
import { DocumentEditorSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import type { AiruDocument } from '@/components/airunote/types';
import Link from 'next/link';

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId: string | null = typeof params.documentId === 'string' ? params.documentId : null;
  const orgIdFromParams = params.orgId as string;

  const orgSession = useOrgSession();
  const authSession = useAuthSession();

  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch document content from ContentStore (lazy-loaded)
  const { document: originalDocument, isLoading, error } = useDocumentContent(documentId);
  
  // Editable clone (never mutate original)
  const [editingDocument, setEditingDocument] = useState<AiruDocument | null>(null);
  const originalDocumentRef = useRef<AiruDocument | null>(null);

  const store = useAirunoteStore.getState();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  // Create editable clone when document loads or when entering edit mode
  useEffect(() => {
    if (!originalDocument) {
      setEditingDocument(null);
      originalDocumentRef.current = null;
      return;
    }

    // If original document changed, update ref and create new clone
    if (originalDocumentRef.current?.id !== originalDocument.id) {
      originalDocumentRef.current = originalDocument;
      // Create deep clone for editing
      const clone = structuredClone(originalDocument) as AiruDocument;
      setEditingDocument(clone);
    }
  }, [originalDocument]);

  // When entering edit mode, ensure we have a fresh clone
  useEffect(() => {
    if (isEditMode && originalDocument && !editingDocument) {
      const clone = structuredClone(originalDocument) as AiruDocument;
      setEditingDocument(clone);
    }
  }, [isEditMode, originalDocument, editingDocument]);

  // Use editing document if in edit mode, otherwise use original
  const document = isEditMode && editingDocument ? editingDocument : originalDocument;

  const handleSave = async (content: string) => {
    if (!orgId || !userId || !editingDocument || !documentId) return;

    try {
      // Update editing document with new content
      const updatedEditingDocument: AiruDocument = {
        ...editingDocument,
        content,
        updatedAt: new Date(),
      };

      // Call API update
      const updated = await updateDocument.mutateAsync({
        documentId,
        request: {
          orgId,
          userId,
          content,
        },
      });

      // On success: update ContentStore with saved document
      store.setDocumentContent(updated);
      
      // Update MetadataStore with new updatedAt
      const metadata = store.getDocumentMetadataById(documentId);
      if (metadata) {
        store.updateDocumentMetadata({
          ...metadata,
          updatedAt: updated.updatedAt,
        });
      }

      // Update original ref and create new clone for next edit
      originalDocumentRef.current = updated;
      const newClone = structuredClone(updated) as AiruDocument;
      setEditingDocument(newClone);
      
      // Exit edit mode for RTF documents
      if (updated.type === 'RTF') {
        setIsEditMode(false);
      }
    } catch (err) {
      console.error('Failed to save document:', err);
      // Error toast is handled by the hook
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!orgId || !userId || !document || !documentId) return;

    try {
      await deleteDocument.mutateAsync({
        documentId,
        orgId,
        userId,
        folderId: document.folderId,
      });
      // Remove from ContentStore and MetadataStore
      store.removeDocument(documentId);
      store.removeDocumentContent(documentId);
      router.push(`/orgs/${orgIdFromParams}/airunote`);
    } catch (err) {
      console.error('Failed to delete document:', err);
      // Error toast is handled by the hook
    }
  };

  const handleRename = async (name: string) => {
    if (!orgId || !userId || !editingDocument || !documentId) return;

    try {
      const updated = await updateDocument.mutateAsync({
        documentId,
        request: {
          orgId,
          userId,
          name,
        },
      });

      // Update ContentStore
      store.setDocumentContent(updated);
      
      // Update MetadataStore
      const metadata = store.getDocumentMetadataById(documentId);
      if (metadata) {
        store.updateDocumentMetadata({
          ...metadata,
          name: updated.name,
          updatedAt: updated.updatedAt,
        });
      }

      // Update editing document
      const updatedEditingDocument: AiruDocument = {
        ...editingDocument,
        name: updated.name,
        updatedAt: updated.updatedAt,
      };
      setEditingDocument(updatedEditingDocument);
      
      // Update original ref
      originalDocumentRef.current = updated;
    } catch (err) {
      console.error('Failed to rename document:', err);
      // Error toast is handled by the hook
      throw err;
    }
  };

  const handleCancel = () => {
    // Discard editing document, revert to original
    if (originalDocumentRef.current) {
      const freshClone = structuredClone(originalDocumentRef.current) as AiruDocument;
      setEditingDocument(freshClone);
    }
    setIsEditMode(false);
  };

  if (!orgId || !userId) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Route guard: Don't render until document is loaded or error occurs
  // This prevents rendering with stale/empty data when navigating directly to document URL
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

  // Guard: If document is not in ContentStore and not loading, it means fetch failed or document doesn't exist
  if (!originalDocument) {
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

  if (document.type === 'RTF') {
    return (
      <div className="h-screen flex flex-col">
        <DocumentViewer
          document={document || originalDocument!}
          onEdit={() => setIsEditMode(true)}
          onCancel={handleCancel}
          onDelete={async () => { setIsDeleteModalOpen(true); }}
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
        document={document || originalDocument!}
        onSave={handleSave}
        onDelete={async () => { setIsDeleteModalOpen(true); }}
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
