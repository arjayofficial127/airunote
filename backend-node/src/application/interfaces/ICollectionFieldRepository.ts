import { CollectionField } from '../../domain/entities/CollectionField';

export interface ICollectionFieldRepository {
  create(field: Omit<CollectionField, 'id' | 'createdAt' | 'updatedAt'>): Promise<CollectionField>;
  findById(id: string): Promise<CollectionField | null>;
  findByCollectionId(collectionId: string): Promise<CollectionField[]>;
  findByCollectionIdAndKey(collectionId: string, key: string): Promise<CollectionField | null>;
  update(id: string, updates: Partial<CollectionField>): Promise<CollectionField>;
  delete(id: string): Promise<void>;
}

