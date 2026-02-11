/**
 * Organization domain entity
 */
export class Org {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date
  ) {}
}

