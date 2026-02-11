'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { postsApi } from '@/lib/api/posts';
import RichTextEditor from '@/components/posts/RichTextEditor';
// TODO: Re-enable file uploads when UploadThing is fixed
// import { attachmentsApi, type CreateAttachmentInput } from '@/lib/api/attachments';
// import PostAttachmentsUploader from '@/components/posts/PostAttachmentsUploader';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).refine(
    (val) => {
      // Strip HTML tags for validation - check if there's actual text content
      const textContent = val.replace(/<[^>]*>/g, '').trim();
      return textContent.length > 0;
    },
    { message: 'Body cannot be empty' }
  ),
  isPublished: z.boolean().default(true),
});

type CreatePostInput = z.infer<typeof CreatePostSchema>;

export default function CreatePostPage() {
  const router = useRouter();
  const orgSession = useOrgSession();
  const orgId = orgSession.activeOrgId;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // TODO: Re-enable when file uploads are fixed
  // const [uploadedAttachments, setUploadedAttachments] = useState<CreateAttachmentInput[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(CreatePostSchema),
    defaultValues: {
      isPublished: true,
      body: '',
    },
  });

  const onSubmit = async (data: CreatePostInput) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) {
      setError('No active organization');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Create post first
      const postResponse = await postsApi.create(orgId, data);
      // const postId = postResponse.data.id;

      // TODO: Re-enable when file uploads are fixed
      // Then create attachments if any were uploaded
      // if (uploadedAttachments.length > 0) {
      //   try {
      //     await attachmentsApi.create(orgId, postId, uploadedAttachments);
      //   } catch (attachErr: any) {
      //     console.error('Failed to create attachments:', attachErr);
      //     // Continue even if attachments fail - post is already created
      //   }
      // }

      router.push(`/orgs/${orgId}/posts`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Post</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              {...register('title')}
              type="text"
              id="title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
              Body
            </label>
            <RichTextEditor
              name="body"
              control={control}
              placeholder="Write your post content here..."
              error={errors.body?.message}
            />
          </div>

          {/* TODO: Re-enable file uploads when UploadThing is fixed */}
          {/* <PostAttachmentsUploader
            orgId={orgId}
            onUploadComplete={setUploadedAttachments}
          /> */}

          <div className="flex items-center">
            <input
              {...register('isPublished')}
              type="checkbox"
              id="isPublished"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-700">
              Publish immediately
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

