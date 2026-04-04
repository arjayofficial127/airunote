import { injectable } from 'tsyringe';
import { IWebhookEventRepository } from '../../application/interfaces/IWebhookEventRepository';
import { db } from '../db/drizzle/client';
import { webhookEventsTable } from '../db/drizzle/schema';

@injectable()
export class WebhookEventRepository implements IWebhookEventRepository {
  async create(eventKey: string): Promise<boolean> {
    try {
      await db.insert(webhookEventsTable).values({ id: eventKey });
      return true;
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && 'code' in error
        && (error as { code?: string }).code === '23505'
      ) {
        return false;
      }

      throw error;
    }
  }
}