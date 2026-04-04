import { Org } from '../../domain/entities/Org';

export interface UpdateOrgSubscriptionData {
  plan: string;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: Date | null;
}

export interface IOrgRepository {
  create(org: Omit<Org, 'id' | 'createdAt'>): Promise<Org>;
  findById(id: string): Promise<Org | null>;
  findBySlug(slug: string): Promise<Org | null>;
  findBySubscriptionId(subscriptionId: string): Promise<Org | null>;
  findByUserId(userId: string): Promise<Org[]>;
  findAll(): Promise<Org[]>;
  update(id: string, updates: Partial<Org>): Promise<Org>;
  updateOrgSubscription(orgId: string, data: UpdateOrgSubscriptionData): Promise<void>;
  delete(id: string): Promise<void>;
}

