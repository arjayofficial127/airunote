import { IFileStorageService } from '../../application/interfaces/IFileStorageService';
import { SupabaseFileStorageService } from './SupabaseFileStorageService';
import { R2FileStorageService } from './R2FileStorageService';
import { NoOpFileStorageService } from './NoOpFileStorageService';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Factory for creating storage backend service instances
 * Reads STORAGE_BACKEND env var to determine which backend to use
 * Falls back to NoOpFileStorageService if credentials are not configured
 */
export class StorageBackendFactory {
  static create(): IFileStorageService {
    const backend = process.env.STORAGE_BACKEND || 'supabase';

    try {
      switch (backend.toLowerCase()) {
        case 'supabase':
          // Check if Supabase credentials are available
          if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return new SupabaseFileStorageService();
          } else {
            console.warn('[StorageBackendFactory] Supabase credentials not found, using NoOpFileStorageService');
            return new NoOpFileStorageService();
          }
        case 'r2':
          // Check if R2 credentials are available
          if (
            process.env.R2_ACCOUNT_ID &&
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY
          ) {
            return new R2FileStorageService();
          } else {
            console.warn('[StorageBackendFactory] R2 credentials not found, using NoOpFileStorageService');
            return new NoOpFileStorageService();
          }
        case 'noop':
          // Explicitly use no-op storage
          return new NoOpFileStorageService();
        default:
          console.warn(`[StorageBackendFactory] Invalid STORAGE_BACKEND: ${backend}, using NoOpFileStorageService`);
          return new NoOpFileStorageService();
      }
    } catch (error: any) {
      // If any service fails to initialize, fall back to NoOp
      console.error('[StorageBackendFactory] Error creating storage service:', error.message);
      console.warn('[StorageBackendFactory] Falling back to NoOpFileStorageService');
      return new NoOpFileStorageService();
    }
  }
}

