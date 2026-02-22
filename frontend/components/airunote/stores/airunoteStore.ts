/**
 * Airunote Store
 * Two-layer client architecture:
 * - Layer 1: MetadataStore (folders + documents metadata)
 * - Layer 2: ContentStore (full document content, lazy-loaded)
 */

'use client';

import { create } from 'zustand';
import type { AiruFolder, AiruDocumentMetadata, AiruDocument } from '../types';

// Layer 1: Metadata Store State
interface MetadataStoreState {
  // Maps for efficient lookups
  foldersById: Map<string, AiruFolder>;
  documentsById: Map<string, AiruDocumentMetadata>;
  childrenByParentId: Map<string | null, string[]>; // folder IDs by parent (null = root)

  // Loading state
  isLoading: boolean;
  error: Error | null;
  lastFetched: Date | null;

  // Search state
  searchQuery: string;

  // Actions
  setMetadata: (folders: AiruFolder[], documents: AiruDocumentMetadata[]) => void;
  addFolder: (folder: AiruFolder) => void;
  updateFolder: (folder: AiruFolder) => void;
  removeFolder: (folderId: string) => void;
  addDocument: (document: AiruDocumentMetadata) => void;
  updateDocumentMetadata: (document: AiruDocumentMetadata) => void;
  removeDocument: (documentId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setSearchQuery: (query: string) => void;
  clear: () => void;
}

// Layer 2: Content Store State
interface ContentStoreState {
  // Map of document ID -> full document content
  documentContentById: Map<string, AiruDocument>;

  // Loading states per document
  loadingDocumentIds: Set<string>;

  // Actions
  setDocumentContent: (document: AiruDocument) => void;
  setDocumentLoading: (documentId: string, isLoading: boolean) => void;
  removeDocumentContent: (documentId: string) => void;
  clear: () => void;
}

// Combined Store
interface AirunoteStore extends MetadataStoreState, ContentStoreState {
  // Helper getters (computed from Maps)
  getFolderById: (folderId: string) => AiruFolder | undefined;
  getDocumentMetadataById: (documentId: string) => AiruDocumentMetadata | undefined;
  getDocumentContentById: (documentId: string) => AiruDocument | undefined;
  getFoldersByParent: (parentFolderId: string | null) => AiruFolder[];
  getDocumentsByFolder: (folderId: string) => AiruDocumentMetadata[];
  getFolderItemCount: (folderId: string, recursive?: boolean) => number;
  getFolderCounts: (folderId: string) => {
    directFolders: number;
    directFiles: number;
    subFolders: number;
    subFiles: number;
  };
  getFilteredFolders: (parentFolderId: string | null) => AiruFolder[];
  getFilteredDocuments: (folderId: string) => AiruDocumentMetadata[];
  isDocumentContentLoaded: (documentId: string) => boolean;
  isDocumentLoading: (documentId: string) => boolean;
  buildTree: (rootFolderId: string | null) => import('../types').FolderTreeResponse;
}

export const useAirunoteStore = create<AirunoteStore>((set, get) => ({
  // =====================================================
  // Layer 1: Metadata Store Initial State
  // =====================================================
  foldersById: new Map(),
  documentsById: new Map(),
  childrenByParentId: new Map(),
  isLoading: false,
  error: null,
  lastFetched: null,
  searchQuery: '',

  // =====================================================
  // Layer 2: Content Store Initial State
  // =====================================================
  documentContentById: new Map(),
  loadingDocumentIds: new Set(),

  // =====================================================
  // Metadata Store Actions
  // =====================================================
  setMetadata: (folders, documents) => {
    const foldersById = new Map<string, AiruFolder>();
    const documentsById = new Map<string, AiruDocumentMetadata>();
    const childrenByParentId = new Map<string | null, string[]>();

    // Index folders
    folders.forEach((folder) => {
      foldersById.set(folder.id, folder);
      const parentId = folder.parentFolderId === folder.id ? null : folder.parentFolderId;
      if (!childrenByParentId.has(parentId)) {
        childrenByParentId.set(parentId, []);
      }
      childrenByParentId.get(parentId)!.push(folder.id);
    });

    // Index documents
    documents.forEach((doc) => {
      documentsById.set(doc.id, doc);
    });

    set({
      foldersById,
      documentsById,
      childrenByParentId,
      lastFetched: new Date(),
      isLoading: false,
      error: null,
    });
  },

  addFolder: (folder) => {
    const { foldersById, childrenByParentId } = get();
    const newFoldersById = new Map(foldersById);
    const newChildrenByParentId = new Map(childrenByParentId);

    newFoldersById.set(folder.id, folder);
    const parentId = folder.parentFolderId === folder.id ? null : folder.parentFolderId;
    if (!newChildrenByParentId.has(parentId)) {
      newChildrenByParentId.set(parentId, []);
    }
    newChildrenByParentId.get(parentId)!.push(folder.id);

    set({
      foldersById: newFoldersById,
      childrenByParentId: newChildrenByParentId,
    });
  },

  updateFolder: (folder) => {
    const { foldersById, childrenByParentId } = get();
    const oldFolder = foldersById.get(folder.id);
    if (!oldFolder) return;

    const newFoldersById = new Map(foldersById);
    const newChildrenByParentId = new Map(childrenByParentId);

    // Update folder
    newFoldersById.set(folder.id, folder);

    // If parent changed, update children indices
    const oldParentId = oldFolder.parentFolderId === oldFolder.id ? null : oldFolder.parentFolderId;
    const newParentId = folder.parentFolderId === folder.id ? null : folder.parentFolderId;

    if (oldParentId !== newParentId) {
      // Remove from old parent
      const oldChildren = newChildrenByParentId.get(oldParentId);
      if (oldChildren) {
        newChildrenByParentId.set(
          oldParentId,
          oldChildren.filter((id) => id !== folder.id)
        );
      }

      // Add to new parent
      if (!newChildrenByParentId.has(newParentId)) {
        newChildrenByParentId.set(newParentId, []);
      }
      newChildrenByParentId.get(newParentId)!.push(folder.id);
    }

    set({
      foldersById: newFoldersById,
      childrenByParentId: newChildrenByParentId,
    });
  },

  removeFolder: (folderId) => {
    const { foldersById, childrenByParentId } = get();
    const folder = foldersById.get(folderId);
    if (!folder) return;

    const newFoldersById = new Map(foldersById);
    const newChildrenByParentId = new Map(childrenByParentId);

    newFoldersById.delete(folderId);
    const parentId = folder.parentFolderId === folder.id ? null : folder.parentFolderId;
    const children = newChildrenByParentId.get(parentId);
    if (children) {
      newChildrenByParentId.set(
        parentId,
        children.filter((id) => id !== folderId)
      );
    }

    set({
      foldersById: newFoldersById,
      childrenByParentId: newChildrenByParentId,
    });
  },

  addDocument: (document) => {
    const { documentsById } = get();
    const newDocumentsById = new Map(documentsById);
    newDocumentsById.set(document.id, document);
    set({ documentsById: newDocumentsById });
  },

  updateDocumentMetadata: (document) => {
    const { documentsById } = get();
    const newDocumentsById = new Map(documentsById);
    newDocumentsById.set(document.id, document);
    set({ documentsById: newDocumentsById });
  },

  removeDocument: (documentId) => {
    const { documentsById, documentContentById } = get();
    const newDocumentsById = new Map(documentsById);
    const newDocumentContentById = new Map(documentContentById);

    newDocumentsById.delete(documentId);
    newDocumentContentById.delete(documentId);

    set({
      documentsById: newDocumentsById,
      documentContentById: newDocumentContentById,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clear: () => {
    set({
      foldersById: new Map(),
      documentsById: new Map(),
      childrenByParentId: new Map(),
      documentContentById: new Map(),
      loadingDocumentIds: new Set(),
      isLoading: false,
      error: null,
      lastFetched: null,
      searchQuery: '',
    });
  },

  // =====================================================
  // Content Store Actions
  // =====================================================
  setDocumentContent: (document) => {
    const { documentContentById } = get();
    const newDocumentContentById = new Map(documentContentById);
    newDocumentContentById.set(document.id, document);
    set({ documentContentById: newDocumentContentById });
  },

  setDocumentLoading: (documentId, isLoading) => {
    const { loadingDocumentIds } = get();
    const newLoadingDocumentIds = new Set(loadingDocumentIds);
    if (isLoading) {
      newLoadingDocumentIds.add(documentId);
    } else {
      newLoadingDocumentIds.delete(documentId);
    }
    set({ loadingDocumentIds: newLoadingDocumentIds });
  },

  removeDocumentContent: (documentId) => {
    const { documentContentById } = get();
    const newDocumentContentById = new Map(documentContentById);
    newDocumentContentById.delete(documentId);
    set({ documentContentById: newDocumentContentById });
  },

  // =====================================================
  // Helper Getters (computed from Maps)
  // =====================================================
  getFolderById: (folderId) => {
    return get().foldersById.get(folderId);
  },

  getDocumentMetadataById: (documentId) => {
    return get().documentsById.get(documentId);
  },

  getDocumentContentById: (documentId) => {
    return get().documentContentById.get(documentId);
  },

  getFoldersByParent: (parentFolderId) => {
    const { foldersById, childrenByParentId } = get();
    const childIds = childrenByParentId.get(parentFolderId) || [];
    return childIds
      .map((id) => foldersById.get(id))
      .filter((folder): folder is AiruFolder => folder !== undefined);
  },

  getDocumentsByFolder: (folderId) => {
    const { documentsById } = get();
    const documents: AiruDocumentMetadata[] = [];
    documentsById.forEach((doc) => {
      if (doc.folderId === folderId) {
        documents.push(doc);
      }
    });
    return documents;
  },

  getFolderItemCount: (folderId, recursive = false) => {
    const { getFoldersByParent, getDocumentsByFolder } = get();
    
    // Count direct items
    const directFolders = getFoldersByParent(folderId);
    const directDocuments = getDocumentsByFolder(folderId);
    let count = directFolders.length + directDocuments.length;
    
    // If recursive, count all descendants
    if (recursive) {
      const countRecursive = (parentId: string): number => {
        const folders = getFoldersByParent(parentId);
        const documents = getDocumentsByFolder(parentId);
        let subCount = folders.length + documents.length;
        
        // Recursively count children
        folders.forEach((folder) => {
          subCount += countRecursive(folder.id);
        });
        
        return subCount;
      };
      
      count = countRecursive(folderId);
    }
    
    return count;
  },

  getFolderCounts: (folderId) => {
    const { getFoldersByParent, getDocumentsByFolder } = get();
    
    // Direct counts
    const directFolders = getFoldersByParent(folderId);
    const directFiles = getDocumentsByFolder(folderId);
    
    // Recursive counts (sub folders and files)
    const countRecursive = (parentId: string): { folders: number; files: number } => {
      const folders = getFoldersByParent(parentId);
      const files = getDocumentsByFolder(parentId);
      
      let subFolders = folders.length;
      let subFiles = files.length;
      
      // Recursively count children
      folders.forEach((folder) => {
        const childCounts = countRecursive(folder.id);
        subFolders += childCounts.folders;
        subFiles += childCounts.files;
      });
      
      return { folders: subFolders, files: subFiles };
    };
    
    const subCounts = countRecursive(folderId);
    
    return {
      directFolders: directFolders.length,
      directFiles: directFiles.length,
      subFolders: subCounts.folders - directFolders.length, // Exclude direct folders
      subFiles: subCounts.files - directFiles.length, // Exclude direct files
    };
  },

  getFilteredFolders: (parentFolderId) => {
    const { getFoldersByParent, searchQuery } = get();
    const folders = getFoldersByParent(parentFolderId);
    
    if (!searchQuery.trim()) {
      return folders;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return folders.filter((folder) =>
      folder.humanId.toLowerCase().includes(query)
    );
  },

  getFilteredDocuments: (folderId) => {
    const { getDocumentsByFolder, searchQuery } = get();
    const documents = getDocumentsByFolder(folderId);
    
    if (!searchQuery.trim()) {
      return documents;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return documents.filter((doc) =>
      doc.name.toLowerCase().includes(query)
    );
  },

  isDocumentContentLoaded: (documentId) => {
    return get().documentContentById.has(documentId);
  },

  isDocumentLoading: (documentId) => {
    return get().loadingDocumentIds.has(documentId);
  },

  buildTree: (rootFolderId) => {
    const { getFoldersByParent, getDocumentsByFolder } = get();
    
    // Import type here to avoid circular dependency
    type FolderTreeResponse = {
      folders: AiruFolder[];
      documents: AiruDocument[];
      children: FolderTreeResponse[];
    };

    const buildTreeRecursive = (parentId: string | null): FolderTreeResponse => {
      // Get folders with this parent
      const folders = getFoldersByParent(parentId);
      
      // Get documents in this folder (parentId is the folderId for documents)
      const documents = parentId ? getDocumentsByFolder(parentId) : [];
      
      // Convert document metadata to full document format (without content for tree)
      const treeDocuments = documents.map((doc) => ({
        id: doc.id,
        folderId: doc.folderId,
        ownerUserId: doc.ownerUserId,
        type: doc.type,
        name: doc.name,
        content: '', // Tree doesn't need content
        visibility: doc.visibility,
        state: doc.state,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      // Recursively build children for each folder
      const children = folders.map((folder) => buildTreeRecursive(folder.id));

      return {
        folders,
        documents: treeDocuments,
        children,
      };
    };

    // If no rootFolderId, return empty tree
    if (!rootFolderId) {
      return {
        folders: [],
        documents: [],
        children: [],
      };
    }

    return buildTreeRecursive(rootFolderId);
  },
}));
