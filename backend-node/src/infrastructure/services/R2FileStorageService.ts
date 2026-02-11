import { injectable } from 'tsyringe';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IFileStorageService } from '../../application/interfaces/IFileStorageService';
import * as dotenv from 'dotenv';

dotenv.config();

@injectable()
export class R2FileStorageService implements IFileStorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicBaseUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || '';
    this.publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || '';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set');
    }

    if (!this.bucketName) {
      throw new Error('R2_BUCKET_NAME must be set');
    }

    this.s3Client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
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
    // This method accepts metadata and constructs the file key
    // TODO: Implement direct buffer upload with presigned URLs for future backend-side uploads
    
    const fileKey = params.storageKey || `orgs/${params.orgId}/posts/${params.postId}/${params.fileName}`;
    const fileIdentifier = fileKey;

    // If buffer is provided, upload directly (future feature)
    if (params.buffer) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: params.buffer,
        ContentType: params.mimeType,
      });

      await this.s3Client.send(command);
    }

    // Return public URL
    const publicUrl = this.getPublicUrl(fileKey);
    return { url: publicUrl, fileIdentifier: fileKey };
  }

  async delete(fileIdentifier: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileIdentifier,
    });

    try {
      await this.s3Client.send(command);
    } catch (error: any) {
      throw new Error(`Failed to delete file from R2: ${error.message}`);
    }
  }

  getPublicUrl(fileIdentifier: string): string {
    if (!this.publicBaseUrl) {
      throw new Error('R2_PUBLIC_BASE_URL must be set for public file access');
    }
    return `${this.publicBaseUrl}/${fileIdentifier}`;
  }
}

