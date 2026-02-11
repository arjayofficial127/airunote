'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { recordsApi, type CollectionRecord } from '@/lib/api/records';
import type { Collection } from '@/lib/api/collections';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';
import { collectionsApi } from '@/lib/api/collections';

export default function RecordsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const slug = params.slug as string;
  const metadataIndex = useMetadataIndex();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    loadCollection();
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, slug, page]);

  const loadCollection = async () => {
    try {
      // ✅ Use collections metadata from metadata index (no direct API call for list)
      const collectionsMetadata = metadataIndex.index.collections;
      const found = collectionsMetadata.find((c) => c.slug === slug);
      
      if (found) {
        // Note: Collections are not yet in HydratedContentProvider, so we still need to call getById for full details with fields
        // This is acceptable until collections are added to HydratedContentProvider
        const detailRes = await collectionsApi.getById(orgId, found.id);
        setCollection(detailRes.data);
      } else {
        setCollection(null);
      }
    } catch (error: any) {
      console.error('Failed to load collection:', error);
      toast('Failed to load collection', 'error');
    }
  };

  const loadRecords = async () => {
    try {
      const res = await recordsApi.list(orgId, slug, page, pageSize);
      setRecords(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (error: any) {
      console.error('Failed to load records:', error);
      toast('Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await recordsApi.delete(orgId, slug, recordId);
      toast('Record deleted successfully', 'success');
      loadRecords();
    } catch (error: any) {
      console.error('Failed to delete record:', error);
      toast('Failed to delete record', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading records...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="p-8">
        <div className="text-red-600">Collection not found</div>
      </div>
    );
  }

  const fields = collection.fields || [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/orgs/${orgId}/collections`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Collections
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
            <p className="text-sm text-gray-500">{total} records</p>
          </div>
          <Link
            href={`/orgs/${orgId}/records/${slug}/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Add Record
          </Link>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No records yet.</p>
          <Link
            href={`/orgs/${orgId}/records/${slug}/new`}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first record
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {fields.map((field) => (
                    <th
                      key={field.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id}>
                    {fields.map((field) => (
                      <td key={field.id} className="px-4 py-3 text-sm text-gray-900">
                        {field.type === 'boolean' ? (
                          record.data[field.key] ? 'Yes' : 'No'
                        ) : Array.isArray(record.data[field.key]) ? (
                          record.data[field.key].join(', ')
                        ) : (
                          String(record.data[field.key] || '-')
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/orgs/${orgId}/records/${slug}/${record.id}/edit`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

