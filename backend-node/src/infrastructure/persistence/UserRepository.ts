import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { usersTable } from '../db/drizzle/schema';
import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { User } from '../../domain/entities/User';

@injectable()
export class UserRepository implements IUserRepository {
  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Users table must contain only verified, permanent user data. Temporary verification state belongs exclusively to pending_users.
    const [created] = await db
      .insert(usersTable)
      .values({
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        isActive: user.isActive,
        defaultOrgId: user.defaultOrgId || null,
        emailVerifiedAt: user.emailVerifiedAt,
      })
      .returning();

    return new User(
      created.id,
      created.email,
      created.passwordHash,
      created.name,
      created.isActive,
      created.defaultOrgId,
      created.emailVerifiedAt,
      created.createdAt
    );
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user) return null;

    return new User(
      user.id,
      user.email,
      user.passwordHash,
      user.name,
      user.isActive,
      user.defaultOrgId,
      user.emailVerifiedAt,
      user.createdAt
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) return null;

    return new User(
      user.id,
      user.email,
      user.passwordHash,
      user.name,
      user.isActive,
      user.defaultOrgId,
      user.emailVerifiedAt,
      user.createdAt
    );
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const updateData: Record<string, unknown> = {};
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.passwordHash !== undefined) updateData.passwordHash = updates.passwordHash;
    if (updates.defaultOrgId !== undefined) updateData.defaultOrgId = updates.defaultOrgId;
    if (updates.emailVerifiedAt !== undefined) updateData.emailVerifiedAt = updates.emailVerifiedAt;

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();

    return new User(
      updated.id,
      updated.email,
      updated.passwordHash,
      updated.name,
      updated.isActive,
      updated.defaultOrgId,
      updated.emailVerifiedAt,
      updated.createdAt
    );
  }
}

