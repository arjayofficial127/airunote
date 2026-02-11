import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import { NotFoundError, ConflictError } from '../../core/errors/AppError';
import { ITeamRepository } from '../interfaces/ITeamRepository';
import { ITeamMemberRepository } from '../interfaces/ITeamMemberRepository';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { Team } from '../../domain/entities/Team';
import { TYPES } from '../../core/di/types';

export interface ITeamUseCase {
  create(orgId: string, name: string, description?: string, leadUserId?: string): Promise<Result<Team, Error>>;
  findById(id: string, orgId: string): Promise<Result<Team, Error>>;
  findByOrgId(orgId: string): Promise<Result<Team[], Error>>;
  update(id: string, orgId: string, updates: { name?: string; description?: string; leadUserId?: string | null }): Promise<Result<Team, Error>>;
  delete(id: string, orgId: string): Promise<Result<void, Error>>;
  addMember(teamId: string, userId: string, orgId: string): Promise<Result<void, Error>>;
  removeMember(teamId: string, userId: string, orgId: string): Promise<Result<void, Error>>;
}

@injectable()
export class TeamUseCase implements ITeamUseCase {
  constructor(
    @inject(TYPES.ITeamRepository) private teamRepository: ITeamRepository,
    @inject(TYPES.ITeamMemberRepository) private teamMemberRepository: ITeamMemberRepository,
    @inject(TYPES.IOrgRepository) private orgRepository: IOrgRepository
  ) {}

  async create(orgId: string, name: string, description?: string, leadUserId?: string): Promise<Result<Team, Error>> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Check if team name already exists in org
    const existingTeams = await this.teamRepository.findByOrgId(orgId);
    const nameExists = existingTeams.some((t) => t.name.toLowerCase() === name.toLowerCase());
    if (nameExists) {
      return Result.err(new ConflictError(`Team with name "${name}" already exists in this organization`));
    }

    const team = await this.teamRepository.create({
      orgId,
      name,
      description: description || null,
      leadUserId: leadUserId || null,
    });

    // If leadUserId is provided, add as team member with lead role
    if (leadUserId) {
      await this.teamMemberRepository.create({
        teamId: team.id,
        userId: leadUserId,
        role: 'lead',
      });
    }

    return Result.ok(team);
  }

  async findById(id: string, orgId: string): Promise<Result<Team, Error>> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      return Result.err(new NotFoundError('Team', id));
    }

    if (team.orgId !== orgId) {
      return Result.err(new NotFoundError('Team', id));
    }

    return Result.ok(team);
  }

  async findByOrgId(orgId: string): Promise<Result<Team[], Error>> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    const teams = await this.teamRepository.findByOrgId(orgId);
    return Result.ok(teams);
  }

  async update(
    id: string,
    orgId: string,
    updates: { name?: string; description?: string; leadUserId?: string | null }
  ): Promise<Result<Team, Error>> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      return Result.err(new NotFoundError('Team', id));
    }

    if (team.orgId !== orgId) {
      return Result.err(new NotFoundError('Team', id));
    }

    // Check name uniqueness if name is being updated
    if (updates.name) {
      const existingTeams = await this.teamRepository.findByOrgId(orgId);
      const nameExists = existingTeams.some((t) => t.id !== id && t.name.toLowerCase() === updates.name!.toLowerCase());
      if (nameExists) {
        return Result.err(new ConflictError(`Team with name "${updates.name}" already exists in this organization`));
      }
    }

    const updated = await this.teamRepository.update(id, updates);
    return Result.ok(updated);
  }

  async delete(id: string, orgId: string): Promise<Result<void, Error>> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      return Result.err(new NotFoundError('Team', id));
    }

    if (team.orgId !== orgId) {
      return Result.err(new NotFoundError('Team', id));
    }

    await this.teamRepository.delete(id);
    return Result.ok(undefined);
  }

  async addMember(teamId: string, userId: string, orgId: string): Promise<Result<void, Error>> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      return Result.err(new NotFoundError('Team', teamId));
    }

    if (team.orgId !== orgId) {
      return Result.err(new NotFoundError('Team', teamId));
    }

    // Check if already a member
    const existing = await this.teamMemberRepository.findByTeamIdAndUserId(teamId, userId);
    if (existing) {
      return Result.err(new ConflictError('User is already a member of this team'));
    }

    await this.teamMemberRepository.create({
      teamId,
      userId,
      role: 'member',
    });

    return Result.ok(undefined);
  }

  async removeMember(teamId: string, userId: string, orgId: string): Promise<Result<void, Error>> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      return Result.err(new NotFoundError('Team', teamId));
    }

    if (team.orgId !== orgId) {
      return Result.err(new NotFoundError('Team', teamId));
    }

    await this.teamMemberRepository.deleteByTeamIdAndUserId(teamId, userId);
    return Result.ok(undefined);
  }
}

