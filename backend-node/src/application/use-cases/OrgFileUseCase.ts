import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../core/errors/AppError';
import { IOrgFileRepository } from '../interfaces/IOrgFileRepository';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { IOrgUserRepository } from '../interfaces/IOrgUserRepository';
import { IFileStorageService } from '../interfaces/IFileStorageService';
import {
  CreateUploadTicketDto,
  CompleteUploadDto,
  UpdateVisibilityDto,
  ListFilesFiltersDto,
} from '../dtos/orgFile.dto';
import { TYPES } from '../../core/di/types';
import { OrgFile } from '../../domain/entities/OrgFile';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface IOrgFileUseCase {
  createUploadTicket(
    orgId: string,
    userId: string,
    dto: CreateUploadTicketDto
  ): Promise<Result<{ uploadPlan: { storageKey: string; url?: string } }, Error>>;
  completeUpload(
    orgId: string,
    userId: string,
    dto: CompleteUploadDto
  ): Promise<Result<OrgFile, Error>>;
  list(
    orgId: string,
    userId: string,
    filters?: ListFilesFiltersDto
  ): Promise<Result<OrgFile[], Error>>;
  get(orgId: string, userId: string, fileId: string): Promise<Result<OrgFile, Error>>;
  updateVisibility(
    orgId: string,
    userId: string,
    fileId: string,
    dto: UpdateVisibilityDto
  ): Promise<Result<OrgFile, Error>>;
  delete(orgId: string, userId: string, fileId: string): Promise<Result<void, Error>>;
  getPublicFile(code: string): Promise<Result<OrgFile, Error>>;
}

@injectable()
export class OrgFileUseCase implements IOrgFileUseCase {
  constructor(
    @inject(TYPES.IOrgFileRepository)
    private orgFileRepository: IOrgFileRepository,
    @inject(TYPES.IOrgRepository) private orgRepository: IOrgRepository,
    @inject(TYPES.IOrgUserRepository) private orgUserRepository: IOrgUserRepository,
    @inject(TYPES.IFileStorageService)
    private fileStorageService: IFileStorageService
  ) {}

  async createUploadTicket(
    orgId: string,
    userId: string,
    dto: CreateUploadTicketDto
  ): Promise<Result<{ uploadPlan: { storageKey: string; url?: string } }, Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Verify user is org member
    const orgUser = await this.orgUserRepository.findByOrgIdAndUserId(orgId, userId);
    if (!orgUser) {
      return Result.err(new ForbiddenError('User is not a member of this organization'));
    }

    // Generate storage key: orgs/{orgId}/files/{yyyy}/{mm}/{uuid}-{safeFilename}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fileId = uuidv4();
    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `orgs/${orgId}/files/${year}/${month}/${fileId}-${safeFileName}`;

    // For now, return storage key (Option 1: server-side upload)
    // TODO: If presigned URLs are supported, return presigned URL here
    return Result.ok({
      uploadPlan: {
        storageKey,
      },
    });
  }

  async completeUpload(
    orgId: string,
    userId: string,
    dto: CompleteUploadDto
  ): Promise<Result<OrgFile, Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Verify user is org member
    const orgUser = await this.orgUserRepository.findByOrgIdAndUserId(orgId, userId);
    if (!orgUser) {
      return Result.err(new ForbiddenError('User is not a member of this organization'));
    }

    // Determine storage provider from env
    const storageProvider = process.env.STORAGE_BACKEND || 'supabase';

    // Create file record
    const file = await this.orgFileRepository.create({
      orgId,
      ownerUserId: userId,
      storageProvider,
      storageKey: dto.storageKey,
      url: dto.url,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      checksum: dto.checksum || null,
      visibility: 'private', // Default to private
      objectKey: null,
      previewObjectKey: null,
      payloadSize: null,
      payloadHash: null,
    });

    return Result.ok(file);
  }

  async list(
    orgId: string,
    userId: string,
    filters?: ListFilesFiltersDto
  ): Promise<Result<OrgFile[], Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Verify user is org member
    const orgUser = await this.orgUserRepository.findByOrgIdAndUserId(orgId, userId);
    if (!orgUser) {
      return Result.err(new ForbiddenError('User is not a member of this organization'));
    }

    // Get files
    const files = await this.orgFileRepository.findByOrgId(orgId, userId, filters);

    // Filter by visibility rules
    const accessibleFiles = await Promise.all(
      files.map(async (file) => {
        if (file.visibility === 'public' || file.visibility === 'org') {
          return file;
        }
        if (file.visibility === 'private' && file.ownerUserId === userId) {
          return file;
        }
        if (file.visibility === 'users') {
          const userIds = await this.orgFileRepository.getUserAccessList(file.id);
          if (userIds.includes(userId) || file.ownerUserId === userId) {
            return file;
          }
          return null;
        }
        return null;
      })
    );

    const filtered = accessibleFiles.filter((f) => f !== null) as OrgFile[];

    return Result.ok(filtered);
  }

  async get(orgId: string, userId: string, fileId: string): Promise<Result<OrgFile, Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Get file
    const file = await this.orgFileRepository.findById(fileId);
    if (!file) {
      return Result.err(new NotFoundError('File', fileId));
    }

    // Verify file belongs to org
    if (file.orgId !== orgId) {
      return Result.err(new ForbiddenError('File does not belong to this organization'));
    }

    // Check access permissions
    const hasAccess = await this.checkFileAccess(file, userId);
    if (!hasAccess) {
      return Result.err(new ForbiddenError('You do not have access to this file'));
    }

    return Result.ok(file);
  }

  async updateVisibility(
    orgId: string,
    userId: string,
    fileId: string,
    dto: UpdateVisibilityDto
  ): Promise<Result<OrgFile, Error>> {
    // Get file
    const file = await this.orgFileRepository.findById(fileId);
    if (!file) {
      return Result.err(new NotFoundError('File', fileId));
    }

    // Verify file belongs to org
    if (file.orgId !== orgId) {
      return Result.err(new ForbiddenError('File does not belong to this organization'));
    }

    // Only owner can update visibility
    if (file.ownerUserId !== userId) {
      return Result.err(new ForbiddenError('Only the file owner can update visibility'));
    }

    // Validate users list if visibility is 'users'
    if (dto.visibility === 'users' && (!dto.userIds || dto.userIds.length === 0)) {
      return Result.err(
        new ValidationError('userIds must be provided when visibility is "users"')
      );
    }

    // Update visibility
    const updated = await this.orgFileRepository.update(fileId, {
      visibility: dto.visibility,
    } as Partial<OrgFile>);

    // Update user access list if visibility is 'users'
    if (dto.visibility === 'users' && dto.userIds) {
      // Get current user list
      const currentUserIds = await this.orgFileRepository.getUserAccessList(fileId);

      // Remove users not in new list
      for (const currentUserId of currentUserIds) {
        if (!dto.userIds.includes(currentUserId)) {
          await this.orgFileRepository.removeUserAccess(fileId, currentUserId);
        }
      }

      // Add new users
      for (const newUserId of dto.userIds) {
        if (!currentUserIds.includes(newUserId)) {
          await this.orgFileRepository.addUserAccess(fileId, newUserId);
        }
      }
    } else {
      // Clear user access if visibility changed from 'users'
      if (file.visibility === 'users') {
        const currentUserIds = await this.orgFileRepository.getUserAccessList(fileId);
        for (const currentUserId of currentUserIds) {
          await this.orgFileRepository.removeUserAccess(fileId, currentUserId);
        }
      }
    }

    return Result.ok(updated);
  }

  async delete(orgId: string, userId: string, fileId: string): Promise<Result<void, Error>> {
    // Get file
    const file = await this.orgFileRepository.findById(fileId);
    if (!file) {
      return Result.err(new NotFoundError('File', fileId));
    }

    // Verify file belongs to org
    if (file.orgId !== orgId) {
      return Result.err(new ForbiddenError('File does not belong to this organization'));
    }

    // Only owner can delete
    if (file.ownerUserId !== userId) {
      return Result.err(new ForbiddenError('Only the file owner can delete the file'));
    }

    // Delete from storage (best-effort)
    try {
      await this.fileStorageService.delete(file.storageKey);
    } catch (error) {
      // Log but don't fail - file might already be deleted
      console.error(`Failed to delete file from storage: ${file.storageKey}`, error);
    }

    // Delete from database
    await this.orgFileRepository.delete(fileId);

    return Result.ok(undefined);
  }

  async getPublicFile(code: string): Promise<Result<OrgFile, Error>> {
    // Find link by code
    const link = await this.orgFileRepository.findLinkByCode(code);
    if (!link) {
      return Result.err(new NotFoundError('File link', code));
    }

    // Check if link is revoked
    if (link.revokedAt) {
      return Result.err(new ForbiddenError('This file link has been revoked'));
    }

    // Get file
    const file = await this.orgFileRepository.findById(link.fileId);
    if (!file) {
      return Result.err(new NotFoundError('File', link.fileId));
    }

    // Only public files can be accessed via link
    if (file.visibility !== 'public') {
      return Result.err(new ForbiddenError('This file is not publicly accessible'));
    }

    return Result.ok(file);
  }

  private async checkFileAccess(file: OrgFile, userId: string): Promise<boolean> {
    if (file.visibility === 'public' || file.visibility === 'org') {
      return true;
    }
    if (file.visibility === 'private' && file.ownerUserId === userId) {
      return true;
    }
    if (file.visibility === 'users') {
      const userIds = await this.orgFileRepository.getUserAccessList(file.id);
      return userIds.includes(userId) || file.ownerUserId === userId;
    }
    return false;
  }
}
