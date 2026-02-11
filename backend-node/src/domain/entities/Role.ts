/**
 * Role domain entity
 * Represents a role (Admin, Member, Viewer)
 */
export class Role {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly code: string
  ) {}
}

