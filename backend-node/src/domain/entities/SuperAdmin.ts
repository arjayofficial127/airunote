/**
 * SuperAdmin domain entity
 */
export class SuperAdmin {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date
  ) {}
}

