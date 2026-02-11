/**
 * File storage service interface
 * Abstracts storage backend (Supabase, R2, etc.)
 */
export interface IFileStorageService {
  /**
   * Upload a file (or store metadata for already-uploaded files)
   * @param params File upload parameters
   * @returns Public URL and file identifier for database storage
   */
  upload(params: {
    fileName: string;
    buffer?: Buffer;
    mimeType: string;
    sizeBytes: number;
    orgId: string;
    userId: string;
    postId: string;
    storageKey?: string; // Optional: if provided, use this as the storage key instead of constructing one
  }): Promise<{ url: string; fileIdentifier: string }>;

  /**
   * Delete a file from storage
   * @param fileIdentifier File path/key in storage
   */
  delete(fileIdentifier: string): Promise<void>;

  /**
   * Get public URL for a file
   * @param fileIdentifier File path/key in storage
   * @returns Public URL
   */
  getPublicUrl(fileIdentifier: string): string;
}

