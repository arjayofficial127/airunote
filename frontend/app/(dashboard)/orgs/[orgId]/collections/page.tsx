'use client';

import { useRouter } from 'next/navigation';
// ❌ Do not fetch collections here
// ✅ Must consume from metadata index
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useMetadataIndex, type CollectionMetadata } from '@/providers/MetadataIndexProvider';
import { collectionsApi } from '@/lib/api/collections';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';

export default function CollectionsPage() {
  const router = useRouter();
  // ❌ Do not use params.orgId directly
  // ✅ activeOrgId is SINGLE SOURCE OF TRUTH
  const orgSession = useOrgSession();
  const metadataIndex = useMetadataIndex();
  
  const orgId = orgSession.activeOrgId;
  
  // Dev-only guardrail: warn if orgId is missing
  if (process.env.NODE_ENV === 'development' && !orgId) {
    console.warn('[CollectionsPage] activeOrgId is null - page should not render without active org');
  }

  // ✅ Use collections from metadata index (no direct API call)
  const collections = metadataIndex.index.collections;
  const loading = metadataIndex.status === 'loading';
  
  // Check admin permissions
  const { isAdmin } = useOrgPermissions(orgId || '');

  const handleDelete = async (collectionId: string, collectionName: string) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    // This ensures session authority and routing lock are respected
    if (!orgId) {
      return;
    }

    if (!confirm(`Are you sure you want to delete "${collectionName}"? This will also delete all records in this collection.`)) {
      return;
    }

    try {
      await collectionsApi.delete(orgId, collectionId);
      toast('Collection deleted successfully', 'success');
      // ✅ Refetch metadata index after deletion
      await metadataIndex.refreshKey('collections');
    } catch (error: any) {
      console.error('Failed to delete collection:', error);
      toast('Failed to delete collection', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
        {isAdmin && (
          <Link
            href={`/orgs/${orgId}/collections/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Create Collection
          </Link>
        )}
      </div>

      {collections.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No collections yet.</p>
          {isAdmin && (
            <Link
              href={`/orgs/${orgId}/collections/new`}
              className="text-blue-600 hover:text-blue-700"
            >
              Create your first collection
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div key={collection.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{collection.name}</h3>
                  <p className="text-sm text-gray-500">/{collection.slug}</p>
                </div>
                {collection.icon && (
                  <span className="text-2xl">{collection.icon}</span>
                )}
              </div>
              {collection.description && (
                <p className="text-sm text-gray-600 mb-4">{collection.description}</p>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 text-xs rounded ${
                  collection.visibility === 'public' ? 'bg-green-100 text-green-800' :
                  collection.visibility === 'org' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {collection.visibility}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/orgs/${orgId}/records/${collection.slug}`}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-center"
                >
                  View Records
                </Link>
                <Link
                  href={`/orgs/${orgId}/collections/${collection.id}`}
                  className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-center"
                >
                  Manage
                </Link>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(collection.id, collection.name)}
                    className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

