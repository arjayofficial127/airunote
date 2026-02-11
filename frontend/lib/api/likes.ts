import apiClient from './client';

export const likesApi = {
  toggle: async (
    orgId: string,
    postId: string
  ): Promise<{ success: boolean; data: { liked: boolean } }> => {
    const response = await apiClient.post(`/orgs/${orgId}/posts/${postId}/likes/toggle`);
    return response.data;
  },

  getCount: async (
    orgId: string,
    postId: string
  ): Promise<{ success: boolean; data: { count: number } }> => {
    const response = await apiClient.get(`/orgs/${orgId}/posts/${postId}/likes/count`);
    return response.data;
  },

  hasLiked: async (
    orgId: string,
    postId: string
  ): Promise<{ success: boolean; data: { liked: boolean } }> => {
    const response = await apiClient.get(`/orgs/${orgId}/posts/${postId}/likes/me`);
    return response.data;
  },
};

