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
   * Get full metadata (all folders and documents metadata, no content)
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

  /**
   * Get folder by ID (with lens projection)
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
    const response = await apiClient.get(`/internal/airunote/folders/${folderId}/lenses`, {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Update canvas positions for a lens
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
    const response = await apiClient.get(`/internal/airunote/lenses/${lensId}`, {
      params: { orgId, userId },
    });
    return response.data;
  },

  /**
   * Update desktop/saved lens (Phase 6)
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
      `/internal/airunote/folders/${folderId}/lenses`,
      payload,
      {
        params: { orgId, userId },
      }
    );
    return response.data;
  },

  /**
   * Update folder lens
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
