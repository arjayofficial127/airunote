import { injectable } from 'tsyringe';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { notificationsTable } from '../db/drizzle/schema';
import { INotificationRepository } from '../../application/interfaces/INotificationRepository';
import { Notification } from '../../domain/entities/Notification';

@injectable()
export class NotificationRepository implements INotificationRepository {
  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const [created] = await db
      .insert(notificationsTable)
      .values({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedEntityType: notification.relatedEntityType,
        relatedEntityId: notification.relatedEntityId,
        isRead: notification.isRead,
        readAt: notification.readAt,
      })
      .returning();

    return new Notification(
      created.id,
      created.userId,
      created.type,
      created.title,
      created.message,
      created.relatedEntityType,
      created.relatedEntityId,
      created.isRead || false,
      created.readAt,
      created.createdAt
    );
  }

  async findById(id: string): Promise<Notification | null> {
    const [notification] = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id))
      .limit(1);

    if (!notification) return null;

    return new Notification(
      notification.id,
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      notification.relatedEntityType,
      notification.relatedEntityId,
      notification.isRead || false,
      notification.readAt,
      notification.createdAt
    );
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ): Promise<Notification[]> {
    const conditions = [eq(notificationsTable.userId, userId)];
    if (options?.unreadOnly) {
      conditions.push(eq(notificationsTable.isRead, false));
    }

    let query = db
      .select()
      .from(notificationsTable)
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as any;
    }

    const notifications = await query;

    return notifications.map(
      (n) =>
        new Notification(
          n.id,
          n.userId,
          n.type,
          n.title,
          n.message,
          n.relatedEntityType,
          n.relatedEntityId,
          n.isRead || false,
          n.readAt,
          n.createdAt
        )
    );
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

    return result?.count || 0;
  }

  async markAsRead(id: string): Promise<Notification> {
    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notificationsTable.id, id))
      .returning();

    return new Notification(
      updated.id,
      updated.userId,
      updated.type,
      updated.title,
      updated.message,
      updated.relatedEntityType,
      updated.relatedEntityId,
      updated.isRead || false,
      updated.readAt,
      updated.createdAt
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db
      .update(notificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  }

  async delete(id: string): Promise<void> {
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  }

  async deleteOld(userId: string, olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          lt(notificationsTable.createdAt, cutoffDate)
        )
      )
      .returning();

    return result.length;
  }
}

