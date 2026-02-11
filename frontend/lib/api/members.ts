import apiClient from './client';

export interface Member {
  id: string;
  name: string;
  email: string;
  roles: string[];
  joinedAt: string;
}

export interface MembersResponse {
  success: boolean;
  data: Member[];
}

export const membersApi = {
  list: async (orgId: string): Promise<MembersResponse> => {
    const response = await apiClient.get(`/orgs/${orgId}/members`);
    return response.data;
  },
};

