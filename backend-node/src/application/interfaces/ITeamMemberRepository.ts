import { TeamMember } from '../../domain/entities/TeamMember';

export interface ITeamMemberRepository {
  create(teamMember: Omit<TeamMember, 'id' | 'joinedAt'>): Promise<TeamMember>;
  findById(id: string): Promise<TeamMember | null>;
  findByTeamId(teamId: string): Promise<TeamMember[]>;
  findByUserId(userId: string): Promise<TeamMember[]>;
  findByTeamIdAndUserId(teamId: string, userId: string): Promise<TeamMember | null>;
  update(id: string, updates: Partial<TeamMember>): Promise<TeamMember>;
  delete(id: string): Promise<void>;
  deleteByTeamIdAndUserId(teamId: string, userId: string): Promise<void>;
}

