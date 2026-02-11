import apiClient from './client';

export interface Attachment {
  id: string;
  orgId: string;
  postId: string;
  authorUserId: string;
  type: 'image' | 'file' | 'video' | 'link';
  url: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  label: string | null;
  order: number;
  createdAt: string;
}

export interface CreateAttachmentInput {
  url: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  type: 'image' | 'file' | 'video' | 'link';
  label?: string;
  order?: number;
}

export interface AttachmentsResponse {
  success: boolean;
  data: Attachment[];
}

export const attachmentsApi = {
  create: async (
    orgId: string,
    postId: string,
    attachments: CreateAttachmentInput[]
  ): Promise<AttachmentsResponse> => {
    const response = await apiClient.post(
      `/orgs/${orgId}/posts/${postId}/attachments`,
      attachments
    );
    return response.data;
  },

  list: async (
    orgId: string,
    postId: string
  ): Promise<AttachmentsResponse> => {
    const response = await apiClient.get(
      `/orgs/${orgId}/posts/${postId}/attachments`
    );
    return response.data;
  },

  delete: async (
    orgId: string,
    postId: string,
    attachmentId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/orgs/${orgId}/posts/${postId}/attachments/${attachmentId}`
    );
  },
};

