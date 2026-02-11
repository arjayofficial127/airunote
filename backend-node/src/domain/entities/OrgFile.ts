/**
 * OrgFile domain entity
 * Represents a file in the organization's file library
 */
export class OrgFile {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly ownerUserId: string,
    public readonly storageProvider: string,
    public readonly storageKey: string,
    public readonly url: string,
    public readonly fileName: string,
    public readonly mimeType: string,
    public readonly sizeBytes: number,
    public readonly checksum: string | null,
    public readonly visibility: 'private' | 'org' | 'public' | 'users',
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Phase 4: object-storage pointers (unused; storageKey remains authority; for dual-read migration / streaming later)
    public readonly objectKey: string | null,
    public readonly previewObjectKey: string | null,
    public readonly payloadSize: number | null,
    public readonly payloadHash: string | null
  ) {}
}
