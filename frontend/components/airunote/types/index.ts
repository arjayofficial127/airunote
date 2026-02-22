/**
 * Airunote TypeScript Interfaces
 * Derived from backend repository interfaces
 */

export interface AiruFolder {
  id: string;
  orgId: string;
  ownerUserId: string;
  parentFolderId: string;
  humanId: string;
  visibility: 'private' | 'org' | 'public';
  type: 'box' | 'book' | 'board';
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
  type?: 'box' | 'book' | 'board';
  metadata?: Record<string, unknown> | null;
}

export interface UpdateFolderRequest {
  orgId: string;
  userId: string;
  humanId?: string;
  parentFolderId?: string;
  type?: 'box' | 'book' | 'board';
  metadata?: Record<string, unknown> | null;
}

export interface CreateDocumentRequest {
  orgId: string;
  userId: string;
  folderId: string;
  name: string;
  content: string;
  type: 'TXT' | 'MD' | 'RTF';
}

export interface UpdateDocumentRequest {
  orgId: string;
  userId: string;
  content?: string;
  name?: string;
  folderId?: string;
}

// Error Types
export type AirunoteErrorCode = 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';

export interface AirunoteError {
  message: string;
  code: AirunoteErrorCode;
}
