import apiClient from './client';
import type { Org } from './orgs';

export const orgSettingsApi = {
  update: async (
    orgId: string,
    input: {
      name?: string;
      description?: string;
    }
  ): Promise<{ success: boolean; data: Org }> => {
    const response = await apiClient.put(`/orgs/${orgId}`, input);
    return response.data;
  },

  delete: async (orgId: string): Promise<void> => {
    await apiClient.delete(`/orgs/${orgId}`);
  },
};