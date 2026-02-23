/**
 * Default Document Template Mapping
 * Maps folder types to default document types/templates
 * 
 * This only sets the default when clicking "New Document".
 * Users can still manually choose any document type later.
 */

import type { AiruFolderType } from '../types';

export type DocumentType = 'TXT' | 'MD' | 'RTF';

/**
 * Maps folder type to default document type
 * @param folderType - The folder type
 * @returns The default document type for that folder
 */
export function getDefaultDocumentType(folderType: AiruFolderType | undefined | null): DocumentType {
  const normalizedType = folderType || 'box';
  
  // Default document template mapping
  const templateMap: Record<AiruFolderType, DocumentType> = {
    box: 'TXT',
    board: 'TXT', // Card
    book: 'MD', // Chapter
    canvas: 'TXT', // Canvas (visual thinking)
    collection: 'TXT', // Item
    contacts: 'TXT', // Contact
    ledger: 'TXT', // Entry
    journal: 'MD', // Entry
    manual: 'MD', // Doc
    notebook: 'TXT', // Note
    pipeline: 'TXT', // Deal
    project: 'TXT', // Task
    wiki: 'MD', // Page
  };
  
  return templateMap[normalizedType] || 'TXT';
}
