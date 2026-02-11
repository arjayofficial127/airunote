import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IFileStorageService } from '../../application/interfaces/IFileStorageService';
import * as dotenv from 'dotenv';

dotenv.config();

@injectable()
export class SupabaseFileStorageService implements IFileStorageService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    if (!this.bucketName) {
      throw new Error('SUPABASE_BUCKET_NAME must be set');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
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
    // For MVP: UploadThing handles the actual upload
    // This method accepts metadata and constructs the file path
    // TODO: Implement direct buffer upload for future backend-side uploads
    
    const filePath = params.storageKey || `orgs/${params.orgId}/posts/${params.postId}/${params.fileName}`;
    const fileIdentifier = filePath;

    // If buffer is provided, upload directly (future feature)
    if (params.buffer) {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, params.buffer, {
          contentType: params.mimeType,
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload file to Supabase: ${error.message}`);
      }

      const publicUrl = this.getPublicUrl(filePath);
      return { url: publicUrl, fileIdentifier: filePath };
    }

    // For MVP: Return public URL assuming file already uploaded via UploadThing
    // The URL from UploadThing should be stored as-is
    const publicUrl = this.getPublicUrl(filePath);
    return { url: publicUrl, fileIdentifier: filePath };
  }

  async delete(fileIdentifier: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([fileIdentifier]);

    if (error) {
      throw new Error(`Failed to delete file from Supabase: ${error.message}`);
    }
  }

  getPublicUrl(fileIdentifier: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileIdentifier);

    return data.publicUrl;
  }
}

