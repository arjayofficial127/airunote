import { OrgFile } from '../../domain/entities/OrgFile';

export interface IOrgFileRepository {
  create(file: Omit<OrgFile, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrgFile>;
  findById(id: string): Promise<OrgFile | null>;
  findByOrgId(orgId: string, userId?: string, filters?: { visibility?: string; search?: string }): Promise<OrgFile[]>;
  update(id: string, updates: Partial<OrgFile>): Promise<OrgFile>;
  delete(id: string): Promise<void>;
  
  // User access management
  addUserAccess(fileId: string, userId: string): Promise<void>;
  removeUserAccess(fileId: string, userId: string): Promise<void>;
  getUserAccessList(fileId: string): Promise<string[]>; // Returns userIds
  
  // Public links
  createLink(fileId: string, code: string): Promise<void>;
  findLinkByCode(code: string): Promise<{ fileId: string; revokedAt: Date | null } | null>;
  revokeLink(code: string): Promise<void>;
}
