import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { orgsTable, orgUsersTable } from '../db/drizzle/schema';
import { IOrgRepository, UpdateOrgSubscriptionData } from '../../application/interfaces/IOrgRepository';
import { Org } from '../../domain/entities/Org';

@injectable()
export class OrgRepository implements IOrgRepository {
  async create(org: Omit<Org, 'id' | 'createdAt'>): Promise<Org> {
    const [created] = await db
      .insert(orgsTable)
      .values({
        name: org.name,
        slug: org.slug.toLowerCase(),
        description: org.description,
        isActive: org.isActive,
      })
      .returning();

    return new Org(
      created.id,
      created.name,
      created.slug,
      created.description,
      created.isActive,
      created.createdAt,
      created.plan,
      created.subscriptionStatus,
      created.subscriptionId,
      created.currentPeriodEnd
    );
  }

  async findById(id: string): Promise<Org | null> {
    const [org] = await db
      .select()
      .from(orgsTable)
      .where(eq(orgsTable.id, id))
      .limit(1);

    if (!org) return null;

    return new Org(
      org.id,
      org.name,
      org.slug,
      org.description,
      org.isActive,
      org.createdAt,
      org.plan,
      org.subscriptionStatus,
      org.subscriptionId,
      org.currentPeriodEnd
    );
  }

  async findBySlug(slug: string): Promise<Org | null> {
    const [org] = await db
      .select()
      .from(orgsTable)
      .where(eq(orgsTable.slug, slug.toLowerCase()))
      .limit(1);

    if (!org) return null;

    return new Org(
      org.id,
      org.name,
      org.slug,
      org.description,
      org.isActive,
      org.createdAt,
      org.plan,
      org.subscriptionStatus,
      org.subscriptionId,
      org.currentPeriodEnd
    );
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Org | null> {
    const [org] = await db
      .select()
      .from(orgsTable)
      .where(eq(orgsTable.subscriptionId, subscriptionId))
      .limit(1);

    if (!org) return null;

    return new Org(
      org.id,
      org.name,
      org.slug,
      org.description,
      org.isActive,
      org.createdAt,
      org.plan,
      org.subscriptionStatus,
      org.subscriptionId,
      org.currentPeriodEnd
    );
  }

  async findByUserId(userId: string): Promise<Org[]> {
    const orgs = await db
      .select({
        id: orgsTable.id,
        name: orgsTable.name,
        slug: orgsTable.slug,
        description: orgsTable.description,
        isActive: orgsTable.isActive,
        createdAt: orgsTable.createdAt,
        plan: orgsTable.plan,
        subscriptionStatus: orgsTable.subscriptionStatus,
        subscriptionId: orgsTable.subscriptionId,
        currentPeriodEnd: orgsTable.currentPeriodEnd,
      })
      .from(orgsTable)
      .innerJoin(orgUsersTable, eq(orgsTable.id, orgUsersTable.orgId))
      .where(eq(orgUsersTable.userId, userId));

    return orgs.map(
      (o) =>
        new Org(
          o.id,
          o.name,
          o.slug,
          o.description,
          o.isActive,
          o.createdAt,
          o.plan,
          o.subscriptionStatus,
          o.subscriptionId,
          o.currentPeriodEnd
        )
    );
  }

  async findAll(): Promise<Org[]> {
    const orgs = await db
      .select()
      .from(orgsTable);

    return orgs.map(
      (o) =>
        new Org(
          o.id,
          o.name,
          o.slug,
          o.description,
          o.isActive,
          o.createdAt,
          o.plan,
          o.subscriptionStatus,
          o.subscriptionId,
          o.currentPeriodEnd
        )
    );
  }

  async update(id: string, updates: Partial<Org>): Promise<Org> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.slug !== undefined) updateData.slug = updates.slug.toLowerCase();

    const [updated] = await db
      .update(orgsTable)
      .set(updateData)
      .where(eq(orgsTable.id, id))
      .returning();

    return new Org(
      updated.id,
      updated.name,
      updated.slug,
      updated.description,
      updated.isActive,
      updated.createdAt,
      updated.plan,
      updated.subscriptionStatus,
      updated.subscriptionId,
      updated.currentPeriodEnd
    );
  }

  async updateOrgSubscription(orgId: string, data: UpdateOrgSubscriptionData): Promise<void> {
    await db
      .update(orgsTable)
      .set({
        plan: data.plan,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionId: data.subscriptionId,
        currentPeriodEnd: data.currentPeriodEnd,
      })
      .where(eq(orgsTable.id, orgId));
  }

  async delete(id: string): Promise<void> {
    await db.delete(orgsTable).where(eq(orgsTable.id, id));
  }
}

