import { Team } from '../../domain/entities/Team';

export interface ITeamRepository {
  create(team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team>;
  findById(id: string): Promise<Team | null>;
  findByOrgId(orgId: string): Promise<Team[]>;
  update(id: string, updates: Partial<Team>): Promise<Team>;
  delete(id: string): Promise<void>;
}

