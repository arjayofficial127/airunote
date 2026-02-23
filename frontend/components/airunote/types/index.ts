/**
 * Airunote TypeScript Interfaces
 * Derived from backend repository interfaces
 */

export type AiruFolderType = 
  | 'box' | 'board' | 'book' | 'canvas' | 'collection' 
  | 'contacts' | 'ledger' | 'journal' | 'manual' 
  | 'notebook' | 'pipeline' | 'project' | 'wiki';

export interface AiruFolder {
  id: string;
  orgId: string;
  ownerUserId: string;
  parentFolderId: string;
  humanId: string;
  visibility: 'private' | 'org' | 'public';
  type: AiruFolderType;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AiruDocument {
  id: string;
  folderId: string;
  ownerUserId: string;
  type: 'TXT' | 'MD' | 'RTF';
  name: string;
  content: string; // Always use canonicalContent from backend
  canonicalContent?: string;
  sharedContent?: string | null;
  visibility: 'private' | 'org' | 'public';
  state: 'active' | 'archived' | 'trashed';
  attributes: Record<string, any>; // Phase 7: Hybrid Attribute Engine
  createdAt: Date;
  updatedAt: Date;
}

export interface AiruDocumentMetadata {
  id: string;
  folderId: string;
  ownerUserId: string;
  type: 'TXT' | 'MD' | 'RTF';
  name: string;
  visibility: 'private' | 'org' | 'public';
  state: 'active' | 'archived' | 'trashed';
  attributes: Record<string, any>; // Phase 7: Hybrid Attribute Engine
  createdAt: Date;
  updatedAt: Date;
  size?: number; // Optional: content size in bytes if available
}

export interface FullMetadataResponse {
  folders: AiruFolder[];
  documents: AiruDocumentMetadata[];
}

export interface FolderTreeResponse {
  folders: AiruFolder[];
  documents: AiruDocument[];
  children: FolderTreeResponse[];
}

// API Response Wrapper
export interface AirunoteApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code: string;
  };
}

// Request Types
export interface CreateFolderRequest {
  orgId: string;
  userId: string;
  parentFolderId: string;
  humanId: string;
  type?: AiruFolderType;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateFolderRequest {
  orgId: string;
  userId: string;
  humanId?: string;
  parentFolderId?: string;
  type?: AiruFolderType;
  metadata?: Record<string, unknown> | null;
}

export interface CreateDocumentRequest {
  orgId: string;
  userId: string;
  folderId: string;
  name: string;
  content: string;
  type: 'TXT' | 'MD' | 'RTF';
  attributes?: Record<string, any>; // Phase 7: Hybrid Attribute Engine
}

export interface UpdateDocumentRequest {
  orgId: string;
  userId: string;
  content?: string;
  name?: string;
  folderId?: string;
  attributes?: Record<string, any>; // Phase 7: Hybrid Attribute Engine
}

// Error Types
export type AirunoteErrorCode = 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';

export interface AirunoteError {
  message: string;
  code: AirunoteErrorCode;
}

// Lens Types (Phase 2+)
// Phase 6 — Unified Projection Engine
export interface LensQuery {
  filters?: {
    tags?: string[];
    state?: string[];
    authorId?: string;
    text?: string;
    attributes?: Record<string, any>; // Phase 7: Hybrid Attribute Engine - filter by attribute key-value pairs
  };
  sort?: {
    field: 'createdAt' | 'updatedAt';
    direction: 'asc' | 'desc';
  };
  groupBy?: string | null;
}

export interface AiruLens {
  id: string;
  folderId: string | null;
  name: string;
  type: 'box' | 'board' | 'canvas' | 'book' | 'desktop' | 'saved';
  isDefault: boolean;
  metadata: Record<string, unknown>;
  query: LensQuery | Record<string, unknown> | null; // Phase 6: Standardized to LensQuery, but keep backward compatible
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface UpdateCanvasPositionsRequest {
  positions: Record<string, CanvasPosition>;
}

// Board Types (Phase 4+)
export interface BoardLane {
  id: string;
  name: string;
  order: number;
}

export interface BoardCardPosition {
  laneId: string;
  fractionalOrder: number;
}

export interface UpdateBoardCardRequest {
  documentId: string;
  laneId: string;
  fractionalOrder: number;
}

export interface UpdateBoardLanesRequest {
  lanes: BoardLane[];
}
