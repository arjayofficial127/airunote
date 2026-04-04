/**
 * User domain entity
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly defaultOrgId: string | null,
    public readonly emailVerifiedAt: Date | null,
    public readonly registrationMfaCodeHash: string | null,
    public readonly registrationMfaExpiresAt: Date | null,
    public readonly registrationMfaAttemptCount: number,
    public readonly registrationMfaLastSentAt: Date | null,
    public readonly createdAt: Date
  ) {}
}

