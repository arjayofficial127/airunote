import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { orgUserRolesTable } from '../db/drizzle/schema';
import { IOrgUserRoleRepository } from '../../application/interfaces/IOrgUserRoleRepository';
import { OrgUserRole } from '../../domain/entities/OrgUserRole';

@injectable()
export class OrgUserRoleRepository implements IOrgUserRoleRepository {
  async create(orgUserRole: Omit<OrgUserRole, 'id' | 'createdAt'>): Promise<OrgUserRole> {
    const [created] = await db
      .insert(orgUserRolesTable)
      .values({
        orgUserId: orgUserRole.orgUserId,
        roleId: orgUserRole.roleId,
      })
      .returning();

    return new OrgUserRole(
      created.id,
      created.orgUserId,
      created.roleId,
      created.createdAt
    );
  }

  async findByOrgUserId(orgUserId: string): Promise<OrgUserRole[]> {
    const orgUserRoles = await db
      .select()
      .from(orgUserRolesTable)
      .where(eq(orgUserRolesTable.orgUserId, orgUserId));

    return orgUserRoles.map(
      (our) =>
        new OrgUserRole(our.id, our.orgUserId, our.roleId, our.createdAt)
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(orgUserRolesTable).where(eq(orgUserRolesTable.id, id));
  }
}

