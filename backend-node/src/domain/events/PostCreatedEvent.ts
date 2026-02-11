import { IDomainEvent } from '../../core/events/EventBus';

export class PostCreatedEvent implements IDomainEvent {
  readonly type = 'PostCreated';
  readonly occurredOn = new Date();

  constructor(public readonly payload: { postId: string; orgId: string; authorUserId: string }) {}
}

