'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { recordsApi, type CollectionRecord } from '@/lib/api/records';
import { collectionsApi, type Collection, type CollectionField } from '@/lib/api/collections';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { useHydrateRecord } from '@/hooks/useHydrateRecord';
import { useSessionAppStore } from '@/contexts/SessionAppStoreContext';

export default function EditRecordPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const slug = params.slug as string;
  const recordId = params.recordId as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const { getCachedMetadata } = useSessionAppStore();

  // Intent-based hydration: edit intent triggers full record fetch
  // Checks cache first, only fetches if not hydrated or stale
  const { record, loading, error, isStale, updateAfterSave } = useHydrateRecord(
    orgId,
    slug,
    recordId,
    'edit', // Explicit edit intent
    {
      // Try to find metadata in cache for freshness check
      metadataRecord: (() => {
        // Search metadata caches for this record
        // Note: In a full implementation, you'd know the appCode
        // For now, we'll hydrate without metadata comparison
        return null;
      })(),
      onStaleDetected: (stale) => {
        if (stale) {
          toast('This item was updated elsewhere. Reloading latest version.', 'info');
        }
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Record<string, any>>();

  useEffect(() => {
    loadCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, slug]);

  useEffect(() => {
    if (record) {
      reset(record.data);
    }
  }, [record, reset]);

  const loadCollection = async () => {
    try {
      // Load collection
      const collectionsRes = await collectionsApi.list(orgId);
      const found = collectionsRes.data.find((c) => c.slug === slug);
      if (found) {
        const detailRes = await collectionsApi.getById(orgId, found.id);
        setCollection(detailRes.data);
      }
    } catch (error: any) {
      console.error('Failed to load collection:', error);
      toast('Failed to load collection', 'error');
    }
  };

  const onSubmit = async (data: Record<string, any>) => {
    try {
      // Convert form data to proper types based on field types
      const fields = collection?.fields || [];
      const recordData: Record<string, any> = {};

      for (const field of fields) {
        const value = data[field.key];
        if (value === undefined || value === '') {
          if (field.isRequired) {
            toast(`Field "${field.label}" is required`, 'error');
            return;
          }
          continue;
        }

        switch (field.type) {
          case 'number':
            recordData[field.key] = Number(value);
            break;
          case 'boolean':
            recordData[field.key] = Boolean(value);
            break;
          default:
            recordData[field.key] = value;
        }
      }

      const updateRes = await recordsApi.update(orgId, slug, recordId, { data: recordData });
      
      // Update hydrated record after save (keeps metadata + hydrated state consistent)
      if (updateRes.success && updateRes.data) {
        updateAfterSave(updateRes.data);
      }
      
      toast('Record updated successfully', 'success');
      router.push(`/orgs/${orgId}/records/${slug}`);
    } catch (error: any) {
      console.error('Failed to update record:', error);
      toast(error.response?.data?.error?.message || 'Failed to update record', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-600">Failed to load record: {error.message}</div>
      </div>
    );
  }

  if (!collection || !record) {
    return (
      <div className="p-8">
        <div className="text-red-600">Record not found</div>
      </div>
    );
  }

  // Show minimal stale warning if detected
  const showStaleWarning = isStale;

  const fields = collection.fields || [];

  const renderFieldInput = (field: CollectionField) => {
    const fieldName = field.key;
    const isRequired = field.isRequired;
    const currentValue = record.data[field.key];

    switch (field.type) {
      case 'text':
        return (
          <input
            {...register(fieldName, { required: isRequired })}
            type="text"
            defaultValue={currentValue}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'number':
        return (
          <input
            {...register(fieldName, { required: isRequired, valueAsNumber: true })}
            type="number"
            defaultValue={currentValue}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'boolean':
        return (
          <input
            {...register(fieldName)}
            type="checkbox"
            defaultChecked={currentValue}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );

      case 'date':
        const dateValue = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
        return (
          <input
            {...register(fieldName, { required: isRequired })}
            type="date"
            defaultValue={dateValue}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'select':
        const options = field.config?.options || [];
        return (
          <select
            {...register(fieldName, { required: isRequired })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={currentValue}
          >
            <option value="">Select...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'multi_select':
        const multiOptions = field.config?.options || [];
        const currentValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className="space-y-2">
            {multiOptions.map((opt: string) => (
              <label key={opt} className="flex items-center">
                <input
                  {...register(fieldName)}
                  type="checkbox"
                  value={opt}
                  defaultChecked={currentValues.includes(opt)}
                  className="mr-2"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            {...register(fieldName, { required: isRequired })}
            type="text"
            defaultValue={currentValue}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/orgs/${orgId}/records/${slug}`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Records
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Record: {collection.name}</h1>
        {showStaleWarning && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            This item was updated elsewhere. Reloading latest version.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 max-w-2xl space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.isRequired && <span className="text-red-600 ml-1">*</span>}
            </label>
            {renderFieldInput(field)}
            {errors[field.key] && (
              <p className="mt-1 text-sm text-red-600">This field is required</p>
            )}
          </div>
        ))}

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Record'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

