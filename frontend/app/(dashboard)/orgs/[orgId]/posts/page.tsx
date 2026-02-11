'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
// ❌ Do not fetch auth/org/apps here
// ✅ Must consume from session provider
import { useOrgSession } from '@/providers/OrgSessionProvider';
// ❌ Do not fetch posts here
// ✅ Must consume from metadata index
import { useMetadataIndex, type PostMetadata } from '@/providers/MetadataIndexProvider';
import { postsApi } from '@/lib/api/posts';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function PostsPage() {
  const router = useRouter();
  // ❌ Do not use params.orgId directly
  // ✅ activeOrgId is SINGLE SOURCE OF TRUTH
  const orgSession = useOrgSession();
  const metadataIndex = useMetadataIndex();
  
  const orgId = orgSession.activeOrgId;
  
  // Dev-only guardrail: warn if orgId is missing
  if (process.env.NODE_ENV === 'development' && !orgId) {
    console.warn('[PostsPage] activeOrgId is null - page should not render without active org');
  }

  // ✅ Use posts from metadata index (no direct API call)
  const posts = metadataIndex.index.posts;
  const loading = metadataIndex.status === 'loading';
  
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Get current user from auth context (no direct API call)
  const { user: currentUser } = useAuth();

  const handleDelete = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    // This ensures session authority and routing lock are respected
    if (!orgId) {
      return;
    }

    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setDeletingPostId(postId);
    try {
      await postsApi.delete(orgId, postId);
      // ✅ Refetch metadata index after deletion
      await metadataIndex.refreshKey('posts');
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete post. Please try again.');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleTogglePublish = async (post: PostMetadata, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    // This ensures session authority and routing lock are respected
    if (!orgId) {
      return;
    }

    try {
      await postsApi.update(orgId, post.id, { isPublished: !post.isPublished });
      // ✅ Refetch metadata index after update
      await metadataIndex.refreshKey('posts');
    } catch (err) {
      console.error('Failed to update post:', err);
      alert('Failed to update post. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
        <Link
          href={`/orgs/${orgId}/posts/create`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No posts yet.</p>
          <Link
            href={`/orgs/${orgId}/posts/create`}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const isAuthor = currentUser && post.authorUserId === currentUser.id;

            return (
              <div
                key={post.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6 flex flex-col"
              >
                <Link
                  href={`/orgs/${orgId}/posts/${post.id}`}
                  className="flex-1"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 flex-1">{post.title}</h3>
                    {!post.isPublished && (
                      <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4 italic">
                    Preview not available (metadata only)
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Author
                    </span>
                    <span>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>

                {isAuthor && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                    <Link
                      href={`/orgs/${orgId}/posts/${post.id}/edit`}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={(e) => handleTogglePublish(post, e)}
                      className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      {post.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={(e) => handleDelete(post.id, e)}
                      disabled={deletingPostId === post.id}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
                    >
                      {deletingPostId === post.id ? '...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

