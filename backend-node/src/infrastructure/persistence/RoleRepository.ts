import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { rolesTable } from '../db/drizzle/schema';
import { IRoleRepository } from '../../application/interfaces/IRoleRepository';
import { Role } from '../../domain/entities/Role';

@injectable()
export class RoleRepository implements IRoleRepository {
  async findById(id: number): Promise<Role | null> {
    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, id))
      .limit(1);

    if (!role) return null;

    return new Role(role.id, role.name, role.code);
  }

  async findByCode(code: string): Promise<Role | null> {
    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.code, code))
      .limit(1);

    if (!role) return null;

    return new Role(role.id, role.name, role.code);
  }

  async findAll(): Promise<Role[]> {
    const roles = await db.select().from(rolesTable);

    return roles.map((r) => new Role(r.id, r.name, r.code));
  }
}

