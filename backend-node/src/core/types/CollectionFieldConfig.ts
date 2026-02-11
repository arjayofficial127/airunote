import { ReadContext } from './ReadContext';

/**
 * CollectionFieldConfig interface
 * Defines the shape of the config object for collection fields
 */
export interface CollectionFieldConfig {
  // excludeContexts declares where this field must NOT be returned.
  // Example: ['list'] means this field is excluded from metadata/list queries.
  excludeContexts?: ReadContext[];
  [key: string]: any; // Allow other config properties
}
