/**
 * Phase 4 load guards: dev-only warnings when heavy content is eager-loaded.
 * NON-BLOCKING; does not throw or change production behavior.
 *
 * Canonical rules (see 03_STREAMING_AND_LOAD_GUARDS.md, 06_NEVER_LOAD_EAGERLY_BANS.md):
 * - NEVER eager load: heavy content bodies, media blobs, historical versions,
 *   cold data, preview payloads (unless explicit), offline snapshots,
 *   draft content not being edited, folder contents (structure only).
 * - ALLOWED eager load: metadata only (ids, titles, slugs, hierarchy, flags, timestamps, counts).
 *
 * TODO Phase 4: Object storage reads, partial payload streaming, preview fetch paths.
 * TODO Phase 4 enforcement: ESLint WARN → ERROR; runtime guard escalation (see 06_NEVER_LOAD_EAGERLY_BANS.md).
 */

/** Options for list/detail queries that can return heavy content. */
export interface HeavyContentLoadOptions {
  /**
   * When true, include full content (body, data, etc.).
   * When false, return metadata only (ids, slugs, flags, timestamps).
   * Default when omitted: true (preserve existing behavior).
   */
  includeContent?: boolean;
}

/** Options for assertMetadataOnly. */
export interface AssertMetadataOnlyOptions {
  /** Field names that count as heavy content. Defaults to DEFAULT_HEAVY_FIELD_NAMES. */
  heavyFields?: string[];
}

/**
 * Default heavy-content field names (NEVER LOAD EAGERLY bans).
 * Used by assertMetadataOnly when no heavyFields override is provided.
 */
export const DEFAULT_HEAVY_FIELD_NAMES = [
  'body',
  'data',
  'content',
  'html',
  'rawContent',
  'blob',
  'snapshot',
  'revisions',
  'folderContents',
  'previewPayload',
] as const;

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'object' && !Array.isArray(value)) return Object.keys(value).length === 0;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Returns true if the item has any of the given heavy fields with non-empty values.
 * Used by assertMetadataOnly (dev-only).
 */
export function hasHeavyContent(
  item: unknown,
  heavyFields: string[] = [...DEFAULT_HEAVY_FIELD_NAMES]
): boolean {
  if (item == null || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return heavyFields.some((f) => !isEmpty(obj[f]));
}

/**
 * Dev-only: assert that returned items do not contain heavy content (metadata-only path).
 * Logs a warning if any item has substantial heavy fields; does not throw.
 * Call from repositories when returning from a metadata-only branch.
 * Stripped/no-op in production; non-blocking.
 *
 * Future: can be upgraded to throw in dev or to ERROR in CI (Phase 4 enforcement escalation).
 */
export function assertMetadataOnly(
  entityType: string,
  method: string,
  items: unknown[] | unknown,
  options?: AssertMetadataOnlyOptions
): void {
  if (!isDev) return;
  const heavyFields = options?.heavyFields ?? [...DEFAULT_HEAVY_FIELD_NAMES];
  const list = Array.isArray(items) ? items : [items];
  for (let i = 0; i < list.length; i++) {
    if (hasHeavyContent(list[i], heavyFields)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Phase 4 assertMetadataOnly] ${entityType}: ${method} returned item(s) with heavy content in a metadata-only path (index ${i}). ` +
          `Remove heavy fields from this branch or use includeContent: true.`
      );
      break; // one warning per call
    }
  }
}

/**
 * Dev-only: warn when a list method returns heavy content.
 * Call from repositories after returning from list methods that load full entities.
 * Does nothing in production; non-blocking.
 */
export function warnHeavyContentList(
  entityType: string,
  method: string,
  count: number
): void {
  if (!isDev || count === 0) return;
  // eslint-disable-next-line no-console
  console.warn(
    `[Phase 4 load guard] ${entityType}: ${method} returned ${count} item(s) with full content. ` +
      `Consider metadataOnly/listMetadataOnly for list endpoints. ` +
      `TODO: object storage reads, partial streaming.`
  );
}
