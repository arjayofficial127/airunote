/**
 * JoinRequest domain entity
 */
export class JoinRequest {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly joinCodeId: string | null,
    public readonly status: 'pending' | 'approved' | 'rejected',
    public readonly message: string | null,
    public readonly requestedAt: Date,
    public readonly reviewedAt: Date | null,
    public readonly reviewedByUserId: string | null,
    public readonly rejectionReason: string | null
  ) {}
}

