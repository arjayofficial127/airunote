'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { postsApi } from '@/lib/api/posts';
import RichTextEditor from '@/components/posts/RichTextEditor';

const UpdatePostSchema = z.object({
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

type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const postId = params.postId as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<UpdatePostInput>({
    resolver: zodResolver(UpdatePostSchema),
    defaultValues: {
      body: '',
    },
  });

  useEffect(() => {
    postsApi
      .getById(orgId, postId)
      .then((res) => {
        reset({
          title: res.data.title,
          body: res.data.body,
          isPublished: res.data.isPublished,
        });
      })
      .catch((err) => {
        console.error('Failed to load post:', err);
        setError('Failed to load post');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orgId, postId, reset]);

  const onSubmit = async (data: UpdatePostInput) => {
    setSubmitting(true);
    setError(null);

    try {
      await postsApi.update(orgId, postId, data);
      router.push(`/orgs/${orgId}/posts/${postId}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading post...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Post</h1>

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
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Post'}
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

