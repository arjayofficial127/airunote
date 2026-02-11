/**
 * TeamMember domain entity
 */
export class TeamMember {
  constructor(
    public readonly id: string,
    public readonly teamId: string,
    public readonly userId: string,
    public readonly role: 'member' | 'lead',
    public readonly joinedAt: Date
  ) {}
}

