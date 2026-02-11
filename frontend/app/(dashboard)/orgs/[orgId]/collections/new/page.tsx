'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { collectionsApi } from '@/lib/api/collections';
import { toast } from '@/lib/toast';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
import UnauthorizedError from '@/components/errors/UnauthorizedError';

const CreateCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  visibility: z.enum(['private', 'org', 'public']).default('private'),
});

type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;

export default function NewCollectionPage() {
  const router = useRouter();
  const orgSession = useOrgSession();
  const orgId = orgSession.activeOrgId;
  
  // Check admin permissions
  const { isAdmin, loading: permissionsLoading } = useOrgPermissions(orgId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCollectionInput>({
    resolver: zodResolver(CreateCollectionSchema),
    defaultValues: {
      visibility: 'private',
    },
  });

  const onSubmit = async (data: CreateCollectionInput) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) {
      toast('No active organization', 'error');
      return;
    }
    try {
      const res = await collectionsApi.create(orgId, data);
      toast('Collection created successfully', 'success');
      router.push(`/orgs/${orgId}/collections/${res.data.id}`);
    } catch (error: any) {
      console.error('Failed to create collection:', error);
      toast(error.response?.data?.error?.message || 'Failed to create collection', 'error');
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

  if (!isAdmin) {
    return (
      <UnauthorizedError 
        statusCode={403} 
        message="You do not have permission to create collections. Admin role is required." 
      />
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Collection</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              {...register('slug')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., clients, invoices"
            />
            {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon (emoji)
              </label>
              <input
                {...register('icon')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="👤"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                {...register('color')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              {...register('visibility')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="private">Private</option>
              <option value="org">Organization</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Collection'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

