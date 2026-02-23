/**
 * Folder Type Icon Utility
 * Returns the appropriate emoji icon for a folder type
 */

import type { AiruFolderType } from '../types';

/**
 * Get the emoji icon for a folder type
 * @param type - The folder type
 * @returns The emoji icon string
 */
export function getFolderTypeIcon(type: AiruFolderType | undefined | null): string {
  // Default to 'box' if type is missing or invalid
  const normalizedType = type || 'box';
  
  switch (normalizedType) {
    case 'box':
      return '📦';
    case 'board':
      return '🗂️';
    case 'book':
      return '📘';
    case 'canvas':
      return '🎨';
    case 'collection':
      return '📚';
    case 'contacts':
      return '👥';
    case 'ledger':
      return '📊';
    case 'journal':
      return '📔';
    case 'manual':
      return '📖';
    case 'notebook':
      return '📓';
    case 'pipeline':
      return '⚡';
    case 'project':
      return '📁';
    case 'wiki':
      return '📝';
    default:
      return '📦'; // Fallback to box
  }
}
