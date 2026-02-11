import { OrgUser } from '../../domain/entities/OrgUser';

export interface IOrgUserRepository {
  create(orgUser: Omit<OrgUser, 'id' | 'createdAt'>): Promise<OrgUser>;
  findById(id: string): Promise<OrgUser | null>;
  findByOrgIdAndUserId(orgId: string, userId: string): Promise<OrgUser | null>;
  findByUserId(userId: string): Promise<OrgUser[]>;
  findByOrgId(orgId: string): Promise<OrgUser[]>;
}

