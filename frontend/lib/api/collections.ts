import apiClient from './client';

export type ReadContext =
  | 'list'
  | 'detail'
  | 'edit'
  | 'preview'
  | 'search';

// CollectionFieldConfig interface
// excludeContexts declares where this field must NOT be returned.
// Example: ['list'] means this field is excluded from metadata/list queries.
export interface CollectionFieldConfig {
  excludeContexts?: ReadContext[];
  [key: string]: any; // Allow other config properties
}

export interface Collection {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  visibility: 'private' | 'org' | 'public';
  createdByUserId: string;
  tableCode: string;
  storageMode: 'single_table' | 'dedicated_table';
  physicalTable: string | null;
  createdAt: string;
  updatedAt: string;
  fields?: CollectionField[];
}

export interface CollectionField {
  id: string;
  collectionId: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select';
  isRequired: boolean;
  order: number;
  config: CollectionFieldConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'private' | 'org' | 'public';
}

export interface UpdateCollectionInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'private' | 'org' | 'public';
}

export interface CreateCollectionFieldInput {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select';
  isRequired?: boolean;
  order?: number;
  config?: CollectionFieldConfig;
}

export interface UpdateCollectionFieldInput {
  key?: string;
  label?: string;
  type?: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select';
  isRequired?: boolean;
  order?: number;
  config?: CollectionFieldConfig;
}

// Dev-only guardrail: module-level flag set by MetadataIndexProvider
let isMetadataIndexLoading = false;
export function setMetadataIndexLoadingFlag(value: boolean) {
  if (process.env.NODE_ENV !== 'production') {
    isMetadataIndexLoading = value;
  }
}

export const collectionsApi = {
  list: async (orgId: string): Promise<{ success: boolean; data: Collection[] }> => {
    // Dev-only guardrail: warn if called outside MetadataIndexProvider
    if (process.env.NODE_ENV !== 'production' && !isMetadataIndexLoading) {
      const stack = new Error().stack;
      const isFromProvider = stack?.includes('MetadataIndexProvider');
      if (!isFromProvider) {
        console.warn(
          '[collectionsApi.list] Called outside MetadataIndexProvider. ' +
          'Use useMetadataIndex() instead to avoid duplicate fetches.'
        );
      }
    }
    const response = await apiClient.get(`/orgs/${orgId}/collections`);
    return response.data;
  },

  getById: async (orgId: string, collectionId: string): Promise<{ success: boolean; data: Collection }> => {
    const response = await apiClient.get(`/orgs/${orgId}/collections/${collectionId}`);
    return response.data;
  },

  create: async (orgId: string, input: CreateCollectionInput): Promise<{ success: boolean; data: Collection }> => {
    const response = await apiClient.post(`/orgs/${orgId}/collections`, input);
    return response.data;
  },

  update: async (
    orgId: string,
    collectionId: string,
    input: UpdateCollectionInput
  ): Promise<{ success: boolean; data: Collection }> => {
    const response = await apiClient.patch(`/orgs/${orgId}/collections/${collectionId}`, input);
    return response.data;
  },

  delete: async (orgId: string, collectionId: string): Promise<void> => {
    await apiClient.delete(`/orgs/${orgId}/collections/${collectionId}`);
  },

  createField: async (
    orgId: string,
    collectionId: string,
    input: CreateCollectionFieldInput
  ): Promise<{ success: boolean; data: CollectionField }> => {
    const response = await apiClient.post(`/orgs/${orgId}/collections/${collectionId}/fields`, input);
    return response.data;
  },

  updateField: async (
    orgId: string,
    collectionId: string,
    fieldId: string,
    input: UpdateCollectionFieldInput
  ): Promise<{ success: boolean; data: CollectionField }> => {
    const response = await apiClient.patch(`/orgs/${orgId}/collections/${collectionId}/fields/${fieldId}`, input);
    return response.data;
  },

  deleteField: async (orgId: string, collectionId: string, fieldId: string): Promise<void> => {
    await apiClient.delete(`/orgs/${orgId}/collections/${collectionId}/fields/${fieldId}`);
  },
};

