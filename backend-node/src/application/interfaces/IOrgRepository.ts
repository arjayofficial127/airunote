import { Org } from '../../domain/entities/Org';

export interface IOrgRepository {
  create(org: Omit<Org, 'id' | 'createdAt'>): Promise<Org>;
  findById(id: string): Promise<Org | null>;
  findBySlug(slug: string): Promise<Org | null>;
  findByUserId(userId: string): Promise<Org[]>;
  findAll(): Promise<Org[]>;
  update(id: string, updates: Partial<Org>): Promise<Org>;
  delete(id: string): Promise<void>;
}

