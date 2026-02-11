import apiClient from './client';

export interface Org {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  roles?: string[];
  // Join code fields
  joinCode?: string | null;
  joinCodeMaxUses?: number | null;
  joinCodeUsedCount?: number;
  joinCodeAllowedDomains?: string[] | null;
  joinCodeIsActive?: boolean;
  joinCodeExpiresAt?: string | null;
  joinCodeDefaultRoleId?: number | null;
}

export interface OrgsResponse {
  success: boolean;
  data: Org[];
}

export interface CreateOrgInput {
  name: string;
  slug?: string;
  description?: string;
  systemTypeCode?: string;
}

export const orgsApi = {
  create: async (input: CreateOrgInput): Promise<{ success: boolean; data: Org }> => {
    const response = await apiClient.post('/orgs', input);
    return response.data;
  },

  list: async (): Promise<OrgsResponse> => {
    // Dev-only guardrail: warn if called outside OrgSessionProvider
    if (process.env.NODE_ENV === 'development') {
      const stack = new Error().stack;
      const isFromProvider = stack?.includes('OrgSessionProvider');
      if (!isFromProvider) {
        console.warn(
          '[orgsApi.list] Called outside OrgSessionProvider. ' +
          'Use useOrgSession() instead to avoid duplicate fetches.'
        );
      }
    }
    const response = await apiClient.get('/orgs');
    return response.data;
  },

  getById: async (orgId: string): Promise<{ success: boolean; data: Org }> => {
    const response = await apiClient.get(`/orgs/${orgId}`);
    return response.data;
  },

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

  generateJoinCode: async (orgId: string): Promise<{ success: boolean; data: Org }> => {
    const response = await apiClient.post(`/orgs/${orgId}/join-code/generate`);
    return response.data;
  },

  updateJoinCodeSettings: async (
    orgId: string,
    settings: {
      isActive?: boolean;
      maxUses?: number | null;
      allowedDomains?: string[] | null;
      expiresAt?: string | null;
      defaultRoleId?: number | null;
    }
  ): Promise<{ success: boolean; data: Org }> => {
    const response = await apiClient.patch(`/orgs/${orgId}/join-code/settings`, settings);
    return response.data;
  },

  joinWithCode: async (joinCode: string): Promise<{ success: boolean; data: Org }> => {
    const response = await apiClient.post('/orgs/join', { code: joinCode });
    return response.data;
  },
};

