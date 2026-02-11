/**
 * JoinCode domain entity
 */
export class JoinCode {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly code: string,
    public readonly maxUses: number | null,
    public readonly usedCount: number,
    public readonly allowedDomains: string[] | null,
    public readonly isActive: boolean,
    public readonly expiresAt: Date | null,
    public readonly defaultRoleId: number | null,
    public readonly defaultTeamId: string | null,
    public readonly requiresApproval: boolean,
    public readonly welcomeMessage: string | null,
    public readonly visibility: 'private' | 'public',
    public readonly notifyAdminsOnJoin: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

