import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/AppError';
import { ICollectionRepository } from '../interfaces/ICollectionRepository';
import { ICollectionFieldRepository } from '../interfaces/ICollectionFieldRepository';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { CreateCollectionInput, UpdateCollectionInput, CreateCollectionFieldInput, UpdateCollectionFieldInput } from '../dtos/collection.dto';
import { TYPES } from '../../core/di/types';
import { Collection } from '../../domain/entities/Collection';
import { CollectionField } from '../../domain/entities/CollectionField';

export interface ICollectionUseCase {
  create(
    orgId: string,
    userId: string,
    input: CreateCollectionInput
  ): Promise<Result<Collection, Error>>;
  findById(id: string, orgId: string): Promise<Result<Collection, Error>>;
  findByOrgId(orgId: string): Promise<Result<Collection[], Error>>;
  update(
    id: string,
    orgId: string,
    userId: string,
    input: UpdateCollectionInput
  ): Promise<Result<Collection, Error>>;
  delete(id: string, orgId: string, userId: string): Promise<Result<void, Error>>;
  createField(
    collectionId: string,
    orgId: string,
    input: CreateCollectionFieldInput
  ): Promise<Result<CollectionField, Error>>;
  updateField(
    fieldId: string,
    collectionId: string,
    orgId: string,
    input: UpdateCollectionFieldInput
  ): Promise<Result<CollectionField, Error>>;
  deleteField(fieldId: string, collectionId: string, orgId: string): Promise<Result<void, Error>>;
  getFields(collectionId: string, orgId: string): Promise<Result<CollectionField[], Error>>;
}

@injectable()
export class CollectionUseCase implements ICollectionUseCase {
  constructor(
    @inject(TYPES.ICollectionRepository) private collectionRepository: ICollectionRepository,
    @inject(TYPES.ICollectionFieldRepository) private fieldRepository: ICollectionFieldRepository,
    @inject(TYPES.IOrgRepository) private orgRepository: IOrgRepository
  ) {}

  /**
   * Generate unique tableCode for collection
   */
  private generateTableCode(orgId: string, slug: string): string {
    // Format: col_<orgId_short>_<slug>
    const orgShort = orgId.substring(0, 8);
    return `col_${orgShort}_${slug.toLowerCase()}`;
  }

  async create(
    orgId: string,
    userId: string,
    input: CreateCollectionInput
  ): Promise<Result<Collection, Error>> {
    // Verify org exists
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Check if slug already exists for this org
    const existing = await this.collectionRepository.findByOrgIdAndSlug(orgId, input.slug);
    if (existing) {
      return Result.err(new ConflictError(`Collection with slug "${input.slug}" already exists in this organization`));
    }

    // Generate tableCode
    const tableCode = this.generateTableCode(orgId, input.slug);

    const collection = await this.collectionRepository.create({
      orgId,
      slug: input.slug,
      name: input.name,
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || null,
      visibility: input.visibility || 'private',
      createdByUserId: userId,
      tableCode,
      storageMode: 'single_table', // V1.1 always uses single_table
      physicalTable: null, // V1.1 always null
    });

    return Result.ok(collection);
  }

  async findById(id: string, orgId: string): Promise<Result<Collection, Error>> {
    const collection = await this.collectionRepository.findById(id);

    if (!collection) {
      return Result.err(new NotFoundError('Collection', id));
    }

    if (collection.orgId !== orgId) {
      return Result.err(new NotFoundError('Collection', id));
    }

    return Result.ok(collection);
  }

  async findByOrgId(orgId: string): Promise<Result<Collection[], Error>> {
    const collections = await this.collectionRepository.findByOrgId(orgId);
    return Result.ok(collections);
  }

  async update(
    id: string,
    orgId: string,
    userId: string,
    input: UpdateCollectionInput
  ): Promise<Result<Collection, Error>> {
    const collection = await this.collectionRepository.findById(id);

    if (!collection) {
      return Result.err(new NotFoundError('Collection', id));
    }

    if (collection.orgId !== orgId) {
      return Result.err(new NotFoundError('Collection', id));
    }

    // If slug is being updated, check for conflicts
    if (input.slug && input.slug !== collection.slug) {
      const existing = await this.collectionRepository.findByOrgIdAndSlug(orgId, input.slug);
      if (existing && existing.id !== id) {
        return Result.err(new ConflictError(`Collection with slug "${input.slug}" already exists in this organization`));
      }
    }

    const updated = await this.collectionRepository.update(id, input);
    return Result.ok(updated);
  }

  async delete(id: string, orgId: string, userId: string): Promise<Result<void, Error>> {
    const collection = await this.collectionRepository.findById(id);

    if (!collection) {
      return Result.err(new NotFoundError('Collection', id));
    }

    if (collection.orgId !== orgId) {
      return Result.err(new NotFoundError('Collection', id));
    }

    await this.collectionRepository.delete(id);
    return Result.ok(undefined);
  }

  async createField(
    collectionId: string,
    orgId: string,
    input: CreateCollectionFieldInput
  ): Promise<Result<CollectionField, Error>> {
    // Verify collection exists and belongs to org
    const collection = await this.collectionRepository.findById(collectionId);
    if (!collection) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    if (collection.orgId !== orgId) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    // Check if key already exists for this collection
    const existing = await this.fieldRepository.findByCollectionIdAndKey(collectionId, input.key);
    if (existing) {
      return Result.err(new ConflictError(`Field with key "${input.key}" already exists in this collection`));
    }

    const field = await this.fieldRepository.create({
      collectionId,
      key: input.key,
      label: input.label,
      type: input.type,
      isRequired: input.isRequired || false,
      order: input.order || 0,
      config: input.config || {},
    });

    return Result.ok(field);
  }

  async updateField(
    fieldId: string,
    collectionId: string,
    orgId: string,
    input: UpdateCollectionFieldInput
  ): Promise<Result<CollectionField, Error>> {
    // Verify collection exists and belongs to org
    const collection = await this.collectionRepository.findById(collectionId);
    if (!collection) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    if (collection.orgId !== orgId) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    // Verify field exists and belongs to collection
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      return Result.err(new NotFoundError('CollectionField', fieldId));
    }

    if (field.collectionId !== collectionId) {
      return Result.err(new NotFoundError('CollectionField', fieldId));
    }

    // If key is being updated, check for conflicts
    if (input.key && input.key !== field.key) {
      const existing = await this.fieldRepository.findByCollectionIdAndKey(collectionId, input.key);
      if (existing && existing.id !== fieldId) {
        return Result.err(new ConflictError(`Field with key "${input.key}" already exists in this collection`));
      }
    }

    const updated = await this.fieldRepository.update(fieldId, input);
    return Result.ok(updated);
  }

  async deleteField(fieldId: string, collectionId: string, orgId: string): Promise<Result<void, Error>> {
    // Verify collection exists and belongs to org
    const collection = await this.collectionRepository.findById(collectionId);
    if (!collection) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    if (collection.orgId !== orgId) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    // Verify field exists and belongs to collection
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      return Result.err(new NotFoundError('CollectionField', fieldId));
    }

    if (field.collectionId !== collectionId) {
      return Result.err(new NotFoundError('CollectionField', fieldId));
    }

    await this.fieldRepository.delete(fieldId);
    return Result.ok(undefined);
  }

  async getFields(collectionId: string, orgId: string): Promise<Result<CollectionField[], Error>> {
    // Verify collection exists and belongs to org
    const collection = await this.collectionRepository.findById(collectionId);
    if (!collection) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    if (collection.orgId !== orgId) {
      return Result.err(new NotFoundError('Collection', collectionId));
    }

    const fields = await this.fieldRepository.findByCollectionId(collectionId);
    return Result.ok(fields);
  }
}

