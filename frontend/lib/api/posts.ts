import apiClient from './client';

export interface Post {
  id: string;
  orgId: string;
  authorUserId: string;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; email: string } | null;
  attachments?: any[];
  comments?: any[];
  likeCount?: number;
  userLiked?: boolean;
}

export interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination?: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export interface PostResponse {
  success: boolean;
  data: Post;
}

// Dev-only guardrail: module-level flag set by MetadataIndexProvider
let isMetadataIndexLoading = false;
export function setMetadataIndexLoadingFlag(value: boolean) {
  if (process.env.NODE_ENV !== 'production') {
    isMetadataIndexLoading = value;
  }
}

export const postsApi = {
  list: async (orgId: string, limit = 50, offset = 0): Promise<PostsResponse> => {
    // Dev-only guardrail: warn if called outside MetadataIndexProvider
    if (process.env.NODE_ENV !== 'production' && !isMetadataIndexLoading) {
      const stack = new Error().stack;
      const isFromProvider = stack?.includes('MetadataIndexProvider');
      if (!isFromProvider) {
        console.warn(
          '[postsApi.list] Called outside MetadataIndexProvider. ' +
          'Use useMetadataIndex() instead to avoid duplicate fetches.'
        );
      }
    }
    const response = await apiClient.get(`/orgs/${orgId}/posts`, {
      params: { limit, offset },
    });
    return response.data;
  },

  getById: async (orgId: string, postId: string): Promise<PostResponse> => {
    // Dev-only guardrail: warn if called outside HydratedContentProvider
    if (process.env.NODE_ENV !== 'production') {
      const stack = new Error().stack;
      const isFromProvider = stack?.includes('HydratedContentProvider');
      if (!isFromProvider) {
        console.warn(
          '[postsApi.getById] Called outside HydratedContentProvider. ' +
          'Use useHydratedContent().hydrate("post", id) for intent-driven hydration.'
        );
      }
    }
    const response = await apiClient.get(`/orgs/${orgId}/posts/${postId}`);
    return response.data;
  },

  create: async (
    orgId: string,
    data: { title: string; body: string; isPublished?: boolean }
  ): Promise<PostResponse> => {
    const response = await apiClient.post(`/orgs/${orgId}/posts`, data);
    return response.data;
  },

  update: async (
    orgId: string,
    postId: string,
    data: { title?: string; body?: string; isPublished?: boolean }
  ): Promise<PostResponse> => {
    const response = await apiClient.patch(`/orgs/${orgId}/posts/${postId}`, data);
    return response.data;
  },

  delete: async (orgId: string, postId: string): Promise<void> => {
    await apiClient.delete(`/orgs/${orgId}/posts/${postId}`);
  },
};

