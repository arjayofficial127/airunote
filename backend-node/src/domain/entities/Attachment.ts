/**
 * Attachment domain entity
 * Represents a file attachment linked to a post
 */
export class Attachment {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly postId: string,
    public readonly authorUserId: string,
    public readonly type: 'image' | 'file' | 'video' | 'link',
    public readonly url: string,
    public readonly fileName: string | null,
    public readonly mimeType: string | null,
    public readonly sizeBytes: number | null,
    public readonly label: string | null,
    public readonly order: number,
    public readonly createdAt: Date
  ) {}
}

