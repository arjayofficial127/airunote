/**
 * Airunote Lenses API Client
 * Type-safe API functions for Lens endpoints
 */

import apiClient from './client';
import type { AirunoteApiResponse } from '@/components/airunote/types';

export type AiruLensType = 'box' | 'board' | 'canvas' | 'book' | 'desktop' | 'saved';

export interface AiruLens {
  id: string;
  folderId: string | null;
  name: string;
  type: AiruLensType;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  query: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiruLensItem {
  id: string;
  lensId: string;
  entityId: string;
  entityType: 'document' | 'folder';
  columnId: string | null;
  order: number | null;
  x: number | null;
  y: number | null;
  metadata: {
    viewMode?: 'icon' | 'preview' | 'full' | 'scroll';
  };
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
  metadata?: {
    viewMode?: 'icon' | 'preview' | 'full' | 'scroll';
  };
};

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
