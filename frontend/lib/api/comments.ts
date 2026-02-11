import apiClient from './client';

export interface Comment {
  id: string;
  postId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author?: { id: string; name: string } | null;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
}

export const commentsApi = {
  list: async (orgId: string, postId: string): Promise<CommentsResponse> => {
    const response = await apiClient.get(`/orgs/${orgId}/posts/${postId}/comments`);
    return response.data;
  },

  create: async (
    orgId: string,
    postId: string,
    data: { body: string }
  ): Promise<{ success: boolean; data: Comment }> => {
    const response = await apiClient.post(`/orgs/${orgId}/posts/${postId}/comments`, data);
    return response.data;
  },

  update: async (
    orgId: string,
    postId: string,
    commentId: string,
    data: { body: string }
  ): Promise<{ success: boolean; data: Comment }> => {
    const response = await apiClient.patch(
      `/orgs/${orgId}/posts/${postId}/comments/${commentId}`,
      data
    );
    return response.data;
  },

  delete: async (orgId: string, postId: string, commentId: string): Promise<void> => {
    await apiClient.delete(`/orgs/${orgId}/posts/${postId}/comments/${commentId}`);
  },
};

