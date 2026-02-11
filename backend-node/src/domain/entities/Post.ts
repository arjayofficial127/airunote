/**
 * Post domain entity
 */
export class Post {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly authorUserId: string,
    public readonly title: string,
    public readonly body: string,
    public readonly isPublished: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Phase 4: object-storage pointers (unused; for dual-read migration / object storage reads / streaming later)
    public readonly objectKey: string | null,
    public readonly previewObjectKey: string | null,
    public readonly payloadSize: number | null,
    public readonly payloadHash: string | null
  ) {}
}

