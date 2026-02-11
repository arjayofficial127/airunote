import apiClient from './client';

export interface OrgFile {
  id: string;
  orgId: string;
  ownerUserId: string;
  storageProvider: string;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  visibility: 'private' | 'org' | 'public' | 'users';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUploadTicketRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CreateUploadTicketResponse {
  success: boolean;
  data: {
    uploadPlan: {
      storageKey: string;
      url?: string;
    };
  };
}

export interface CompleteUploadRequest {
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
}

export interface UpdateVisibilityRequest {
  visibility: 'private' | 'org' | 'public' | 'users';
  userIds?: string[];
}

export interface ListFilesFilters {
  visibility?: 'private' | 'org' | 'public' | 'users';
  search?: string;
}

// Dev-only guardrail: module-level flag set by MetadataIndexProvider
let isMetadataIndexLoading = false;
export function setMetadataIndexLoadingFlag(value: boolean) {
  if (process.env.NODE_ENV !== 'production') {
    isMetadataIndexLoading = value;
  }
}

export const filesApi = {
  /**
   * Create an upload ticket (returns storage key for upload)
   */
  createUploadTicket: async (
    orgId: string,
    data: CreateUploadTicketRequest
  ): Promise<CreateUploadTicketResponse['data']> => {
    const response = await apiClient.post(`/orgs/${orgId}/files/upload-ticket`, data);
    return response.data.data;
  },

  /**
   * Complete upload after file is uploaded to storage
   */
  completeUpload: async (
    orgId: string,
    data: CompleteUploadRequest
  ): Promise<OrgFile> => {
    const response = await apiClient.post(`/orgs/${orgId}/files/complete-upload`, data);
    return response.data.data;
  },

  /**
   * Direct upload endpoint (multipart/form-data)
   * Note: Content-Type header is intentionally omitted - axios will set it automatically
   * with the boundary parameter when FormData is detected.
   */
  upload: async (
    orgId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<OrgFile> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/orgs/${orgId}/files/upload`, formData, {
      // Explicitly delete Content-Type to let axios set it with boundary
      headers: {
        'Content-Type': undefined,
      },
      onUploadProgress: onProgress
        ? (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        : undefined,
    });
    return response.data.data;
  },

  /**
   * List files with optional filters
   */
  list: async (
    orgId: string,
    filters?: ListFilesFilters
  ): Promise<OrgFile[]> => {
    // Dev-only guardrail: warn if called outside MetadataIndexProvider
    if (process.env.NODE_ENV !== 'production' && !isMetadataIndexLoading) {
      const stack = new Error().stack;
      const isFromProvider = stack?.includes('MetadataIndexProvider');
      if (!isFromProvider) {
        console.warn(
          '[filesApi.list] Called outside MetadataIndexProvider. ' +
          'Use useMetadataIndex() instead to avoid duplicate fetches.'
        );
      }
    }
    const params = new URLSearchParams();
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const url = `/orgs/${orgId}/files${query ? `?${query}` : ''}`;

    const response = await apiClient.get(url);
    return response.data.data;
  },

  /**
   * Get file by ID
   */
  get: async (orgId: string, fileId: string): Promise<OrgFile> => {
    const response = await apiClient.get(`/orgs/${orgId}/files/${fileId}`);
    return response.data.data;
  },

  /**
   * Update file visibility
   */
  updateVisibility: async (
    orgId: string,
    fileId: string,
    data: UpdateVisibilityRequest
  ): Promise<OrgFile> => {
    const response = await apiClient.patch(`/orgs/${orgId}/files/${fileId}/visibility`, data);
    return response.data.data;
  },

  /**
   * Delete file
   */
  delete: async (orgId: string, fileId: string): Promise<void> => {
    await apiClient.delete(`/orgs/${orgId}/files/${fileId}`);
  },

  /**
   * Get public file by link code
   */
  getPublicFile: async (code: string): Promise<OrgFile> => {
    const response = await apiClient.get(`/public/files/${code}`);
    return response.data.data;
  },
};
