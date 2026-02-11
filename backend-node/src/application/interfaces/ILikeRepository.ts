import { PostLike } from '../../domain/entities/PostLike';

export interface ILikeRepository {
  create(like: Omit<PostLike, 'createdAt'>): Promise<PostLike>;
  findByPostId(postId: string): Promise<PostLike[]>;
  findByPostIdAndUserId(postId: string, userId: string): Promise<PostLike | null>;
  delete(postId: string, userId: string): Promise<void>;
  countByPostId(postId: string): Promise<number>;
}

