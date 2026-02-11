/**
 * Comment domain entity
 */
export class Comment {
  constructor(
    public readonly id: string,
    public readonly postId: string,
    public readonly authorUserId: string,
    public readonly body: string,
    public readonly createdAt: Date,
    // Phase 4: object-storage pointers (unused; for dual-read migration / object storage reads / streaming later)
    public readonly objectKey: string | null,
    public readonly previewObjectKey: string | null,
    public readonly payloadSize: number | null,
    public readonly payloadHash: string | null
  ) {}
}

