import { CollectionRecord } from '../../domain/entities/Record';

export interface RecordFilters {
  ownerUserId?: string;
  kind?: string;
  dateFrom?: string;
  dateTo?: string;
  isPublished?: boolean;
  [key: string]: any; // Allow any filter for flexibility
}

export interface IRecordRepository {
  create(record: Omit<CollectionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<CollectionRecord>;
  findById(id: string): Promise<CollectionRecord | null>;
  findByCollectionId(collectionId: string, limit?: number, offset?: number): Promise<CollectionRecord[]>;
  findByCollectionIdAndOrgId(collectionId: string, orgId: string, limit?: number, offset?: number): Promise<CollectionRecord[]>;
  findByCollectionIdAndOrgIdWithFilters(
    collectionId: string,
    orgId: string,
    filters?: RecordFilters,
    limit?: number,
    offset?: number
  ): Promise<{ records: CollectionRecord[]; total: number }>;
  findByCollectionIdAndOrgIdAndSlug(collectionId: string, orgId: string, slug: string): Promise<CollectionRecord | null>;
  findByCollectionIdAndOrgIdAndSlugExcludingId(collectionId: string, orgId: string, slug: string, excludeId: string): Promise<CollectionRecord | null>;
  countByCollectionId(collectionId: string): Promise<number>;
  countByCollectionIdAndOrgId(collectionId: string, orgId: string): Promise<number>;
  update(id: string, updates: Partial<CollectionRecord>): Promise<CollectionRecord>;
  delete(id: string): Promise<void>;
}

