import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import { NotFoundError } from '../../core/errors/AppError';
import { ILikeRepository } from '../interfaces/ILikeRepository';
import { IPostRepository } from '../interfaces/IPostRepository';
import { TYPES } from '../../core/di/types';

export interface ILikeUseCase {
  toggleLike(postId: string, userId: string): Promise<Result<{ liked: boolean }, Error>>;
  getLikeCount(postId: string): Promise<Result<number, Error>>;
  hasUserLiked(postId: string, userId: string): Promise<Result<boolean, Error>>;
}

@injectable()
export class LikeUseCase implements ILikeUseCase {
  constructor(
    @inject(TYPES.ILikeRepository) private likeRepository: ILikeRepository,
    @inject(TYPES.IPostRepository) private postRepository: IPostRepository
  ) {}

  async toggleLike(
    postId: string,
    userId: string
  ): Promise<Result<{ liked: boolean }, Error>> {
    // Verify post exists
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    const existingLike = await this.likeRepository.findByPostIdAndUserId(
      postId,
      userId
    );

    if (existingLike) {
      // Unlike
      await this.likeRepository.delete(postId, userId);
      return Result.ok({ liked: false });
    } else {
      // Like
      const like = await this.likeRepository.create({
        postId,
        userId,
      });
      return Result.ok({ liked: true });
    }
  }

  async getLikeCount(postId: string): Promise<Result<number, Error>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    const count = await this.likeRepository.countByPostId(postId);

    return Result.ok(count);
  }

  async hasUserLiked(
    postId: string,
    userId: string
  ): Promise<Result<boolean, Error>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.err(new NotFoundError('Post', postId));
    }

    const like = await this.likeRepository.findByPostIdAndUserId(postId, userId);

    return Result.ok(!!like);
  }
}

