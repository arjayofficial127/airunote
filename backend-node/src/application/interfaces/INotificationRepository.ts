import { Notification } from '../../domain/entities/Notification';

export interface INotificationRepository {
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: { unreadOnly?: boolean; limit?: number; offset?: number }): Promise<Notification[]>;
  countUnreadByUserId(userId: string): Promise<number>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteOld(userId: string, olderThanDays: number): Promise<number>; // Returns count of deleted notifications
}

