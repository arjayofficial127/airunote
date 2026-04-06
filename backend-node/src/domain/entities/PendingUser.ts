export type PendingUserStatus =
  | 'email_sent'
  | 'verified'
  | 'completed'
  | 'expired'
  | 'locked'
  | 'superseded';

export class PendingUser {
  constructor(
    public readonly id: string,
    public readonly registrationSessionId: string,
    public readonly email: string,
    public readonly ipAddress: string | null,
    public readonly userAgentHash: string | null,
    public readonly verificationCodeHash: string,
    public readonly codeExpiresAt: Date,
    public readonly attempts: number,
    public readonly lastSentAt: Date,
    public readonly verifiedAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly status: PendingUserStatus,
    public readonly tokenVersion: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}