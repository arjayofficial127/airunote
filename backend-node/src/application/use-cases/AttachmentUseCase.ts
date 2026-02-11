import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../core/errors/AppError';
import { IAttachmentRepository } from '../interfaces/IAttachmentRepository';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { IPostRepository } from '../interfaces/IPostRepository';
import { IFileStorageService } from '../interfaces/IFileStorageService';
import { CreateAttachmentDto } from '../dtos/attachment.dto';
import { TYPES } from '../../core/di/types';
import { Attachment } from '../../domain/entities/Attachment';

export interface IAttachmentUseCase {
  create(
    orgId: string,
    postId: string,
    userId: string,
    dto: CreateAttachmentDto
  ): Promise<Result<Attachment, Error>>;
  createMany(
    orgId: string,
    postId: string,
    userId: string,
    dtos: CreateAttachmentDto[]
  ): Promise<Result<Attachment[], Error>>;
  findByPostId(postId: string): Promise<Result<Attachment[], Error>>;
  delete(
    attachmentId: string,
    userId: string,
    orgId: string
  ): Promise<Result<void, Error>>;
}

@injectable()
export class AttachmentUseCase implements IAttachmentUseCase {
  constructor(
    @inject(TYPES.IAttachmentRepository)
    private attachmentRepository: IAttachmentRepository,
    @inject(TYPES.IOrgRepository) private orgRepository: IOrgRepository,
    @inject(TYPES.IPostRepository) private postRepository: IPostRepository,
    @inject(TYPES.IFileStorageService)
    private fileStorageService: IFileStorageService
  ) {}

  async create(
    orgId: string,
    postId: string,
    userId: string,
    dto: CreateAttachmentDto
  ): Promise<Result<Attachment, Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Verify post exists and belongs to org
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    if (post.orgId !== orgId) {
      return Result.err(
        new ValidationError('Post does not belong to the specified organization')
      );
    }

    // TODO: Check user is Member/Admin of org (permissions check)
    // For MVP, we'll allow if user is post author or org member

    // Determine file type from mimeType if not provided
    let attachmentType = dto.type;
    if (!attachmentType && dto.mimeType) {
      if (dto.mimeType.startsWith('image/')) {
        attachmentType = 'image';
      } else if (dto.mimeType.startsWith('video/')) {
        attachmentType = 'video';
      } else {
        attachmentType = 'file';
      }
    }

    const attachment = await this.attachmentRepository.create({
      orgId,
      postId,
      authorUserId: userId,
      type: attachmentType,
      url: dto.url,
      fileName: dto.fileName || null,
      mimeType: dto.mimeType || null,
      sizeBytes: dto.sizeBytes || null,
      label: dto.label || null,
      order: dto.order || 0,
    });

    return Result.ok(attachment);
  }

  async createMany(
    orgId: string,
    postId: string,
    userId: string,
    dtos: CreateAttachmentDto[]
  ): Promise<Result<Attachment[], Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Verify post exists and belongs to org
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    if (post.orgId !== orgId) {
      return Result.err(
        new ValidationError('Post does not belong to the specified organization')
      );
    }

    // TODO: Check user is Member/Admin of org (permissions check)

    // Validate file count (max 5 per post)
    const existingCount = await this.attachmentRepository.countByPostId(postId);
    if (existingCount + dtos.length > 5) {
      return Result.err(
        new ValidationError('Maximum 5 attachments allowed per post')
      );
    }

    const attachments: Attachment[] = [];

    for (const dto of dtos) {
      // Determine file type from mimeType if not provided
      let attachmentType = dto.type;
      if (!attachmentType && dto.mimeType) {
        if (dto.mimeType.startsWith('image/')) {
          attachmentType = 'image';
        } else if (dto.mimeType.startsWith('video/')) {
          attachmentType = 'video';
        } else {
          attachmentType = 'file';
        }
      }

      const attachment = await this.attachmentRepository.create({
        orgId,
        postId,
        authorUserId: userId,
        type: attachmentType,
        url: dto.url,
        fileName: dto.fileName || null,
        mimeType: dto.mimeType || null,
        sizeBytes: dto.sizeBytes || null,
        label: dto.label || null,
        order: dto.order || 0,
      });

      attachments.push(attachment);
    }

    return Result.ok(attachments);
  }

  async findByPostId(postId: string): Promise<Result<Attachment[], Error>> {
    const attachments = await this.attachmentRepository.findByPostId(postId);
    return Result.ok(attachments);
  }

  async delete(
    attachmentId: string,
    userId: string,
    orgId: string
  ): Promise<Result<void, Error>> {
    // Get attachment
    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (!attachment) {
      return Result.err(new NotFoundError('Attachment', attachmentId));
    }

    // Verify attachment belongs to org
    if (attachment.orgId !== orgId) {
      return Result.err(
        new ValidationError('Attachment does not belong to the specified organization')
      );
    }

    // TODO: Check permissions - user must be post author or org admin
    // For MVP, allow if user is attachment author
    if (attachment.authorUserId !== userId) {
      // TODO: Check if user is org admin
      return Result.err(
        new ForbiddenError('You can only delete your own attachments')
      );
    }

    // Extract file identifier from URL
    // For MVP, we'll try to extract from URL or use a pattern
    // TODO: Store fileIdentifier in DB for reliable deletion
    try {
      // Try to extract path from URL
      const urlObj = new URL(attachment.url);
      const fileIdentifier = urlObj.pathname.startsWith('/')
        ? urlObj.pathname.substring(1)
        : urlObj.pathname;

      // Delete from storage
      await this.fileStorageService.delete(fileIdentifier);
    } catch (error) {
      // If deletion from storage fails, log but continue with DB deletion
      // TODO: Add proper logging
      console.warn('Failed to delete file from storage:', error);
    }

    // Delete from database
    await this.attachmentRepository.delete(attachmentId);

    return Result.ok(undefined);
  }
}

