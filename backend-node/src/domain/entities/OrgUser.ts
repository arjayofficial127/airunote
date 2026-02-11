/**
 * OrgUser domain entity
 * Represents a user's membership in an organization
 */
export class OrgUser {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date
  ) {}
}

