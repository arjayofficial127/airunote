export interface IWebhookEventRepository {
  create(eventKey: string): Promise<boolean>;
}