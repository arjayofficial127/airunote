import { Comment } from '../../domain/entities/Comment';

export interface ICommentRepository {
  create(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment>;
  findByPostId(postId: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  update(id: string, updates: Partial<Comment>): Promise<Comment>;
  delete(id: string): Promise<void>;
}

