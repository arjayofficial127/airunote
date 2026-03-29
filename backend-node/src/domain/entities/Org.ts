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
    public readonly createdAt: Date,
    public readonly plan?: string,
    public readonly subscriptionStatus?: string | null,
    public readonly subscriptionId?: string | null,
    public readonly currentPeriodEnd?: Date | null
  ) {}
}

