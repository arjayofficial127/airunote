import { User } from '../../domain/entities/User';

export interface IUserRepository {
  create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, updates: Partial<User>): Promise<User>;
}

