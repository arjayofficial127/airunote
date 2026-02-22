/**
 * Airunote Cache Key Helpers
 * Centralized cache key generation for React Query
 */

/**
 * Generate cache key for folder tree
 * @param orgId - Organization ID
 * @param userId - User ID
 * @param parentFolderId - Parent folder ID (optional, defaults to 'root')
 */
export function getTreeCacheKey(
  orgId: string,
  userId: string,
  parentFolderId?: string
): string[] {
  return ['airunote', 'tree', orgId, userId, parentFolderId || 'root'];
}

/**
 * Generate cache key for document
 * @param orgId - Organization ID
 * @param userId - User ID
 * @param documentId - Document ID
 */
export function getDocumentCacheKey(
  orgId: string,
  userId: string,
  documentId: string
): string[] {
  return ['airunote', 'document', orgId, userId, documentId];
}

/**
 * Generate cache key for folder documents list
 * @param orgId - Organization ID
 * @param userId - User ID
 * @param folderId - Folder ID
 */
export function getFolderDocumentsCacheKey(
  orgId: string,
  userId: string,
  folderId: string
): string[] {
  return ['airunote', 'folder-documents', orgId, userId, folderId];
}

/**
 * Generate cache key for full metadata
 * @param orgId - Organization ID
 * @param userId - User ID
 */
export function getFullMetadataCacheKey(
  orgId: string,
  userId: string
): string[] {
  return ['airunote', 'full-metadata', orgId, userId];
}

/**
 * Invalidate all tree caches for an org/user
 * Returns query keys to invalidate
 */
export function getTreeInvalidationKeys(
  orgId: string,
  userId: string
): string[][] {
  return [
    ['airunote', 'tree', orgId, userId, 'root'],
    // Note: React Query will handle partial matches
    // We can invalidate all tree queries with a prefix
  ];
}
