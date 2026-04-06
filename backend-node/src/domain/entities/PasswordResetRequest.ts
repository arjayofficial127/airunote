export class PasswordResetRequest {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly resetTokenHash: string,
    public readonly expiresAt: Date,
    public readonly attempts: number,
    public readonly usedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}