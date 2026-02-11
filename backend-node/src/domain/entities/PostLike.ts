/**
 * PostLike domain entity
 * Uses composite key (postId, userId) instead of separate id
 */
export class PostLike {
  constructor(
    public readonly postId: string,
    public readonly userId: string,
    public readonly createdAt: Date
  ) {}
}

