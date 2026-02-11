import { Role } from '../../domain/entities/Role';

export interface IRoleRepository {
  findById(id: number): Promise<Role | null>;
  findByCode(code: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
}

