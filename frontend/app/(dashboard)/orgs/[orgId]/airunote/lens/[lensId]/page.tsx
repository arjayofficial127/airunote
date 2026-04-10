/**
 * Lens View Page
 * Phase 5 — Desktop Lenses
 * 
 * Displays documents from a lens (desktop or folder lens)
 * For desktop lenses, documents are fetched via query filter
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useLens, useUpdateLensItems, useDesktopLenses } from '@/hooks/useAirunoteLenses';
import { CanvasLens } from '@/components/airunote/lenses/CanvasLens';
import { BoardLens } from '@/components/airunote/lenses/BoardLens';
import { StudyLensRenderer } from '@/components/airunote/lenses/StudyLensRenderer';
import { LensToolbar } from '@/components/airunote/components/LensToolbar';
import { DocumentList } from '@/components/airunote/components/DocumentList';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { EditSavedViewModal } from '@/components/airunote/components/EditSavedViewModal';
import type { AiruDocumentMetadata } from '@/components/airunote/types';
import type { AiruLens, LensItemInput } from '@/lib/api/airunoteLensesApi';

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
  const { data: lensData, isLoading, error } = useLens(
    orgId || orgIdFromParams,
    lensId || undefined
  );

  // Fetch all desktop/saved lenses for switching
  const { data: desktopLenses = [] } = useDesktopLenses(orgId || orgIdFromParams);

  const lens = lensData?.lens || null;
  const lensItems = lensData?.items || [];

  // Filter to only supported switchable desktop/saved lenses
  const availableLenses = desktopLenses.filter(
    (l) => (l.type === 'canvas' || l.type === 'board' || l.type === 'study') && l.folderId === null
  );

  // Hook for updating lens items
  const updateLensItems = useUpdateLensItems(orgId || orgIdFromParams, lensId || undefined);

  // Transform documents to items format for CanvasLens/BoardLens
  // Note: Desktop/saved lenses currently don't return documents in lensData
  // This is a placeholder for when documents are added to the lens response
  const items = useMemo(() => {
    // For now, return empty array - documents will come from lens query results
    // TODO: When lens query returns documents, transform them here
    return [];
  }, []);

  // Handle persist for lens items
  const handlePersist = useCallback(
    async (items: LensItemInput[]) => {
      if (!updateLensItems.mutateAsync) return;
      await updateLensItems.mutateAsync({ items });
    },
    [updateLensItems]
  );

  // For fallback DocumentList, we still need documentMetadata
  // This will be populated when lens query returns documents
  const documentMetadata: AiruDocumentMetadata[] = [];
  const pageShellClassName = 'mx-auto w-full max-w-[1400px] px-6 lg:px-8';

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
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{lens.name}</h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {items.length > 0 ? items.length : documentMetadata.length} {items.length > 0 ? 'item' : 'document'}{items.length !== 1 && documentMetadata.length !== 1 ? 's' : ''}
              {lens.folderId === null && lens.type === 'desktop' && ' (Desktop Lens)'}
              {lens.folderId === null && lens.type === 'saved' && ' (Saved View)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
      </div>

      {/* Documents Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
        {items.length === 0 && documentMetadata.length === 0 ? (
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
          // Unified: Canvas view using CanvasLens (same as folder pages)
          <div className="h-screen overflow-hidden relative">
            <div className={`${pageShellClassName} pb-0 pt-8`}>
              <LensToolbar
                viewMode="lens"
                selectedLensId={lensId}
                currentLens={lens}
                lenses={availableLenses}
                folderId={null}
                orgId={orgId}
                placement="inline"
                onViewChange={(view, newLensId) => {
                  if (view === 'grid' || view === 'tree') {
                    router.push(`/orgs/${orgIdFromParams}/airunote`);
                  } else if (newLensId) {
                    router.push(`/orgs/${orgIdFromParams}/airunote/lens/${newLensId}`);
                  }
                }}
                onCreateLens={() => {
                  router.push(`/orgs/${orgIdFromParams}/airunote`);
                }}
              />
            </div>
            <CanvasLens
              orgId={orgId}
              lens={lens}
              items={items}
              lensItems={lensItems}
              onPersist={handlePersist}
            />
          </div>
        ) : lens.type === 'board' && lens.id ? (
          // Unified: Board view using BoardLens (same as folder pages)
          <div className="h-screen overflow-hidden relative">
            <div className={`${pageShellClassName} pb-0 pt-8`}>
              <LensToolbar
                viewMode="lens"
                selectedLensId={lensId}
                currentLens={lens}
                lenses={availableLenses}
                folderId={null}
                orgId={orgId}
                placement="inline"
                onViewChange={(view, newLensId) => {
                  if (view === 'grid' || view === 'tree') {
                    router.push(`/orgs/${orgIdFromParams}/airunote`);
                  } else if (newLensId) {
                    router.push(`/orgs/${orgIdFromParams}/airunote/lens/${newLensId}`);
                  }
                }}
                onCreateLens={() => {
                  router.push(`/orgs/${orgIdFromParams}/airunote`);
                }}
              />
            </div>
            <div className={`${pageShellClassName} pt-6`}>
              <BoardLens
                orgId={orgId}
                lens={lens}
                items={items}
                lensItems={lensItems}
                onPersist={handlePersist}
              />
            </div>
          </div>
        ) : lens.type === 'study' && lens.folderId ? (
          <div className="min-h-screen bg-gray-50">
            <div className={`${pageShellClassName} pb-0 pt-8`}>
              <LensToolbar
                viewMode="lens"
                selectedLensId={lensId}
                currentLens={lens}
                lenses={availableLenses}
                folderId={lens.folderId}
                orgId={orgId}
                placement="inline"
                onViewChange={(view, newLensId) => {
                  if (view === 'grid' || view === 'tree') {
                    router.push(`/orgs/${orgIdFromParams}/airunote/folder/${lens.folderId}`);
                  } else if (newLensId) {
                    router.push(`/orgs/${orgIdFromParams}/airunote/lens/${newLensId}`);
                  }
                }}
                onCreateLens={() => {
                  router.push(`/orgs/${orgIdFromParams}/airunote/folder/${lens.folderId}`);
                }}
                showSearchRow={false}
              />
            </div>
            <StudyLensRenderer folderId={lens.folderId} />
          </div>
        ) : (
          // Fallback: DocumentList for box/book types
          <div className="min-h-screen bg-gray-50">
            <div className={`${pageShellClassName} pb-0 pt-8`}>
              <LensToolbar
                viewMode="lens"
                selectedLensId={lensId}
                currentLens={lens}
                lenses={availableLenses}
                folderId={lens.folderId}
                orgId={orgId}
                placement="inline"
                onViewChange={(view, newLensId) => {
                  if (view === 'grid' || view === 'tree') {
                    router.push(lens.folderId ? `/orgs/${orgIdFromParams}/airunote/folder/${lens.folderId}` : `/orgs/${orgIdFromParams}/airunote`);
                  } else if (newLensId) {
                    router.push(`/orgs/${orgIdFromParams}/airunote/lens/${newLensId}`);
                  }
                }}
                onCreateLens={() => {
                  router.push(lens.folderId ? `/orgs/${orgIdFromParams}/airunote/folder/${lens.folderId}` : `/orgs/${orgIdFromParams}/airunote`);
                }}
              />
            </div>
            <div className={`${pageShellClassName} pt-6`}>
              <DocumentList 
                documents={documentMetadata} 
                orgId={orgId}
              />
            </div>
          </div>
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
