/**
 * Simple in-memory event bus for MVP
 * TODO: Replace with Redis/pub-sub for distributed systems
 */

import { ILogger } from '../logger/Logger';

export interface IDomainEvent {
  readonly type: string;
  readonly occurredOn: Date;
  readonly payload: unknown;
}

export interface IEventHandler<T extends IDomainEvent> {
  handle(event: T): Promise<void> | void;
}

export class InMemoryEventBus {
  private handlers: Map<string, IEventHandler<IDomainEvent>[]> = new Map();

  constructor(private logger: ILogger) {}

  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as IEventHandler<IDomainEvent>);
  }

  async publish(event: IDomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    
    this.logger.debug(`Publishing event: ${event.type}`, event.payload);

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler.handle(event);
        } catch (error) {
          this.logger.error(
            `Error handling event ${event.type}`,
            error as Error
          );
        }
      })
    );
  }
}

