import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { joinCodesTable } from '../db/drizzle/schema';
import { IJoinCodeRepository } from '../../application/interfaces/IJoinCodeRepository';
import { JoinCode } from '../../domain/entities/JoinCode';

@injectable()
export class JoinCodeRepository implements IJoinCodeRepository {
  async create(joinCode: Omit<JoinCode, 'id' | 'createdAt' | 'updatedAt'>): Promise<JoinCode> {
    const [created] = await db
      .insert(joinCodesTable)
      .values({
        orgId: joinCode.orgId,
        code: joinCode.code,
        maxUses: joinCode.maxUses,
        usedCount: joinCode.usedCount,
        allowedDomains: joinCode.allowedDomains,
        isActive: joinCode.isActive,
        expiresAt: joinCode.expiresAt,
        defaultRoleId: joinCode.defaultRoleId,
        defaultTeamId: joinCode.defaultTeamId,
        requiresApproval: joinCode.requiresApproval,
        welcomeMessage: joinCode.welcomeMessage,
        visibility: joinCode.visibility,
        notifyAdminsOnJoin: joinCode.notifyAdminsOnJoin,
      })
      .returning();

    return new JoinCode(
      created.id,
      created.orgId,
      created.code,
      created.maxUses,
      created.usedCount || 0,
      created.allowedDomains as string[] | null,
      created.isActive || false,
      created.expiresAt,
      created.defaultRoleId,
      created.defaultTeamId,
      created.requiresApproval || false,
      created.welcomeMessage,
      created.visibility as 'private' | 'public',
      created.notifyAdminsOnJoin || true,
      created.createdAt,
      created.updatedAt
    );
  }

  async findById(id: string): Promise<JoinCode | null> {
    const [code] = await db
      .select()
      .from(joinCodesTable)
      .where(eq(joinCodesTable.id, id))
      .limit(1);

    if (!code) return null;

    return new JoinCode(
      code.id,
      code.orgId,
      code.code,
      code.maxUses,
      code.usedCount || 0,
      code.allowedDomains as string[] | null,
      code.isActive || false,
      code.expiresAt,
      code.defaultRoleId,
      code.defaultTeamId,
      code.requiresApproval || false,
      code.welcomeMessage,
      code.visibility as 'private' | 'public',
      code.notifyAdminsOnJoin || true,
      code.createdAt,
      code.updatedAt
    );
  }

  async findByCode(code: string): Promise<JoinCode | null> {
    const [joinCode] = await db
      .select()
      .from(joinCodesTable)
      .where(eq(joinCodesTable.code, code))
      .limit(1);

    if (!joinCode) return null;

    return new JoinCode(
      joinCode.id,
      joinCode.orgId,
      joinCode.code,
      joinCode.maxUses,
      joinCode.usedCount || 0,
      joinCode.allowedDomains as string[] | null,
      joinCode.isActive || false,
      joinCode.expiresAt,
      joinCode.defaultRoleId,
      joinCode.defaultTeamId,
      joinCode.requiresApproval || false,
      joinCode.welcomeMessage,
      joinCode.visibility as 'private' | 'public',
      joinCode.notifyAdminsOnJoin || true,
      joinCode.createdAt,
      joinCode.updatedAt
    );
  }

  async findByOrgId(orgId: string): Promise<JoinCode | null> {
    const [code] = await db
      .select()
      .from(joinCodesTable)
      .where(eq(joinCodesTable.orgId, orgId))
      .limit(1);

    if (!code) return null;

    return new JoinCode(
      code.id,
      code.orgId,
      code.code,
      code.maxUses,
      code.usedCount || 0,
      code.allowedDomains as string[] | null,
      code.isActive || false,
      code.expiresAt,
      code.defaultRoleId,
      code.defaultTeamId,
      code.requiresApproval || false,
      code.welcomeMessage,
      code.visibility as 'private' | 'public',
      code.notifyAdminsOnJoin || true,
      code.createdAt,
      code.updatedAt
    );
  }

  async update(id: string, updates: Partial<JoinCode>): Promise<JoinCode> {
    const updateData: Record<string, unknown> = {};
    if (updates.code !== undefined) updateData.code = updates.code;
    if (updates.maxUses !== undefined) updateData.maxUses = updates.maxUses;
    if (updates.usedCount !== undefined) updateData.usedCount = updates.usedCount;
    if (updates.allowedDomains !== undefined) updateData.allowedDomains = updates.allowedDomains;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.expiresAt !== undefined) updateData.expiresAt = updates.expiresAt;
    if (updates.defaultRoleId !== undefined) updateData.defaultRoleId = updates.defaultRoleId;
    if (updates.defaultTeamId !== undefined) updateData.defaultTeamId = updates.defaultTeamId;
    if (updates.requiresApproval !== undefined) updateData.requiresApproval = updates.requiresApproval;
    if (updates.welcomeMessage !== undefined) updateData.welcomeMessage = updates.welcomeMessage;
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
    if (updates.notifyAdminsOnJoin !== undefined) updateData.notifyAdminsOnJoin = updates.notifyAdminsOnJoin;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(joinCodesTable)
      .set(updateData)
      .where(eq(joinCodesTable.id, id))
      .returning();

    return new JoinCode(
      updated.id,
      updated.orgId,
      updated.code,
      updated.maxUses,
      updated.usedCount || 0,
      updated.allowedDomains as string[] | null,
      updated.isActive || false,
      updated.expiresAt,
      updated.defaultRoleId,
      updated.defaultTeamId,
      updated.requiresApproval || false,
      updated.welcomeMessage,
      updated.visibility as 'private' | 'public',
      updated.notifyAdminsOnJoin || true,
      updated.createdAt,
      updated.updatedAt
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(joinCodesTable).where(eq(joinCodesTable.id, id));
  }
}

