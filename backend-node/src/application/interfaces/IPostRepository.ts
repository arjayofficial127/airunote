import { Post } from '../../domain/entities/Post';
import type { HeavyContentLoadOptions } from '../../domain/utils/loadGuards';

export interface IPostRepository {
  create(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post>;
  findById(id: string): Promise<Post | null>;
  /** When opts.includeContent === false, returns posts with metadata only (no body). Default: includeContent true. */
  findByOrgId(orgId: string, limit?: number, offset?: number, opts?: HeavyContentLoadOptions): Promise<Post[]>;
  countByOrgId(orgId: string): Promise<number>;
  countByOrgIdAndAuthor(orgId: string, authorUserId: string): Promise<number>;
  update(id: string, updates: Partial<Post>): Promise<Post>;
  delete(id: string): Promise<void>;
}

