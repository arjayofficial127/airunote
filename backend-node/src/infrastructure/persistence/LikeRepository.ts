import { injectable } from 'tsyringe';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { postLikesTable } from '../db/drizzle/schema';
import { ILikeRepository } from '../../application/interfaces/ILikeRepository';
import { PostLike } from '../../domain/entities/PostLike';

@injectable()
export class LikeRepository implements ILikeRepository {
  async create(like: Omit<PostLike, 'createdAt'>): Promise<PostLike> {
    const [created] = await db
      .insert(postLikesTable)
      .values({
        postId: like.postId,
        userId: like.userId,
      })
      .returning();

    return new PostLike(
      created.postId,
      created.userId,
      created.createdAt
    );
  }

  async findByPostId(postId: string): Promise<PostLike[]> {
    const likes = await db
      .select()
      .from(postLikesTable)
      .where(eq(postLikesTable.postId, postId));

    return likes.map(
      (l) =>
        new PostLike(
          l.postId,
          l.userId,
          l.createdAt
        )
    );
  }

  async findByPostIdAndUserId(postId: string, userId: string): Promise<PostLike | null> {
    const [like] = await db
      .select()
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)))
      .limit(1);

    if (!like) return null;

    return new PostLike(
      like.postId,
      like.userId,
      like.createdAt
    );
  }

  async delete(postId: string, userId: string): Promise<void> {
    await db
      .delete(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));
  }

  async countByPostId(postId: string): Promise<number> {
    const likes = await db
      .select()
      .from(postLikesTable)
      .where(eq(postLikesTable.postId, postId));

    return likes.length;
  }
}

