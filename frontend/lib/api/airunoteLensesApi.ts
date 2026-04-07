/**
 * Airunote Lenses API Client
 * Type-safe API functions for Lens endpoints
 */

import apiClient from './client';
import type { AirunoteApiResponse } from '@/components/airunote/types';

export type AiruLensType = 'box' | 'board' | 'canvas' | 'book' | 'study' | 'desktop' | 'saved';

export interface AiruLens {
  id: string;
  folderId: string | null;
  name: string;
  type: AiruLensType;
  isDefault: boolean;
  metadata: Record<string, unknown> & {
    presentation?: {
      defaultView?: ViewMode;
    };
  };
  query: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'list' | 'icon' | 'preview' | 'full';

export interface AiruLensItem {
  id: string;
  lensId: string;
  entityId: string;
  entityType: 'document' | 'folder';
  columnId: string | null;
  order: number | null;
  x: number | null;
  y: number | null;
  viewMode: ViewMode | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type LensItemInput = {
  entityId: string;
  entityType: 'document' | 'folder';
  columnId?: string | null;
  order?: number | null;
  x?: number | null;
  y?: number | null;
  viewMode?: ViewMode | null;
  metadata?: Record<string, unknown>;
};

/**
 * Fetch all desktop/saved lenses for an org
 */
export async function fetchDesktopLenses(
  orgId: string
): Promise<AirunoteApiResponse<{ lenses: AiruLens[] }>> {
  const response = await apiClient.get(`/orgs/${orgId}/airunote/lenses`);
  return response.data;
}

/**
 * Fetch all lenses for a folder
 */
export async function fetchFolderLenses(
  orgId: string,
  folderId: string
): Promise<AirunoteApiResponse<{ lenses: AiruLens[] }>> {
  const response = await apiClient.get(
    `/orgs/${orgId}/airunote/lenses/folders/${folderId}/lenses`
  );
  return response.data;
}

/**
 * Fetch a single lens with its items
 */
export async function fetchLens(
  orgId: string,
  lensId: string
): Promise<AirunoteApiResponse<{ lens: AiruLens; items: AiruLensItem[] }>> {
  const response = await apiClient.get(`/orgs/${orgId}/airunote/lenses/${lensId}`);
  return response.data;
}

/**
 * Batch upsert lens items
 */
export async function patchLensItems(
  orgId: string,
  lensId: string,
  items: LensItemInput[]
): Promise<AirunoteApiResponse<{ updated: number }>> {
  const response = await apiClient.patch(`/orgs/${orgId}/airunote/lenses/${lensId}/items`, {
    items,
  });
  return response.data;
}

/**
 * Update a folder lens
 */
export async function updateFolderLens(
  orgId: string,
  folderId: string,
  lensId: string,
  data: {
    name?: string;
    type?: AiruLensType;
    metadata?: Record<string, unknown>;
    query?: Record<string, unknown> | null;
  }
): Promise<AirunoteApiResponse<{ lens: AiruLens }>> {
  const response = await apiClient.patch(
    `/orgs/${orgId}/airunote/lenses/folders/${folderId}/lenses/${lensId}`,
    data
  );
  return response.data;
}

/**
 * Set an existing folder lens as the default lens for that folder
 */
export async function setFolderDefaultLens(
  orgId: string,
  folderId: string,
  lensId: string
): Promise<AirunoteApiResponse<{ }>> {
  const response = await apiClient.post(
    `/orgs/${orgId}/airunote/lenses/folders/${folderId}/lenses/${lensId}/set-default`
  );
  return response.data;
}

/**
 * Update a desktop or saved lens
 */
export async function updateDesktopLens(
  orgId: string,
  lensId: string,
  data: {
    name?: string;
    query?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  }
): Promise<AirunoteApiResponse<{ lens: AiruLens }>> {
  const response = await apiClient.patch(`/orgs/${orgId}/airunote/lenses/${lensId}`, data);
  return response.data;
}

/**
 * Delete a lens
 */
export async function deleteLens(
  orgId: string,
  lensId: string
): Promise<AirunoteApiResponse<{ message: string }>> {
  const response = await apiClient.delete(`/orgs/${orgId}/airunote/lenses/${lensId}`);
  return response.data;
}
