'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { postsApi } from '@/lib/api/posts';
import { commentsApi } from '@/lib/api/comments';
import { likesApi } from '@/lib/api/likes';
import { attachmentsApi } from '@/lib/api/attachments';
import { CreateCommentSchema, UpdateCommentSchema, type CreateCommentInput, type UpdateCommentInput } from '@/lib/validators/commentSchemas';
import { usePostData } from '@/hooks/usePostData';
import { PostPlaceholder, CommentPlaceholder } from '@/components/ui/Placeholder';
import { EmptyComments } from '@/components/ui/EmptyState';
import Image from 'next/image';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSession = useOrgSession();
  const orgId = orgSession.activeOrgId;
  const postId = params.postId as string;
  
  // Use consolidated hook instead of 12 useState declarations
  // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - pass empty string if null to satisfy hook type
  // Hook handles empty string internally, but we guard after hooks for UI
  const {
    post,
    comments,
    attachments,
    likeCount,
    hasLiked,
    currentUser,
    loading,
    refreshComments,
    refreshAttachments,
    refreshLikes,
  } = usePostData(orgId || '', postId);

  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  // Comment form with validation
  const {
    register: registerComment,
    handleSubmit: handleSubmitComment,
    formState: { errors: commentErrors },
    reset: resetCommentForm,
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(CreateCommentSchema),
  });

  // Edit comment form with validation
  const {
    register: registerEditComment,
    handleSubmit: handleSubmitEditComment,
    formState: { errors: editCommentErrors },
    reset: resetEditCommentForm,
    setValue: setEditCommentValue,
  } = useForm<UpdateCommentInput>({
    resolver: zodResolver(UpdateCommentSchema),
  });

  // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
  if (!orgId) {
    return (
      <div className="p-8">
        <div className="text-red-600">No active organization</div>
      </div>
    );
  }


  const handleToggleLike = async () => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) return;
    try {
      await likesApi.toggle(orgId, postId);
      await refreshLikes();
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const onSubmitComment = async (data: CreateCommentInput) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) return;
    setSubmitting(true);
    try {
      await commentsApi.create(orgId, postId, data);
      resetCommentForm();
      await refreshComments();
    } catch (err) {
      console.error('Failed to create comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitEditComment = async (data: UpdateCommentInput, commentId: string) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) return;
    try {
      await commentsApi.update(orgId, postId, commentId, data);
      setEditingCommentId(null);
      resetEditCommentForm();
      await refreshComments();
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) return;
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await attachmentsApi.delete(orgId, postId, attachmentId);
      await refreshAttachments();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('Failed to delete attachment');
    }
  };

  const handleDeletePost = async () => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) return;
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      await postsApi.delete(orgId, postId);
      router.push(`/orgs/${orgId}/posts`);
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete post');
    }
  };

  const canEditPost = currentUser && post && post.authorUserId === currentUser.id;
  const canDeletePost = canEditPost; // For MVP, only author can delete

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8">
        <div className="text-red-600">Post not found</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <article className="bg-white rounded-lg shadow p-8 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
            {post.author && (
              <p className="text-sm text-gray-600">
                By <span className="font-medium">{post.author.name}</span>
              </p>
            )}
          </div>
          {(canEditPost || canDeletePost) && (
            <div className="flex gap-2">
              {canEditPost && (
                <Link
                  href={`/orgs/${orgId}/posts/${postId}/edit`}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                >
                  Edit
                </Link>
              )}
              {canDeletePost && (
                <button
                  onClick={handleDeletePost}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        <div 
          className="text-gray-600 mb-6 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="mb-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Attachments ({attachments.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="relative group">
                  {attachment.type === 'image' ? (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Image
                        src={attachment.url}
                        alt={attachment.fileName || 'Attachment'}
                        width={400}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition"
                        unoptimized
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-32 bg-gray-100 rounded-lg border border-gray-200 hover:border-blue-300 transition flex items-center justify-center"
                    >
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </a>
                  )}
                  {attachment.fileName && (
                    <p className="mt-1 text-xs text-gray-600 truncate">
                      {attachment.fileName}
                    </p>
                  )}
                  <button
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                    title="Delete attachment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4 border-t pt-4">
          <button
            onClick={handleToggleLike}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
              hasLiked
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>❤️</span>
            <span>{likeCount}</span>
          </button>
          <span className="text-sm text-gray-500">
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
      </article>

      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Comments</h2>

        <form onSubmit={handleSubmitComment(onSubmitComment)} className="mb-6">
          <textarea
            {...registerComment('body')}
            placeholder="Write a comment..."
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 ${
              commentErrors.body ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            rows={3}
          />
          {commentErrors.body && (
            <p className="mt-1 text-sm text-red-600 mb-2">{commentErrors.body.message}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>

        <div className="space-y-4">
          {comments.length === 0 ? (
            <EmptyComments />
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b pb-4 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {comment.author && (
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {comment.author.name}
                      </p>
                    )}
                    {editingCommentId === comment.id ? (
                      <>
                        <textarea
                          {...registerEditComment('body')}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 ${
                            editCommentErrors.body ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                          }`}
                          rows={3}
                        />
                        {editCommentErrors.body && (
                          <p className="mt-1 text-sm text-red-600 mb-2">{editCommentErrors.body.message}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900">{comment.body}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {currentUser && comment.authorUserId === currentUser.id && (
                    <div className="flex gap-2 ml-4">
                      {editingCommentId === comment.id ? (
                        <>
                          <button
                            onClick={() => {
                              handleSubmitEditComment((data) => onSubmitEditComment(data, comment.id))();
                            }}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCommentId(null);
                              resetEditCommentForm();
                            }}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditCommentValue('body', comment.body);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
                              if (!orgId) return;
                              if (confirm('Delete this comment?')) {
                                try {
                                  await commentsApi.delete(orgId, postId, comment.id);
                                  await refreshComments();
                                } catch (err) {
                                  console.error('Failed to delete comment:', err);
                                }
                              }
                            }}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

