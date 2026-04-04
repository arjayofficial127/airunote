export interface CreateBillingIntentData {
  orgId: string;
  createdByUserId: string;
  userEmail: string;
  targetPlan: string;
  source: string;
}

export type BillingIntentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface UpdateBillingIntentCorrelationData {
  subscriptionId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  lastEventName?: string | null;
  failureReason?: string | null;
}

export interface BillingIntentRecord {
  id: string;
  orgId: string;
  createdByUserId: string;
  userEmail: string;
  targetPlan: string;
  source: string;
  status: BillingIntentStatus;
  lemonSubscriptionId: string | null;
  lemonOrderId: string | null;
  lemonCustomerId: string | null;
  lemonCustomerEmail: string | null;
  lastEventName: string | null;
  failureReason: string | null;
  completedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBillingIntentRepository {
  createPending(data: CreateBillingIntentData): Promise<BillingIntentRecord>;
  findById(id: string): Promise<BillingIntentRecord | null>;
  findBySubscriptionId(subscriptionId: string): Promise<BillingIntentRecord | null>;
  findByOrderId(orderId: string): Promise<BillingIntentRecord | null>;
  findByCustomerId(customerId: string): Promise<BillingIntentRecord | null>;
  findPendingByOrgUserPlan(orgId: string, createdByUserId: string, targetPlan: string): Promise<BillingIntentRecord[]>;
  findRecentPendingByEmail(email: string, createdAfter: Date): Promise<BillingIntentRecord[]>;
  recordEvent(id: string, data: UpdateBillingIntentCorrelationData): Promise<void>;
  resolve(id: string, status: Exclude<BillingIntentStatus, 'pending'>, data: UpdateBillingIntentCorrelationData): Promise<void>;
}