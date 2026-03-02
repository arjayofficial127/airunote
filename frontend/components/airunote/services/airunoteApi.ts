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
  FullMetadataResponse,
  UpdateCanvasPositionsRequest,
  UpdateBoardCardRequest,
  UpdateBoardLanesRequest,
} from '../types';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

/**
 * Airunote API client
 * Production endpoints under /orgs/:orgId/airunote
 */
export const airunoteApi = {
  /**
   * Provision user root (idempotent)
   * NOTE: Still using internal route - no production route exists yet
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
    const { orgId, userId, ...body } = request;
    const response = await apiClient.post(`/orgs/${orgId}/airunote/folders`, body);
    return response.data;
  },

  /**
   * Update folder (rename or move)
   */
  updateFolder: async (
    folderId: string,
    request: UpdateFolderRequest
  ): Promise<AirunoteApiResponse<{ folder: AiruFolder }>> => {
    const { orgId, userId, ...body } = request;
    const response = await apiClient.put(`/orgs/${orgId}/airunote/folders/${folderId}`, body);
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
    const response = await apiClient.delete(`/orgs/${orgId}/airunote/folders/${folderId}`);
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
    const params: Record<string, string> = {};
    if (parentFolderId) {
      params.parentFolderId = parentFolderId;
    }
    const response = await apiClient.get(`/orgs/${orgId}/airunote/tree`, { params });
    return response.data;
  },

  /**
   * Get full metadata (all folders and documents metadata, no content)
   * NOTE: Still using internal route - no production route exists yet
   */
  getFullMetadata: async (
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<FullMetadataResponse>> => {
    const response = await apiClient.get('/internal/airunote/full-metadata', {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Create document
   */
  createDocument: async (
    request: CreateDocumentRequest
  ): Promise<AirunoteApiResponse<{ document: AiruDocument }>> => {
    const { orgId, userId, ...body } = request;
    const response = await apiClient.post(`/orgs/${orgId}/airunote/documents`, body);
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
    const response = await apiClient.get(`/orgs/${orgId}/airunote/documents/${documentId}`);
    return response.data;
  },

  /**
   * Update document (content, name, or move)
   */
  updateDocument: async (
    documentId: string,
    request: UpdateDocumentRequest
  ): Promise<AirunoteApiResponse<{ document: AiruDocument }>> => {
    const { orgId, userId, ...body } = request;
    const response = await apiClient.put(`/orgs/${orgId}/airunote/documents/${documentId}`, body);
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
    const response = await apiClient.delete(`/orgs/${orgId}/airunote/documents/${documentId}`);
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
    const response = await apiClient.get(`/orgs/${orgId}/airunote/folders/${folderId}/documents`);
    return response.data;
  },

  /**
   * Delete user vault (hard delete)
   * NOTE: Still using internal route - no production route exists yet
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

  /**
   * Get folder by ID (with lens projection)
   * NOTE: Still using internal route - no production route exists yet
   */
  getFolder: async (
    folderId: string,
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<{ folder: AiruFolder }>> => {
    const response = await apiClient.get(`/internal/airunote/folder/${folderId}`, {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Get lenses for a folder
   */
  getFolderLenses: async (
    folderId: string,
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<{ lenses: AiruLens[] }>> => {
    const response = await apiClient.get(`/orgs/${orgId}/airunote/lenses/folders/${folderId}/lenses`);
    return response.data;
  },

  /**
   * Update canvas positions for a lens
   * NOTE: Still using internal route - no production route exists yet
   */
  updateCanvasPositions: async (
    lensId: string,
    request: UpdateCanvasPositionsRequest
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.patch(`/internal/airunote/lenses/${lensId}/canvas-positions`, request);
    return response.data;
  },

  /**
   * Update board card position (fractional order)
   * NOTE: Still using internal route - no production route exists yet
   */
  updateBoardCard: async (
    lensId: string,
    request: UpdateBoardCardRequest
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.patch(`/internal/airunote/lenses/${lensId}/board-card`, request);
    return response.data;
  },

  /**
   * Update board lanes
   * NOTE: Still using internal route - no production route exists yet
   */
  updateBoardLanes: async (
    lensId: string,
    request: UpdateBoardLanesRequest
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.patch(`/internal/airunote/lenses/${lensId}/board-lanes`, request);
    return response.data;
  },

  /**
   * Batch update lens layout (canvas and/or board positions)
   * Phase 8.1 — Batch Layout Updates
   * NOTE: Still using internal route - no production route exists yet
   */
  updateBatchLayout: async (
    lensId: string,
    request: {
      canvasPositions?: Record<string, { x: number; y: number }>;
      boardPositions?: Record<string, { laneId: string; order: number }>;
    }
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.patch(`/internal/airunote/lenses/${lensId}/batch-layout`, request);
    return response.data;
  },

  /**
   * Create desktop lens (Phase 5)
   * Phase 6 — Also supports "saved" type
   * NOTE: Still using internal route - no production route exists yet
   */
  createDesktopLens: async (
    orgId: string,
    userId: string,
    name: string,
    query?: Record<string, unknown> | null,
    metadata?: Record<string, unknown>,
    type: 'desktop' | 'saved' = 'desktop'
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.post('/internal/airunote/lenses', {
      orgId,
      userId,
      name,
      type,
      query: query || null,
      metadata: metadata || {},
    });
    return response.data;
  },

  /**
   * Get lens by ID with documents (Phase 5 - Desktop Lenses)
   */
  getLens: async (
    lensId: string,
    orgId: string,
    userId: string
  ): Promise<AirunoteApiResponse<{ lens: AiruLens; documents: AiruDocument[] }>> => {
    const response = await apiClient.get(`/orgs/${orgId}/airunote/lenses/${lensId}`);
    return response.data;
  },

  /**
   * Update desktop/saved lens (Phase 6)
   * NOTE: Still using internal route - no production route exists yet
   */
  updateDesktopLens: async (
    lensId: string,
    orgId: string,
    userId: string,
    name?: string,
    query?: Record<string, unknown> | null,
    metadata?: Record<string, unknown>
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.patch(
      `/internal/airunote/lenses/${lensId}`,
      {
        name,
        query: query || null,
        metadata: metadata || {},
      },
      {
        params: { orgId, userId },
      }
    );
    return response.data;
  },

  /**
   * Create folder lens
   */
  createFolderLens: async (
    folderId: string,
    orgId: string,
    userId: string,
    payload: {
      name: string;
      type: 'box' | 'board' | 'canvas' | 'book' | 'desktop' | 'saved';
      metadata?: Record<string, unknown>;
      query?: Record<string, unknown> | null;
    }
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.post(
      `/orgs/${orgId}/airunote/lenses/folders/${folderId}/lenses`,
      payload
    );
    return response.data;
  },

  /**
   * Update folder lens
   * NOTE: Still using internal route - no production route exists yet
   */
  updateFolderLens: async (
    folderId: string,
    lensId: string,
    orgId: string,
    userId: string,
    partialData: {
      name?: string;
      type?: 'box' | 'board' | 'canvas' | 'book';
      metadata?: Record<string, unknown>;
      query?: Record<string, unknown> | null;
    }
  ): Promise<AirunoteApiResponse<{ lens: AiruLens }>> => {
    const response = await apiClient.patch(
      `/internal/airunote/folders/${folderId}/lenses/${lensId}`,
      partialData,
      {
        params: { orgId, userId },
      }
    );
    return response.data;
  },
};
