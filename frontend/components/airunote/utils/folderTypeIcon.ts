/**
 * Folder Type Icon Utility
 * Returns the appropriate emoji icon for a folder type
 */

export type FolderType = 'box' | 'book' | 'board';

/**
 * Get the emoji icon for a folder type
 * @param type - The folder type ('box' | 'book' | 'board')
 * @returns The emoji icon string
 */
export function getFolderTypeIcon(type: FolderType | undefined | null): string {
  // Default to 'box' if type is missing or invalid
  const normalizedType = type || 'box';
  
  switch (normalizedType) {
    case 'box':
      return '📦';
    case 'book':
      return '📘';
    case 'board':
      return '🗂️';
    default:
      return '📦'; // Fallback to box
  }
}
