import { injectable } from 'tsyringe';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { collectionFieldsTable } from '../db/drizzle/schema';
import { ICollectionFieldRepository } from '../../application/interfaces/ICollectionFieldRepository';
import { CollectionField } from '../../domain/entities/CollectionField';

@injectable()
export class CollectionFieldRepository implements ICollectionFieldRepository {
  async create(field: Omit<CollectionField, 'id' | 'createdAt' | 'updatedAt'>): Promise<CollectionField> {
    const [created] = await db
      .insert(collectionFieldsTable)
      .values({
        collectionId: field.collectionId,
        key: field.key,
        label: field.label,
        type: field.type,
        isRequired: field.isRequired,
        order: field.order,
        config: field.config ?? {},
      })
      .returning();

    return new CollectionField(
      created.id,
      created.collectionId,
      created.key,
      created.label,
      created.type as 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select',
      created.isRequired,
      created.order,
      (created.config as Record<string, any>) || {},
      created.createdAt,
      created.updatedAt
    );
  }

  async findById(id: string): Promise<CollectionField | null> {
    const [field] = await db
      .select()
      .from(collectionFieldsTable)
      .where(eq(collectionFieldsTable.id, id))
      .limit(1);

    if (!field) return null;

    return new CollectionField(
      field.id,
      field.collectionId,
      field.key,
      field.label,
      field.type as 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select',
      field.isRequired,
      field.order,
      (field.config as Record<string, any>) || {},
      field.createdAt,
      field.updatedAt
    );
  }

  async findByCollectionId(collectionId: string): Promise<CollectionField[]> {
    const fields = await db
      .select()
      .from(collectionFieldsTable)
      .where(eq(collectionFieldsTable.collectionId, collectionId))
      .orderBy(collectionFieldsTable.order);

    return fields.map(
      (f) =>
        new CollectionField(
          f.id,
          f.collectionId,
          f.key,
          f.label,
          f.type as 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select',
          f.isRequired,
          f.order,
          (f.config as Record<string, any>) || {},
          f.createdAt,
          f.updatedAt
        )
    );
  }

  async findByCollectionIdAndKey(collectionId: string, key: string): Promise<CollectionField | null> {
    const [field] = await db
      .select()
      .from(collectionFieldsTable)
      .where(and(eq(collectionFieldsTable.collectionId, collectionId), eq(collectionFieldsTable.key, key)))
      .limit(1);

    if (!field) return null;

    return new CollectionField(
      field.id,
      field.collectionId,
      field.key,
      field.label,
      field.type as 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select',
      field.isRequired,
      field.order,
      (field.config as Record<string, any>) || {},
      field.createdAt,
      field.updatedAt
    );
  }

  async update(id: string, updates: Partial<CollectionField>): Promise<CollectionField> {
    const updateData: Record<string, unknown> = {};
    if (updates.key !== undefined) updateData.key = updates.key;
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.isRequired !== undefined) updateData.isRequired = updates.isRequired;
    if (updates.order !== undefined) updateData.order = updates.order;
    if (updates.config !== undefined) updateData.config = updates.config;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(collectionFieldsTable)
      .set(updateData)
      .where(eq(collectionFieldsTable.id, id))
      .returning();

    return new CollectionField(
      updated.id,
      updated.collectionId,
      updated.key,
      updated.label,
      updated.type as 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select',
      updated.isRequired,
      updated.order,
      (updated.config as Record<string, any>) || {},
      updated.createdAt,
      updated.updatedAt
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(collectionFieldsTable).where(eq(collectionFieldsTable.id, id));
  }
}

