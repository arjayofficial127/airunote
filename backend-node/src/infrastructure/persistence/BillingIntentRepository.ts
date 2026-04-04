import { and, desc, eq, gte } from 'drizzle-orm';
import { injectable } from 'tsyringe';
import {
  BillingIntentRecord,
  CreateBillingIntentData,
  IBillingIntentRepository,
  UpdateBillingIntentCorrelationData,
} from '../../application/interfaces/IBillingIntentRepository';
import { db } from '../db/drizzle/client';
import { billingIntentsTable } from '../db/drizzle/schema';

function mapBillingIntent(record: typeof billingIntentsTable.$inferSelect): BillingIntentRecord {
  return {
    id: record.id,
    orgId: record.orgId,
    createdByUserId: record.createdByUserId,
    userEmail: record.userEmail,
    targetPlan: record.targetPlan,
    source: record.source,
    status: record.status,
    lemonSubscriptionId: record.lemonSubscriptionId,
    lemonOrderId: record.lemonOrderId,
    lemonCustomerId: record.lemonCustomerId,
    lemonCustomerEmail: record.lemonCustomerEmail,
    lastEventName: record.lastEventName,
    failureReason: record.failureReason,
    completedAt: record.completedAt,
    resolvedAt: record.resolvedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@injectable()
export class BillingIntentRepository implements IBillingIntentRepository {
  async createPending(data: CreateBillingIntentData): Promise<BillingIntentRecord> {
    const [created] = await db
      .insert(billingIntentsTable)
      .values({
        orgId: data.orgId,
        createdByUserId: data.createdByUserId,
        userEmail: data.userEmail,
        targetPlan: data.targetPlan,
        source: data.source,
      })
      .returning();

    return mapBillingIntent(created);
  }

  async findById(id: string): Promise<BillingIntentRecord | null> {
    const [intent] = await db
      .select()
      .from(billingIntentsTable)
      .where(eq(billingIntentsTable.id, id))
      .limit(1);

    return intent ? mapBillingIntent(intent) : null;
  }

  async findBySubscriptionId(subscriptionId: string): Promise<BillingIntentRecord | null> {
    const [intent] = await db
      .select()
      .from(billingIntentsTable)
      .where(eq(billingIntentsTable.lemonSubscriptionId, subscriptionId))
      .orderBy(desc(billingIntentsTable.createdAt))
      .limit(1);

    return intent ? mapBillingIntent(intent) : null;
  }

  async findByOrderId(orderId: string): Promise<BillingIntentRecord | null> {
    const [intent] = await db
      .select()
      .from(billingIntentsTable)
      .where(eq(billingIntentsTable.lemonOrderId, orderId))
      .orderBy(desc(billingIntentsTable.createdAt))
      .limit(1);

    return intent ? mapBillingIntent(intent) : null;
  }

  async findByCustomerId(customerId: string): Promise<BillingIntentRecord | null> {
    const [intent] = await db
      .select()
      .from(billingIntentsTable)
      .where(eq(billingIntentsTable.lemonCustomerId, customerId))
      .orderBy(desc(billingIntentsTable.createdAt))
      .limit(1);

    return intent ? mapBillingIntent(intent) : null;
  }

  async findPendingByOrgUserPlan(orgId: string, createdByUserId: string, targetPlan: string): Promise<BillingIntentRecord[]> {
    const intents = await db
      .select()
      .from(billingIntentsTable)
      .where(and(
        eq(billingIntentsTable.orgId, orgId),
        eq(billingIntentsTable.createdByUserId, createdByUserId),
        eq(billingIntentsTable.targetPlan, targetPlan),
        eq(billingIntentsTable.status, 'pending'),
      ))
      .orderBy(desc(billingIntentsTable.createdAt));

    return intents.map(mapBillingIntent);
  }

  async findRecentPendingByEmail(email: string, createdAfter: Date): Promise<BillingIntentRecord[]> {
    const intents = await db
      .select()
      .from(billingIntentsTable)
      .where(and(
        eq(billingIntentsTable.userEmail, email),
        eq(billingIntentsTable.status, 'pending'),
        gte(billingIntentsTable.createdAt, createdAfter),
      ))
      .orderBy(desc(billingIntentsTable.createdAt));

    return intents.map(mapBillingIntent);
  }

  async recordEvent(id: string, data: UpdateBillingIntentCorrelationData): Promise<void> {
    await db
      .update(billingIntentsTable)
      .set({
        lemonSubscriptionId: data.subscriptionId,
        lemonOrderId: data.orderId,
        lemonCustomerId: data.customerId,
        lemonCustomerEmail: data.customerEmail,
        lastEventName: data.lastEventName,
        failureReason: data.failureReason,
        updatedAt: new Date(),
      })
      .where(eq(billingIntentsTable.id, id));
  }

  async resolve(id: string, status: 'completed' | 'failed' | 'cancelled' | 'expired', data: UpdateBillingIntentCorrelationData): Promise<void> {
    await db
      .update(billingIntentsTable)
      .set({
        status,
        lemonSubscriptionId: data.subscriptionId,
        lemonOrderId: data.orderId,
        lemonCustomerId: data.customerId,
        lemonCustomerEmail: data.customerEmail,
        lastEventName: data.lastEventName,
        failureReason: data.failureReason,
        completedAt: status === 'completed' ? new Date() : null,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(billingIntentsTable.id, id));
  }
}