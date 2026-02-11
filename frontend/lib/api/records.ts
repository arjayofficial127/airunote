import apiClient from './client';

export interface CollectionRecord {
  id: string;
  collectionId: string;
  orgId: string;
  data: Record<string, any>;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecordInput {
  data: Record<string, any>;
}

export interface UpdateRecordInput {
  data: Record<string, any>;
}

export interface RecordsListResponse {
  success: boolean;
  data: CollectionRecord[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export interface RecordFilters {
  ownerUserId?: string;
  kind?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const recordsApi = {
  list: async (
    orgId: string,
    collectionSlug: string,
    page: number = 1,
    pageSize: number = 50,
    filters?: RecordFilters
  ): Promise<RecordsListResponse> => {
    const params: Record<string, any> = { page, pageSize };
    if (filters) {
      if (filters.ownerUserId) params.ownerUserId = filters.ownerUserId;
      if (filters.kind) params.kind = filters.kind;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
    }
    const response = await apiClient.get(`/orgs/${orgId}/collections/${collectionSlug}/records`, {
      params,
    });
    return response.data;
  },

  getById: async (
    orgId: string,
    collectionSlug: string,
    recordId: string
  ): Promise<{ success: boolean; data: CollectionRecord }> => {
    const response = await apiClient.get(`/orgs/${orgId}/collections/${collectionSlug}/records/${recordId}`);
    return response.data;
  },

  create: async (
    orgId: string,
    collectionSlug: string,
    input: CreateRecordInput
  ): Promise<{ success: boolean; data: CollectionRecord }> => {
    const response = await apiClient.post(`/orgs/${orgId}/collections/${collectionSlug}/records`, input);
    return response.data;
  },

  update: async (
    orgId: string,
    collectionSlug: string,
    recordId: string,
    input: UpdateRecordInput
  ): Promise<{ success: boolean; data: CollectionRecord }> => {
    const response = await apiClient.patch(`/orgs/${orgId}/collections/${collectionSlug}/records/${recordId}`, input);
    return response.data;
  },

  delete: async (orgId: string, collectionSlug: string, recordId: string): Promise<void> => {
    await apiClient.delete(`/orgs/${orgId}/collections/${collectionSlug}/records/${recordId}`);
  },
};

