import { Collection } from '../../domain/entities/Collection';

export interface ICollectionRepository {
  create(collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collection>;
  findById(id: string): Promise<Collection | null>;
  findByOrgId(orgId: string): Promise<Collection[]>;
  findByOrgIdAndSlug(orgId: string, slug: string): Promise<Collection | null>;
  update(id: string, updates: Partial<Collection>): Promise<Collection>;
  delete(id: string): Promise<void>;
}

