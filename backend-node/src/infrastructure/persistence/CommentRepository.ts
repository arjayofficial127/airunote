import { injectable } from 'tsyringe';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { commentsTable } from '../db/drizzle/schema';
import { ICommentRepository } from '../../application/interfaces/ICommentRepository';
import { Comment } from '../../domain/entities/Comment';
import { warnHeavyContentList } from '../../domain/utils/loadGuards';

@injectable()
export class CommentRepository implements ICommentRepository {
  async create(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
    const [created] = await db
      .insert(commentsTable)
      .values({
        postId: comment.postId,
        authorUserId: comment.authorUserId,
        body: comment.body,
      })
      .returning();

    return new Comment(
      created.id,
      created.postId,
      created.authorUserId,
      created.body,
      created.createdAt,
      created.objectKey ?? null,
      created.previewObjectKey ?? null,
      created.payloadSize ?? null,
      created.payloadHash ?? null,
    );
  }

  async findByPostId(postId: string): Promise<Comment[]> {
    const comments = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));

    const result = comments.map(
      (c) =>
        new Comment(
          c.id,
          c.postId,
          c.authorUserId,
          c.body,
          c.createdAt,
          c.objectKey ?? null,
          c.previewObjectKey ?? null,
          c.payloadSize ?? null,
          c.payloadHash ?? null,
        )
    );
    warnHeavyContentList('Comment', 'findByPostId', result.length);
    return result;
  }

  async findById(id: string): Promise<Comment | null> {
    const [comment] = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);

    if (!comment) return null;

    return new Comment(
      comment.id,
      comment.postId,
      comment.authorUserId,
      comment.body,
      comment.createdAt,
      comment.objectKey ?? null,
      comment.previewObjectKey ?? null,
      comment.payloadSize ?? null,
      comment.payloadHash ?? null,
    );
  }

  async update(id: string, updates: Partial<Comment>): Promise<Comment> {
    const updateData: Record<string, unknown> = {};
    if (updates.body !== undefined) updateData.body = updates.body;

    const [updated] = await db
      .update(commentsTable)
      .set(updateData)
      .where(eq(commentsTable.id, id))
      .returning();

    return new Comment(
      updated.id,
      updated.postId,
      updated.authorUserId,
      updated.body,
      updated.createdAt,
      updated.objectKey ?? null,
      updated.previewObjectKey ?? null,
      updated.payloadSize ?? null,
      updated.payloadHash ?? null,
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(commentsTable).where(eq(commentsTable.id, id));
  }
}

