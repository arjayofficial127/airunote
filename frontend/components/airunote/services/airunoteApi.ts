/**
 * Airunote API Client
 * Type-safe API functions for Airunote endpoints
 */

import apiClient from '@/lib/api/client';
import type {
  AiruFolder,
  AiruDocument,
  FolderTreeResponse,
  CreateFolderRequest,
  UpdateFolderRequest,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  AirunoteApiResponse,
} from '../types';

/**
 * Airunote API client
 * All endpoints are under /internal/airunote
 */
export const airunoteApi = {
  /**
   * Provision user root (idempotent)
   */
  provision: async (
    orgId: string,
    userId: string,
    orgOwnerUserId: string
  ): Promise<AirunoteApiResponse<{ rootFolder: AiruFolder }>> => {
    const response = await apiClient.post('/internal/airunote/provision', {
      orgId,
      userId,
      orgOwnerUserId,
    });
    return response.data;
  },

  /**
   * Create folder
   */
  createFolder: async (
    request: CreateFolderRequest
  ): Promise<AirunoteApiResponse<{ folder: AiruFolder }>> => {
    const response = await apiClient.post('/internal/airunote/folder', request);
    return response.data;
  },

  /**
   * Update folder (rename or move)
   */
  updateFolder: async (
    folderId: string,
    request: UpdateFolderRequest
  ): Promise<AirunoteApiResponse<{ folder: AiruFolder }>> => {
    const response = await apiClient.put(`/internal/airunote/folder/${folderId}`, request);
    return response.data;
  },

  /**
   * Delete folder
   */
  deleteFolder: async (
    folderId: string,
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<{}>> => {
    const response = await apiClient.delete(`/internal/airunote/folder/${folderId}`, {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Get folder tree
   */
  getTree: async (
    orgId: string,
    userId: string,
    parentFolderId?: string
  ): Promise<AirunoteApiResponse<FolderTreeResponse>> => {
    const params: Record<string, string> = { orgId, userId };
    if (parentFolderId) {
      params.parentFolderId = parentFolderId;
    }
    const response = await apiClient.get('/internal/airunote/tree', { params });
    return response.data;
  },

  /**
   * Create document
   */
  createDocument: async (
    request: CreateDocumentRequest
  ): Promise<AirunoteApiResponse<{ document: AiruDocument }>> => {
    const response = await apiClient.post('/internal/airunote/document', request);
    return response.data;
  },

  /**
   * Get document
   */
  getDocument: async (
    documentId: string,
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<{ document: AiruDocument }>> => {
    const response = await apiClient.get(`/internal/airunote/document/${documentId}`, {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Update document (content, name, or move)
   */
  updateDocument: async (
    documentId: string,
    request: UpdateDocumentRequest
  ): Promise<AirunoteApiResponse<{ document: AiruDocument }>> => {
    const response = await apiClient.put(`/internal/airunote/document/${documentId}`, request);
    return response.data;
  },

  /**
   * Delete document
   */
  deleteDocument: async (
    documentId: string,
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<{}>> => {
    const response = await apiClient.delete(`/internal/airunote/document/${documentId}`, {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Get documents in folder
   */
  getFolderDocuments: async (
    folderId: string,
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<{ documents: AiruDocument[] }>> => {
    const response = await apiClient.get(`/internal/airunote/folder/${folderId}/documents`, {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Delete user vault (hard delete)
   */
  deleteVault: async (
    orgId: string,
    userId: string,
    confirmedByUserId: string
  ): Promise<
    AirunoteApiResponse<{
      deletedFolders: number;
      deletedDocuments: number;
      deletedShares: number;
      deletedLinks: number;
    }>
  > => {
    const response = await apiClient.post('/internal/airunote/vault/delete', {
      orgId,
      userId,
      confirmedByUserId,
      confirmation: 'DELETE_VAULT_PERMANENTLY',
    });
    return response.data;
  },
};
