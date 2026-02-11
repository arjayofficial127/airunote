import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { superAdminsTable } from '../db/drizzle/schema';
import { ISuperAdminRepository } from '../../application/interfaces/ISuperAdminRepository';
import { SuperAdmin } from '../../domain/entities/SuperAdmin';

@injectable()
export class SuperAdminRepository implements ISuperAdminRepository {
  async findByUserId(userId: string): Promise<SuperAdmin | null> {
    const [superAdmin] = await db
      .select()
      .from(superAdminsTable)
      .where(eq(superAdminsTable.userId, userId))
      .limit(1);

    if (!superAdmin) return null;

    return new SuperAdmin(
      superAdmin.id,
      superAdmin.userId,
      superAdmin.isActive,
      superAdmin.createdAt
    );
  }

  async create(superAdmin: Omit<SuperAdmin, 'id' | 'createdAt'>): Promise<SuperAdmin> {
    const [created] = await db
      .insert(superAdminsTable)
      .values({
        userId: superAdmin.userId,
        isActive: superAdmin.isActive,
      })
      .returning();

    return new SuperAdmin(
      created.id,
      created.userId,
      created.isActive,
      created.createdAt
    );
  }

  async delete(userId: string): Promise<void> {
    await db.delete(superAdminsTable).where(eq(superAdminsTable.userId, userId));
  }
}

