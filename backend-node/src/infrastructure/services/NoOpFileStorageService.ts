import { injectable } from 'tsyringe';
import { IFileStorageService } from '../../application/interfaces/IFileStorageService';

/**
 * No-op file storage service used when storage backend is not configured
 * Allows the app to run without storage, but file operations will fail gracefully
 */
@injectable()
export class NoOpFileStorageService implements IFileStorageService {
  constructor() {
    console.warn('[NoOpFileStorage] File storage is not configured. File operations will not work.');
    console.warn('[NoOpFileStorage] To enable file storage, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or R2 credentials)');
  }

  async upload(params: {
    fileName: string;
    buffer?: Buffer;
    mimeType: string;
    sizeBytes: number;
    orgId: string;
    userId: string;
    postId: string;
    storageKey?: string;
  }): Promise<{ url: string; fileIdentifier: string }> {
    console.warn('[NoOpFileStorage] upload() called but storage is not configured');
    // Return a placeholder URL - this allows posts to be created without attachments
    // The actual file won't be stored, but the app won't crash
    const fileIdentifier = `placeholder/${params.fileName}`;
    return {
      url: `#storage-not-configured:${fileIdentifier}`,
      fileIdentifier,
    };
  }

  async delete(fileIdentifier: string): Promise<void> {
    console.warn('[NoOpFileStorage] delete() called but storage is not configured');
    // No-op - just log and return
  }

  getPublicUrl(fileIdentifier: string): string {
    console.warn('[NoOpFileStorage] getPublicUrl() called but storage is not configured');
    return `#storage-not-configured:${fileIdentifier}`;
  }
}

