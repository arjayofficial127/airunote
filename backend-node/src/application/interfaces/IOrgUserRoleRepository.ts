import { OrgUserRole } from '../../domain/entities/OrgUserRole';

export interface IOrgUserRoleRepository {
  create(orgUserRole: Omit<OrgUserRole, 'id' | 'createdAt'>): Promise<OrgUserRole>;
  findByOrgUserId(orgUserId: string): Promise<OrgUserRole[]>;
  delete(id: string): Promise<void>;
}

