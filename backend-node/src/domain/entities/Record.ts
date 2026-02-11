/**
 * CollectionRecord domain entity
 */
export class CollectionRecord {
  constructor(
    public readonly id: string,
    public readonly collectionId: string,
    public readonly orgId: string,
    public readonly data: Record<string, any>,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Phase 4: object-storage pointers (unused; for dual-read migration / object storage reads / streaming later)
    public readonly objectKey: string | null,
    public readonly previewObjectKey: string | null,
    public readonly payloadSize: number | null,
    public readonly payloadHash: string | null
  ) {}
}

