/**
 * OrgUserRole domain entity
 * Represents a role assigned to a user in an organization
 */
export class OrgUserRole {
  constructor(
    public readonly id: string,
    public readonly orgUserId: string,
    public readonly roleId: number,
    public readonly createdAt: Date
  ) {}
}

