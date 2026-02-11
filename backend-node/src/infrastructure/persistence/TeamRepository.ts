import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { teamsTable } from '../db/drizzle/schema';
import { ITeamRepository } from '../../application/interfaces/ITeamRepository';
import { Team } from '../../domain/entities/Team';

@injectable()
export class TeamRepository implements ITeamRepository {
  async create(team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const [created] = await db
      .insert(teamsTable)
      .values({
        orgId: team.orgId,
        name: team.name,
        description: team.description,
        leadUserId: team.leadUserId,
      })
      .returning();

    return new Team(
      created.id,
      created.orgId,
      created.name,
      created.description,
      created.leadUserId,
      created.createdAt,
      created.updatedAt
    );
  }

  async findById(id: string): Promise<Team | null> {
    const [team] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, id))
      .limit(1);

    if (!team) return null;

    return new Team(
      team.id,
      team.orgId,
      team.name,
      team.description,
      team.leadUserId,
      team.createdAt,
      team.updatedAt
    );
  }

  async findByOrgId(orgId: string): Promise<Team[]> {
    const teams = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.orgId, orgId));

    return teams.map(
      (t) =>
        new Team(
          t.id,
          t.orgId,
          t.name,
          t.description,
          t.leadUserId,
          t.createdAt,
          t.updatedAt
        )
    );
  }

  async update(id: string, updates: Partial<Team>): Promise<Team> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.leadUserId !== undefined) updateData.leadUserId = updates.leadUserId;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(teamsTable)
      .set(updateData)
      .where(eq(teamsTable.id, id))
      .returning();

    return new Team(
      updated.id,
      updated.orgId,
      updated.name,
      updated.description,
      updated.leadUserId,
      updated.createdAt,
      updated.updatedAt
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(teamsTable).where(eq(teamsTable.id, id));
  }
}

