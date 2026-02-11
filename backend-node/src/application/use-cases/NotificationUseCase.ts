import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import { NotFoundError } from '../../core/errors/AppError';
import { INotificationRepository } from '../interfaces/INotificationRepository';
import { Notification } from '../../domain/entities/Notification';
import { TYPES } from '../../core/di/types';

export interface INotificationUseCase {
  list(userId: string, options?: { unreadOnly?: boolean; limit?: number; offset?: number }): Promise<Result<Notification[], Error>>;
  countUnread(userId: string): Promise<Result<number, Error>>;
  markAsRead(id: string, userId: string): Promise<Result<Notification, Error>>;
  markAllAsRead(userId: string): Promise<Result<void, Error>>;
  delete(id: string, userId: string): Promise<Result<void, Error>>;
  deleteOld(userId: string, olderThanDays: number): Promise<Result<number, Error>>;
}

@injectable()
export class NotificationUseCase implements INotificationUseCase {
  constructor(
    @inject(TYPES.INotificationRepository) private notificationRepository: INotificationRepository
  ) {}

  async list(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ): Promise<Result<Notification[], Error>> {
    const notifications = await this.notificationRepository.findByUserId(userId, options);
    return Result.ok(notifications);
  }

  async countUnread(userId: string): Promise<Result<number, Error>> {
    const count = await this.notificationRepository.countUnreadByUserId(userId);
    return Result.ok(count);
  }

  async markAsRead(id: string, userId: string): Promise<Result<Notification, Error>> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      return Result.err(new NotFoundError('Notification', id));
    }

    if (notification.userId !== userId) {
      return Result.err(new NotFoundError('Notification', id));
    }

    const updated = await this.notificationRepository.markAsRead(id);
    return Result.ok(updated);
  }

  async markAllAsRead(userId: string): Promise<Result<void, Error>> {
    await this.notificationRepository.markAllAsRead(userId);
    return Result.ok(undefined);
  }

  async delete(id: string, userId: string): Promise<Result<void, Error>> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      return Result.err(new NotFoundError('Notification', id));
    }

    if (notification.userId !== userId) {
      return Result.err(new NotFoundError('Notification', id));
    }

    await this.notificationRepository.delete(id);
    return Result.ok(undefined);
  }

  async deleteOld(userId: string, olderThanDays: number): Promise<Result<number, Error>> {
    const count = await this.notificationRepository.deleteOld(userId, olderThanDays);
    return Result.ok(count);
  }
}

