import { injectable } from 'tsyringe';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { teamMembersTable } from '../db/drizzle/schema';
import { ITeamMemberRepository } from '../../application/interfaces/ITeamMemberRepository';
import { TeamMember } from '../../domain/entities/TeamMember';

@injectable()
export class TeamMemberRepository implements ITeamMemberRepository {
  async create(teamMember: Omit<TeamMember, 'id' | 'joinedAt'>): Promise<TeamMember> {
    const [created] = await db
      .insert(teamMembersTable)
      .values({
        teamId: teamMember.teamId,
        userId: teamMember.userId,
        role: teamMember.role,
      })
      .returning();

    return new TeamMember(
      created.id,
      created.teamId,
      created.userId,
      created.role as 'member' | 'lead',
      created.joinedAt
    );
  }

  async findById(id: string): Promise<TeamMember | null> {
    const [member] = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.id, id))
      .limit(1);

    if (!member) return null;

    return new TeamMember(
      member.id,
      member.teamId,
      member.userId,
      member.role as 'member' | 'lead',
      member.joinedAt
    );
  }

  async findByTeamId(teamId: string): Promise<TeamMember[]> {
    const members = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.teamId, teamId));

    return members.map(
      (m) =>
        new TeamMember(
          m.id,
          m.teamId,
          m.userId,
          m.role as 'member' | 'lead',
          m.joinedAt
        )
    );
  }

  async findByUserId(userId: string): Promise<TeamMember[]> {
    const members = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.userId, userId));

    return members.map(
      (m) =>
        new TeamMember(
          m.id,
          m.teamId,
          m.userId,
          m.role as 'member' | 'lead',
          m.joinedAt
        )
    );
  }

  async findByTeamIdAndUserId(teamId: string, userId: string): Promise<TeamMember | null> {
    const [member] = await db
      .select()
      .from(teamMembersTable)
      .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId)))
      .limit(1);

    if (!member) return null;

    return new TeamMember(
      member.id,
      member.teamId,
      member.userId,
      member.role as 'member' | 'lead',
      member.joinedAt
    );
  }

  async update(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const updateData: Record<string, unknown> = {};
    if (updates.role !== undefined) updateData.role = updates.role;

    const [updated] = await db
      .update(teamMembersTable)
      .set(updateData)
      .where(eq(teamMembersTable.id, id))
      .returning();

    return new TeamMember(
      updated.id,
      updated.teamId,
      updated.userId,
      updated.role as 'member' | 'lead',
      updated.joinedAt
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(teamMembersTable).where(eq(teamMembersTable.id, id));
  }

  async deleteByTeamIdAndUserId(teamId: string, userId: string): Promise<void> {
    await db
      .delete(teamMembersTable)
      .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId)));
  }
}

