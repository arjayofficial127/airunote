import { injectable } from 'tsyringe';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { orgUsersTable } from '../db/drizzle/schema';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { OrgUser } from '../../domain/entities/OrgUser';

@injectable()
export class OrgUserRepository implements IOrgUserRepository {
  async create(orgUser: Omit<OrgUser, 'id' | 'createdAt'>): Promise<OrgUser> {
    const [created] = await db
      .insert(orgUsersTable)
      .values({
        orgId: orgUser.orgId,
        userId: orgUser.userId,
        isActive: orgUser.isActive,
      })
      .returning();

    return new OrgUser(
      created.id,
      created.orgId,
      created.userId,
      created.isActive,
      created.createdAt
    );
  }

  async findById(id: string): Promise<OrgUser | null> {
    const [orgUser] = await db
      .select()
      .from(orgUsersTable)
      .where(eq(orgUsersTable.id, id))
      .limit(1);

    if (!orgUser) return null;

    return new OrgUser(
      orgUser.id,
      orgUser.orgId,
      orgUser.userId,
      orgUser.isActive,
      orgUser.createdAt
    );
  }

  async findByOrgIdAndUserId(orgId: string, userId: string): Promise<OrgUser | null> {
    const [orgUser] = await db
      .select()
      .from(orgUsersTable)
      .where(and(eq(orgUsersTable.orgId, orgId), eq(orgUsersTable.userId, userId)))
      .limit(1);

    if (!orgUser) return null;

    return new OrgUser(
      orgUser.id,
      orgUser.orgId,
      orgUser.userId,
      orgUser.isActive,
      orgUser.createdAt
    );
  }

  async findByUserId(userId: string): Promise<OrgUser[]> {
    const orgUsers = await db
      .select()
      .from(orgUsersTable)
      .where(eq(orgUsersTable.userId, userId));

    return orgUsers.map(
      (ou) =>
        new OrgUser(ou.id, ou.orgId, ou.userId, ou.isActive, ou.createdAt)
    );
  }

  async findByOrgId(orgId: string): Promise<OrgUser[]> {
    const orgUsers = await db
      .select()
      .from(orgUsersTable)
      .where(eq(orgUsersTable.orgId, orgId));

    return orgUsers.map(
      (ou) =>
        new OrgUser(ou.id, ou.orgId, ou.userId, ou.isActive, ou.createdAt)
    );
  }
}

