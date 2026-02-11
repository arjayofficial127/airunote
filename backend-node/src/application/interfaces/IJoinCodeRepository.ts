import { JoinCode } from '../../domain/entities/JoinCode';

export interface IJoinCodeRepository {
  create(joinCode: Omit<JoinCode, 'id' | 'createdAt' | 'updatedAt'>): Promise<JoinCode>;
  findById(id: string): Promise<JoinCode | null>;
  findByCode(code: string): Promise<JoinCode | null>;
  findByOrgId(orgId: string): Promise<JoinCode | null>;
  update(id: string, updates: Partial<JoinCode>): Promise<JoinCode>;
  delete(id: string): Promise<void>;
}

