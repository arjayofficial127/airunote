import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { attachmentsTable } from '../db/drizzle/schema';
import { IAttachmentRepository } from '../../application/interfaces/IAttachmentRepository';
import { Attachment } from '../../domain/entities/Attachment';

@injectable()
export class AttachmentRepository implements IAttachmentRepository {
  async create(attachment: Omit<Attachment, 'id' | 'createdAt'>): Promise<Attachment> {
    const [created] = await db
      .insert(attachmentsTable)
      .values({
        orgId: attachment.orgId,
        postId: attachment.postId,
        authorUserId: attachment.authorUserId,
        type: attachment.type,
        url: attachment.url,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        label: attachment.label,
        order: attachment.order,
      })
      .returning();

    return new Attachment(
      created.id,
      created.orgId,
      created.postId,
      created.authorUserId,
      created.type as 'image' | 'file' | 'video' | 'link',
      created.url,
      created.fileName,
      created.mimeType,
      created.sizeBytes ? Number(created.sizeBytes) : null,
      created.label,
      created.order,
      created.createdAt
    );
  }

  async findById(id: string): Promise<Attachment | null> {
    const [attachment] = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.id, id))
      .limit(1);

    if (!attachment) return null;

    return new Attachment(
      attachment.id,
      attachment.orgId,
      attachment.postId,
      attachment.authorUserId,
      attachment.type as 'image' | 'file' | 'video' | 'link',
      attachment.url,
      attachment.fileName,
      attachment.mimeType,
      attachment.sizeBytes ? Number(attachment.sizeBytes) : null,
      attachment.label,
      attachment.order,
      attachment.createdAt
    );
  }

  async findByPostId(postId: string): Promise<Attachment[]> {
    const attachments = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.postId, postId));

    return attachments.map(
      (a) =>
        new Attachment(
          a.id,
          a.orgId,
          a.postId,
          a.authorUserId,
          a.type as 'image' | 'file' | 'video' | 'link',
          a.url,
          a.fileName,
          a.mimeType,
          a.sizeBytes ? Number(a.sizeBytes) : null,
          a.label,
          a.order,
          a.createdAt
        )
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id));
  }

  async countByPostId(postId: string): Promise<number> {
    const result = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.postId, postId));

    return result.length;
  }
}

