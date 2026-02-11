/**
 * Collection domain entity
 */
export class Collection {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly slug: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly icon: string | null,
    public readonly color: string | null,
    public readonly visibility: 'private' | 'org' | 'public',
    public readonly createdByUserId: string,
    public readonly tableCode: string,
    public readonly storageMode: 'single_table' | 'dedicated_table',
    public readonly physicalTable: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

