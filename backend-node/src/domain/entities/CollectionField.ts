/**
 * CollectionField domain entity
 */
export class CollectionField {
  constructor(
    public readonly id: string,
    public readonly collectionId: string,
    public readonly key: string,
    public readonly label: string,
    public readonly type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select',
    public readonly isRequired: boolean,
    public readonly order: number,
    public readonly config: Record<string, any>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

