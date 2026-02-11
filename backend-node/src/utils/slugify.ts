/**
 * Slug utility functions
 * Normalizes strings to URL-friendly slugs
 */

/**
 * Normalize a string to a URL-friendly slug
 * - Lowercase
 * - Remove special characters
 * - Replace spaces/hyphens/underscores with single hyphens
 * - Trim leading/trailing hyphens
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/hyphens/underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Check if a slug is valid (non-empty after normalization)
 */
export function isValidSlug(slug: string): boolean {
  return slugify(slug).length > 0;
}
