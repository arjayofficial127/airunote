import { injectable } from 'tsyringe';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { postsTable } from '../db/drizzle/schema';
import { IPostRepository } from '../../application/interfaces/IPostRepository';
import { Post } from '../../domain/entities/Post';
import { assertMetadataOnly, warnHeavyContentList } from '../../domain/utils/loadGuards';

@injectable()
export class PostRepository implements IPostRepository {
  async create(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post> {
    const now = new Date();
    const [created] = await db
      .insert(postsTable)
      .values({
        orgId: post.orgId,
        authorUserId: post.authorUserId,
        title: post.title,
        body: post.body,
        isPublished: post.isPublished,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return new Post(
      created.id,
      created.orgId,
      created.authorUserId,
      created.title,
      created.body,
      created.isPublished,
      created.createdAt,
      created.updatedAt,
      created.objectKey ?? null,
      created.previewObjectKey ?? null,
      created.payloadSize ?? null,
      created.payloadHash ?? null,
    );
  }

  async findById(id: string): Promise<Post | null> {
    const [post] = await db
      .select({
        id: postsTable.id,
        orgId: postsTable.orgId,
        authorUserId: postsTable.authorUserId,
        title: postsTable.title,
        body: postsTable.body,
        isPublished: postsTable.isPublished,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        objectKey: postsTable.objectKey,
        previewObjectKey: postsTable.previewObjectKey,
        payloadSize: postsTable.payloadSize,
        payloadHash: postsTable.payloadHash,
      })
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1);

    if (!post) return null;

    return new Post(
      post.id,
      post.orgId,
      post.authorUserId,
      post.title,
      post.body,
      post.isPublished,
      post.createdAt,
      post.updatedAt,
      post.objectKey ?? null,
      post.previewObjectKey ?? null,
      post.payloadSize ?? null,
      post.payloadHash ?? null,
    );
  }

  async findByOrgId(orgId: string, limit: number = 50, offset: number = 0, opts?: { includeContent?: boolean }): Promise<Post[]> {
    const includeContent = opts?.includeContent !== false; // default true: preserve existing behavior
    if (!includeContent) {
      // TODO Phase 4: object storage reads; partial payload streaming; preview fetch paths.
      const rows = await db
        .select({
          id: postsTable.id,
          orgId: postsTable.orgId,
          authorUserId: postsTable.authorUserId,
          title: postsTable.title,
          isPublished: postsTable.isPublished,
          createdAt: postsTable.createdAt,
          updatedAt: postsTable.updatedAt,
          objectKey: postsTable.objectKey,
          previewObjectKey: postsTable.previewObjectKey,
          payloadSize: postsTable.payloadSize,
          payloadHash: postsTable.payloadHash,
        })
        .from(postsTable)
        .where(eq(postsTable.orgId, orgId))
        .orderBy(desc(postsTable.createdAt))
        .limit(limit)
        .offset(offset);
      const result = rows.map(
        (p) =>
          new Post(
            p.id,
            p.orgId,
            p.authorUserId,
            p.title,
            '', // metadata-only: no body
            p.isPublished,
            p.createdAt,
            p.updatedAt,
            p.objectKey ?? null,
            p.previewObjectKey ?? null,
            p.payloadSize ?? null,
            p.payloadHash ?? null,
          )
      );
      assertMetadataOnly('Post', 'findByOrgId', result, { heavyFields: ['body'] });
      return result;
    }
    // Explicit select to avoid selecting non-existent Phase 4 columns before migration is run
    const posts = await db
      .select({
        id: postsTable.id,
        orgId: postsTable.orgId,
        authorUserId: postsTable.authorUserId,
        title: postsTable.title,
        body: postsTable.body,
        isPublished: postsTable.isPublished,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        objectKey: postsTable.objectKey,
        previewObjectKey: postsTable.previewObjectKey,
        payloadSize: postsTable.payloadSize,
        payloadHash: postsTable.payloadHash,
      })
      .from(postsTable)
      .where(eq(postsTable.orgId, orgId))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const result = posts.map(
      (p) =>
        new Post(
          p.id,
          p.orgId,
          p.authorUserId,
          p.title,
          p.body,
          p.isPublished,
          p.createdAt,
          p.updatedAt,
          p.objectKey ?? null,
          p.previewObjectKey ?? null,
          p.payloadSize ?? null,
          p.payloadHash ?? null,
        )
    );
    warnHeavyContentList('Post', 'findByOrgId', result.length);
    return result;
  }

  async countByOrgId(orgId: string): Promise<number> {
    const result = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.orgId, orgId));

    return result.length;
  }

  async countByOrgIdAndAuthor(orgId: string, authorUserId: string): Promise<number> {
    const result = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.orgId, orgId), eq(postsTable.authorUserId, authorUserId)));

    return result.length;
  }

  async update(id: string, updates: Partial<Post>): Promise<Post> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.body !== undefined) updateData.body = updates.body;
    if (updates.isPublished !== undefined) updateData.isPublished = updates.isPublished;

    const [updated] = await db
      .update(postsTable)
      .set(updateData)
      .where(eq(postsTable.id, id))
      .returning();

    return new Post(
      updated.id,
      updated.orgId,
      updated.authorUserId,
      updated.title,
      updated.body,
      updated.isPublished,
      updated.createdAt,
      updated.updatedAt,
      updated.objectKey ?? null,
      updated.previewObjectKey ?? null,
      updated.payloadSize ?? null,
      updated.payloadHash ?? null,
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(postsTable).where(eq(postsTable.id, id));
  }
}

