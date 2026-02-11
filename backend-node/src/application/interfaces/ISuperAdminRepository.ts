import { SuperAdmin } from '../../domain/entities/SuperAdmin';

export interface ISuperAdminRepository {
  findByUserId(userId: string): Promise<SuperAdmin | null>;
  create(superAdmin: Omit<SuperAdmin, 'id' | 'createdAt'>): Promise<SuperAdmin>;
  delete(userId: string): Promise<void>;
}

