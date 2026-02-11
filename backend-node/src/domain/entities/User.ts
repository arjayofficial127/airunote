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
    public readonly createdAt: Date
  ) {}
}

