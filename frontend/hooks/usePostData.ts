import { useState, useEffect, useCallback } from 'react';
import { postsApi, type Post } from '@/lib/api/posts';
import { commentsApi, type Comment } from '@/lib/api/comments';
import { likesApi } from '@/lib/api/likes';
import { attachmentsApi, type Attachment } from '@/lib/api/attachments';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/lib/api/auth';
// ❌ Do not fetch full post content here
// ✅ Must consume from hydrated content provider
import { useHydratedContent } from '@/providers/HydratedContentProvider';

export interface UsePostDataReturn {
  post: Post | null;
  comments: Comment[];
  attachments: Attachment[];
  likeCount: number;
  hasLiked: boolean;
  currentUser: User | null;
  loading: boolean;
  refreshPost: () => Promise<void>;
  refreshComments: () => Promise<void>;
  refreshAttachments: () => Promise<void>;
  refreshLikes: () => Promise<void>;
}

/**
 * Hook for managing post detail page data
 * Consolidates 12 useState declarations into a single, organized hook
 */
export function usePostData(orgId: string, postId: string): UsePostDataReturn {
  const hydratedContent = useHydratedContent();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get current user from auth context (no direct API call)
  const { user: currentUser } = useAuth();

  const loadData = useCallback(async () => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      // intent-driven: hydrate post via provider
      await hydratedContent.hydrate('post', postId);
      
      // Get hydrated post from provider
      const hydratedPost = hydratedContent.getHydrated<Post>('post', postId);
      
      // Load related data (comments, attachments, likes) - these are not in hydration provider
      const [commentsRes, attachmentsRes, countRes, likedRes] = await Promise.all([
        commentsApi.list(orgId, postId),
        attachmentsApi.list(orgId, postId),
        likesApi.getCount(orgId, postId),
        likesApi.hasLiked(orgId, postId),
      ]);

      if (hydratedPost) {
        // Use rich response if available
        if (hydratedPost.author || hydratedPost.attachments || hydratedPost.comments) {
          setPost(hydratedPost);
          setAttachments(hydratedPost.attachments || attachmentsRes.data);
          setComments(hydratedPost.comments || commentsRes.data);
          setLikeCount(hydratedPost.likeCount || countRes.data.count);
          setHasLiked(hydratedPost.userLiked ?? likedRes.data.liked);
        } else {
          setPost(hydratedPost);
          setComments(commentsRes.data);
          setAttachments(attachmentsRes.data);
          setLikeCount(countRes.data.count);
          setHasLiked(likedRes.data.liked);
        }
      } else {
        // Fallback: if hydration failed, log error but don't use direct API call
        console.error('[usePostData] Failed to hydrate post, post data is null');
        setPost(null);
        setComments(commentsRes.data);
        setAttachments(attachmentsRes.data);
        setLikeCount(countRes.data.count);
        setHasLiked(likedRes.data.liked);
      }
    } catch (err) {
      console.error('Failed to load post data:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, postId, hydratedContent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshPost = useCallback(async () => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) {
      return;
    }

    try {
      // intent-driven: re-hydrate via provider (clears cache and fetches fresh)
      hydratedContent.clearEntity('post', postId);
      await hydratedContent.hydrate('post', postId);
      
      const hydratedPost = hydratedContent.getHydrated<Post>('post', postId);
      if (hydratedPost) {
        setPost(hydratedPost);
      }
    } catch (err) {
      console.error('Failed to refresh post:', err);
    }
  }, [orgId, postId, hydratedContent]);

  const refreshComments = useCallback(async () => {
    try {
      const commentsRes = await commentsApi.list(orgId, postId);
      setComments(commentsRes.data);
    } catch (err) {
      console.error('Failed to refresh comments:', err);
    }
  }, [orgId, postId]);

  const refreshAttachments = useCallback(async () => {
    try {
      const attachmentsRes = await attachmentsApi.list(orgId, postId);
      setAttachments(attachmentsRes.data);
    } catch (err) {
      console.error('Failed to refresh attachments:', err);
    }
  }, [orgId, postId]);

  const refreshLikes = useCallback(async () => {
    try {
      const [countRes, likedRes] = await Promise.all([
        likesApi.getCount(orgId, postId),
        likesApi.hasLiked(orgId, postId),
      ]);
      setLikeCount(countRes.data.count);
      setHasLiked(likedRes.data.liked);
    } catch (err) {
      console.error('Failed to refresh likes:', err);
    }
  }, [orgId, postId]);

  return {
    post,
    comments,
    attachments,
    likeCount,
    hasLiked,
    currentUser: currentUser ?? null,
    loading,
    refreshPost,
    refreshComments,
    refreshAttachments,
    refreshLikes,
  };
}

