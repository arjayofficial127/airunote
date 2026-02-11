/**
 * Notification domain entity
 */
export class Notification {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly title: string,
    public readonly message: string,
    public readonly relatedEntityType: string | null,
    public readonly relatedEntityId: string | null,
    public readonly isRead: boolean,
    public readonly readAt: Date | null,
    public readonly createdAt: Date
  ) {}
}

