import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import { NotFoundError, ForbiddenError } from '../../core/errors/AppError';
import { ICommentRepository } from '../interfaces/ICommentRepository';
import { IPostRepository } from '../interfaces/IPostRepository';
import { CreateCommentInput, UpdateCommentInput } from '../dtos/comment.dto';
import { Comment } from '../../domain/entities/Comment';
import { TYPES } from '../../core/di/types';

export interface ICommentUseCase {
  create(
    postId: string,
    authorUserId: string,
    input: CreateCommentInput
  ): Promise<Result<Comment, Error>>;
  update(
    commentId: string,
    userId: string,
    input: UpdateCommentInput
  ): Promise<Result<Comment, Error>>;
  delete(commentId: string, userId: string): Promise<Result<void, Error>>;
  findByPostId(postId: string): Promise<Result<Comment[], Error>>;
}

@injectable()
export class CommentUseCase implements ICommentUseCase {
  constructor(
    @inject(TYPES.ICommentRepository) private commentRepository: ICommentRepository,
    @inject(TYPES.IPostRepository) private postRepository: IPostRepository
  ) {}

  async create(
    postId: string,
    authorUserId: string,
    input: CreateCommentInput
  ): Promise<Result<Comment, Error>> {
    // Verify post exists
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    const comment = await this.commentRepository.create({
      postId,
      authorUserId,
      body: input.body,
      objectKey: null,
      previewObjectKey: null,
      payloadSize: null,
      payloadHash: null,
    });

    return Result.ok(comment);
  }

  async update(
    commentId: string,
    userId: string,
    input: UpdateCommentInput
  ): Promise<Result<Comment, Error>> {
    const comment = await this.commentRepository.findById(commentId);

    if (!comment) {
      return Result.err(new NotFoundError('Comment', commentId));
    }

    if (comment.authorUserId !== userId) {
      return Result.err(
        new ForbiddenError('You can only update your own comments')
      );
    }

    const updated = await this.commentRepository.update(commentId, input);

    return Result.ok(updated);
  }

  async delete(
    commentId: string,
    userId: string
  ): Promise<Result<void, Error>> {
    const comment = await this.commentRepository.findById(commentId);

    if (!comment) {
      return Result.err(new NotFoundError('Comment', commentId));
    }

    if (comment.authorUserId !== userId) {
      return Result.err(
        new ForbiddenError('You can only delete your own comments')
      );
    }

    await this.commentRepository.delete(commentId);

    return Result.ok(undefined);
  }

  async findByPostId(postId: string): Promise<Result<Comment[], Error>> {
    const comments = await this.commentRepository.findByPostId(postId);

    return Result.ok(comments);
  }
}

