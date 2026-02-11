import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../core/errors/AppError';
import { IPostRepository } from '../interfaces/IPostRepository';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { IAttachmentUseCase } from '../use-cases/AttachmentUseCase';
import { CreatePostInput, UpdatePostInput } from '../dtos/post.dto';
import { CreateAttachmentDto } from '../dtos/attachment.dto';
import { TYPES } from '../../core/di/types';
import { Post } from '../../domain/entities/Post';

export interface IPostUseCase {
  create(
    orgId: string,
    authorUserId: string,
    input: CreatePostInput
  ): Promise<Result<Post, Error>>;
  update(
    postId: string,
    userId: string,
    orgId: string,
    input: UpdatePostInput
  ): Promise<Result<Post, Error>>;
  delete(
    postId: string,
    userId: string,
    orgId: string
  ): Promise<Result<void, Error>>;
  getById(postId: string, orgId: string): Promise<Result<Post, Error>>;
  listByOrg(orgId: string, limit?: number, offset?: number): Promise<Result<Post[], Error>>;
}

@injectable()
export class PostUseCase implements IPostUseCase {
  constructor(
    @inject(TYPES.IPostRepository) private postRepository: IPostRepository,
    @inject(TYPES.IOrgRepository) private orgRepository: IOrgRepository,
    @inject(TYPES.IAttachmentUseCase) private attachmentUseCase: IAttachmentUseCase
  ) {}

  async create(
    orgId: string,
    authorUserId: string,
    input: CreatePostInput
  ): Promise<Result<Post, Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Check 3-post limit
    const postCount = await this.postRepository.countByOrgIdAndAuthor(
      orgId,
      authorUserId
    );

    if (postCount >= 3) {
      return Result.err(
        new ValidationError(
          'Maximum 3 posts allowed per user per organization'
        )
      );
    }

    const post = await this.postRepository.create({
      orgId,
      authorUserId,
      title: input.title,
      body: input.body,
      isPublished: input.isPublished ?? true,
      objectKey: null,
      previewObjectKey: null,
      payloadSize: null,
      payloadHash: null,
    });

    // Create attachments if provided
    if (input.attachments && input.attachments.length > 0) {
      const attachmentDtos: CreateAttachmentDto[] = input.attachments.map((att) => ({
        url: att.url,
        fileName: att.fileName ?? undefined,
        mimeType: att.mimeType ?? undefined,
        sizeBytes: att.sizeBytes ?? undefined,
        type: att.type || 'file',
        label: undefined,
        order: 0,
      }));

      const attachmentsResult = await this.attachmentUseCase.createMany(
        orgId,
        post.id,
        authorUserId,
        attachmentDtos
      );

      if (attachmentsResult.isErr()) {
        // Log error but don't fail post creation
        console.error('Failed to create attachments:', attachmentsResult.unwrap());
      }
    }

    return Result.ok(post);
  }

  async update(
    postId: string,
    userId: string,
    orgId: string,
    input: UpdatePostInput
  ): Promise<Result<Post, Error>> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    if (post.orgId !== orgId) {
      return Result.err(new NotFoundError('Post', postId));
    }

    // Only author can update
    if (post.authorUserId !== userId) {
      return Result.err(
        new ForbiddenError('You can only update your own posts')
      );
    }

    const updated = await this.postRepository.update(postId, input);

    return Result.ok(updated);
  }

  async delete(
    postId: string,
    userId: string,
    orgId: string
  ): Promise<Result<void, Error>> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    if (post.orgId !== orgId) {
      return Result.err(new NotFoundError('Post', postId));
    }

    // Only author can delete
    if (post.authorUserId !== userId) {
      return Result.err(
        new ForbiddenError('You can only delete your own posts')
      );
    }

    await this.postRepository.delete(postId);

    return Result.ok(undefined);
  }

  async getById(
    postId: string,
    orgId: string
  ): Promise<Result<Post, Error>> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    if (post.orgId !== orgId) {
      return Result.err(new NotFoundError('Post', postId));
    }

    return Result.ok(post);
  }

  async listByOrg(
    orgId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Result<Post[], Error>> {
    const posts = await this.postRepository.findByOrgId(orgId, limit, offset);

    return Result.ok(posts);
  }
}

