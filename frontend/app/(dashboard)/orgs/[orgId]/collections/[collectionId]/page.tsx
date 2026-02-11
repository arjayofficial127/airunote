'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collectionsApi, type Collection, type CollectionField } from '@/lib/api/collections';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
import UnauthorizedError from '@/components/errors/UnauthorizedError';

const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  visibility: z.enum(['private', 'org', 'public']).optional(),
});

const CreateFieldSchema = z.object({
  key: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
  type: z.enum(['text', 'number', 'boolean', 'date', 'select', 'multi_select']),
  isRequired: z.boolean().default(false),
  order: z.number().int().default(0),
});

type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;
type CreateFieldInput = z.infer<typeof CreateFieldSchema>;

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const collectionId = params.collectionId as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFieldForm, setShowFieldForm] = useState(false);
  
  // Check admin permissions
  const { isAdmin, loading: permissionsLoading } = useOrgPermissions(orgId);

  const {
    register: registerCollection,
    handleSubmit: handleSubmitCollection,
    formState: { errors: collectionErrors, isSubmitting: isUpdatingCollection },
    reset: resetCollection,
  } = useForm<UpdateCollectionInput>({
    resolver: zodResolver(UpdateCollectionSchema),
  });

  const {
    register: registerField,
    handleSubmit: handleSubmitField,
    formState: { errors: fieldErrors, isSubmitting: isCreatingField },
    reset: resetField,
  } = useForm<CreateFieldInput>({
    resolver: zodResolver(CreateFieldSchema),
    defaultValues: {
      isRequired: false,
      order: 0,
    },
  });

  useEffect(() => {
    loadCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, collectionId]);

  const loadCollection = async () => {
    try {
      const res = await collectionsApi.getById(orgId, collectionId);
      setCollection(res.data);
      resetCollection({
        name: res.data.name,
        slug: res.data.slug,
        description: res.data.description || undefined,
        icon: res.data.icon || undefined,
        color: res.data.color || undefined,
        visibility: res.data.visibility,
      });
    } catch (error: any) {
      console.error('Failed to load collection:', error);
      toast('Failed to load collection', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onUpdateCollection = async (data: UpdateCollectionInput) => {
    try {
      const res = await collectionsApi.update(orgId, collectionId, data);
      setCollection(res.data);
      toast('Collection updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to update collection:', error);
      toast(error.response?.data?.error?.message || 'Failed to update collection', 'error');
    }
  };

  const onCreateField = async (data: CreateFieldInput) => {
    try {
      await collectionsApi.createField(orgId, collectionId, data);
      toast('Field created successfully', 'success');
      resetField();
      setShowFieldForm(false);
      loadCollection();
    } catch (error: any) {
      console.error('Failed to create field:', error);
      toast(error.response?.data?.error?.message || 'Failed to create field', 'error');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) {
      return;
    }

    try {
      await collectionsApi.deleteField(orgId, collectionId, fieldId);
      toast('Field deleted successfully', 'success');
      loadCollection();
    } catch (error: any) {
      console.error('Failed to delete field:', error);
      toast('Failed to delete field', 'error');
    }
  };

  // Check permissions
  if (permissionsLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Checking permissions...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading...</div>
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/orgs/${orgId}/collections`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Collections
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
        <p className="text-sm text-gray-500">Table Code: {collection.tableCode}</p>
      </div>

      <div className="space-y-6">
        {/* Collection Details Form - Admin only */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Collection Details</h2>
            <form onSubmit={handleSubmitCollection(onUpdateCollection)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  {...registerCollection('name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  {...registerCollection('slug')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...registerCollection('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
              <button
                type="submit"
                disabled={isUpdatingCollection}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                {isUpdatingCollection ? 'Updating...' : 'Update Collection'}
              </button>
            </form>
          </div>
        )}

        {/* Fields Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Fields</h2>
            {isAdmin && (
              <button
                onClick={() => setShowFieldForm(!showFieldForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                {showFieldForm ? 'Cancel' : 'Add Field'}
              </button>
            )}
          </div>

          {showFieldForm && isAdmin && (
            <form onSubmit={handleSubmitField(onCreateField)} className="mb-6 p-4 bg-gray-50 rounded space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
                  <input
                    {...registerField('key')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., firstName"
                  />
                  {fieldErrors.key && <p className="mt-1 text-sm text-red-600">{fieldErrors.key.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                  <input
                    {...registerField('label')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., First Name"
                  />
                  {fieldErrors.label && <p className="mt-1 text-sm text-red-600">{fieldErrors.label.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    {...registerField('type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="select">Select</option>
                    <option value="multi_select">Multi-Select</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <input
                    {...registerField('order', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    {...registerField('isRequired')}
                    type="checkbox"
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={isCreatingField}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                {isCreatingField ? 'Creating...' : 'Create Field'}
              </button>
            </form>
          )}

          {collection.fields && collection.fields.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {collection.fields.map((field) => (
                    <tr key={field.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{field.key}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{field.label}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{field.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{field.isRequired ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{field.order}</td>
                      <td className="px-4 py-3 text-sm">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No fields yet. Add your first field above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

