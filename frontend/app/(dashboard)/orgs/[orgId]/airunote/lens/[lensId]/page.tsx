/**
 * Lens View Page
 * Phase 5 — Desktop Lenses
 * 
 * Displays documents from a lens (desktop or folder lens)
 * For desktop lenses, documents are fetched via query filter
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useLens } from '@/components/airunote/hooks/useLens';
import { FolderViewLayout } from '@/components/airunote/components/FolderViewLayout';
import { CanvasView } from '@/components/airunote/components/CanvasView';
import { BoardView } from '@/components/airunote/components/BoardView';
import { DocumentList } from '@/components/airunote/components/DocumentList';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { EditSavedViewModal } from '@/components/airunote/components/EditSavedViewModal';
import type { AiruDocumentMetadata, AiruLens } from '@/components/airunote/types';

export default function LensViewPage() {
  const params = useParams();
  const router = useRouter();
  const lensId: string | null = typeof params.lensId === 'string' ? params.lensId : null;
  const orgIdFromParams = params.orgId as string;

  const orgSession = useOrgSession();
  const authSession = useAuthSession();

  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch lens and documents via GET /lenses/:id
  const { data: lensData, isLoading, error } = useLens({
    lensId,
    orgId: orgId || orgIdFromParams,
    userId: userId || '',
    enabled: !!lensId && !!orgId && !!userId,
  });

  const lens = lensData?.lens || null;
  const documents = lensData?.documents || [];

  // Convert documents to metadata format for display
  const documentMetadata: AiruDocumentMetadata[] = documents.map((doc) => ({
    id: doc.id,
    folderId: doc.folderId,
    ownerUserId: doc.ownerUserId,
    type: doc.type,
    name: doc.name,
    visibility: doc.visibility,
    state: doc.state,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    attributes: doc.attributes || {},
  }));

  if (!orgId || !userId || !lensId) {
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
          title="Failed to load lens"
          message="An error occurred while loading this lens."
          onRetry={() => window.location.reload()}
          backUrl={`/orgs/${orgIdFromParams}/airunote`}
          backLabel="Back to Home"
        />
      </div>
    );
  }

  if (!lens) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Lens not found</div>
        <Link
          href={`/orgs/${orgIdFromParams}/airunote`}
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  // Build breadcrumb
  const breadcrumbPath = [
    { id: '', name: 'Home' },
    { id: lens.id, name: lens.name },
  ];

  return (
    <div className="p-8 overflow-y-auto">
      {/* Breadcrumb Path */}
      <nav className="mb-4">
        <ol className="flex items-center space-x-1 text-sm text-gray-500">
          <li>
            <Link
              href={`/orgs/${orgIdFromParams}/airunote`}
              className="hover:text-blue-600 transition-colors duration-150"
            >
              Home
            </Link>
          </li>
          <li>
            <span className="mx-1.5 text-gray-400">›</span>
            <span className="text-gray-700">{lens.name}</span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lens.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {documentMetadata.length} {documentMetadata.length === 1 ? 'document' : 'documents'}
              {lens.folderId === null && lens.type === 'desktop' && ' (Desktop Lens)'}
              {lens.folderId === null && lens.type === 'saved' && ' (Saved View)'}
            </p>
          </div>
          {lens.type === 'saved' && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Edit View
            </button>
          )}
        </div>
      </div>

      {/* Documents Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
        {documentMetadata.length === 0 ? (
          <EmptyState
            title="No documents match this query"
            description="Try adjusting your query to find documents."
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        ) : lens.type === 'canvas' && lens.id ? (
          // Phase 3: Canvas view - positions stored in lens metadata
          <CanvasView
            documents={documentMetadata}
            lens={lens}
            lensId={lens.id}
            orgId={orgId}
          />
        ) : lens.type === 'board' && lens.id ? (
          // Phase 4: Board view - lanes and card positions stored in lens metadata
          <BoardView
            documents={documentMetadata}
            lens={lens}
            lensId={lens.id}
            orgId={orgId}
          />
        ) : (
          <DocumentList 
            documents={documentMetadata} 
            orgId={orgId}
          />
        )}
      </div>

      {/* Edit Saved View Modal */}
      {lens.type === 'saved' && (
        <EditSavedViewModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          lens={lens}
          orgId={orgId}
          userId={userId}
          onSuccess={() => {
            // Refetch lens data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
