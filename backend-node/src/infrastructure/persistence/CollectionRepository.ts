import { injectable } from 'tsyringe';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { collectionsTable } from '../db/drizzle/schema';
import { ICollectionRepository } from '../../application/interfaces/ICollectionRepository';
import { Collection } from '../../domain/entities/Collection';
import NodeCache from 'node-cache';

// Cache collection lookups to eliminate extra queries
// TTL: 1 hour (collections rarely change)
const collectionCache = new NodeCache({
  stdTTL: 3600, // 1 hour
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false, // Better performance (no deep cloning)
});

@injectable()
export class CollectionRepository implements ICollectionRepository {
  async create(collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collection> {
    const [created] = await db
      .insert(collectionsTable)
      .values({
        orgId: collection.orgId,
        slug: collection.slug.toLowerCase(),
        name: collection.name,
        description: collection.description ?? null,
        icon: collection.icon ?? null,
        color: collection.color ?? null,
        visibility: collection.visibility,
        createdByUserId: collection.createdByUserId,
        tableCode: collection.tableCode,
        storageMode: collection.storageMode,
        physicalTable: collection.physicalTable ?? null,
      })
      .returning();

    return new Collection(
      created.id,
      created.orgId,
      created.slug,
      created.name,
      created.description,
      created.icon,
      created.color,
      created.visibility as 'private' | 'org' | 'public',
      created.createdByUserId,
      created.tableCode,
      created.storageMode as 'single_table' | 'dedicated_table',
      created.physicalTable,
      created.createdAt,
      created.updatedAt
    );
  }

  async findById(id: string): Promise<Collection | null> {
    const [collection] = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.id, id))
      .limit(1);

    if (!collection) return null;

    return new Collection(
      collection.id,
      collection.orgId,
      collection.slug,
      collection.name,
      collection.description,
      collection.icon,
      collection.color,
      collection.visibility as 'private' | 'org' | 'public',
      collection.createdByUserId,
      collection.tableCode,
      collection.storageMode as 'single_table' | 'dedicated_table',
      collection.physicalTable,
      collection.createdAt,
      collection.updatedAt
    );
  }

  async findByOrgId(orgId: string): Promise<Collection[]> {
    const collections = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.orgId, orgId));

    return collections.map(
      (c) =>
        new Collection(
          c.id,
          c.orgId,
          c.slug,
          c.name,
          c.description,
          c.icon,
          c.color,
          c.visibility as 'private' | 'org' | 'public',
          c.createdByUserId,
          c.tableCode,
          c.storageMode as 'single_table' | 'dedicated_table',
          c.physicalTable,
          c.createdAt,
          c.updatedAt
        )
    );
  }

  async findByOrgIdAndSlug(orgId: string, slug: string): Promise<Collection | null> {
    const cacheKey = `collection:${orgId}:${slug.toLowerCase()}`;

    // ✅ Check cache first (eliminates extra query)
    const cached = collectionCache.get<Collection>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const [collection] = await db
      .select()
      .from(collectionsTable)
      .where(and(eq(collectionsTable.orgId, orgId), eq(collectionsTable.slug, slug.toLowerCase())))
      .limit(1);

    if (!collection) return null;

    const entity = new Collection(
      collection.id,
      collection.orgId,
      collection.slug,
      collection.name,
      collection.description,
      collection.icon,
      collection.color,
      collection.visibility as 'private' | 'org' | 'public',
      collection.createdByUserId,
      collection.tableCode,
      collection.storageMode as 'single_table' | 'dedicated_table',
      collection.physicalTable,
      collection.createdAt,
      collection.updatedAt
    );

    // Cache the result
    collectionCache.set(cacheKey, entity);
    return entity;
  }

  async update(id: string, updates: Partial<Collection>): Promise<Collection> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug.toLowerCase();
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(collectionsTable)
      .set(updateData)
      .where(eq(collectionsTable.id, id))
      .returning();

    const entity = new Collection(
      updated.id,
      updated.orgId,
      updated.slug,
      updated.name,
      updated.description,
      updated.icon,
      updated.color,
      updated.visibility as 'private' | 'org' | 'public',
      updated.createdByUserId,
      updated.tableCode,
      updated.storageMode as 'single_table' | 'dedicated_table',
      updated.physicalTable,
      updated.createdAt,
      updated.updatedAt
    );

    // ✅ Invalidate cache on update
    const cacheKey = `collection:${entity.orgId}:${entity.slug}`;
    collectionCache.del(cacheKey);

    return entity;
  }

  async delete(id: string): Promise<void> {
    // Get collection before deleting to invalidate cache
    const collection = await this.findById(id);
    
    await db.delete(collectionsTable).where(eq(collectionsTable.id, id));

    // ✅ Invalidate cache on delete
    if (collection) {
      const cacheKey = `collection:${collection.orgId}:${collection.slug}`;
      collectionCache.del(cacheKey);
    }
  }
}

