/**
 * Phase 3 — Offline storage foundation.
 * IndexedDB bootstrap and versioning only.
 * NO APIs, NO providers, NO sync, NO conflict logic.
 * Org-scoped, app-scoped, user-device owned.
 */

const DB_NAME = 'atomicfuel_offline_v1';
const DB_VERSION = 1;

const STORE_NAMES = ['drafts', 'offlineContent', 'metadataCache', 'snapshots'] as const;
export type OfflineStoreName = (typeof STORE_NAMES)[number];

let dbInstance: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase | null> | null = null;

function isBrowser(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB === 'object';
}

/**
 * Opens the offline DB and creates stores on first run.
 * Returns null when not in a browser (SSR).
 */
export function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openPromise) return openPromise;

  openPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('drafts')) {
        const drafts = db.createObjectStore('drafts', { keyPath: 'localDraftId' });
        drafts.createIndex('orgId', 'orgId', { unique: false });
        drafts.createIndex('appId', 'appId', { unique: false });
      }
      if (!db.objectStoreNames.contains('offlineContent')) {
        const offlineContent = db.createObjectStore('offlineContent', { keyPath: 'offlineItemId' });
        offlineContent.createIndex('orgId', 'orgId', { unique: false });
        offlineContent.createIndex('appId', 'appId', { unique: false });
      }
      if (!db.objectStoreNames.contains('metadataCache')) {
        const metadataCache = db.createObjectStore('metadataCache', { keyPath: 'cacheId' });
        metadataCache.createIndex('orgId', 'orgId', { unique: false });
        metadataCache.createIndex('appId', 'appId', { unique: false });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshots = db.createObjectStore('snapshots', { keyPath: 'snapshotId' });
        snapshots.createIndex('orgId', 'orgId', { unique: false });
        snapshots.createIndex('appId', 'appId', { unique: false });
      }
    };
  });

  return openPromise;
}

/**
 * Returns the open DB instance, or null if not in browser or DB not yet opened.
 * Call openDb() first to ensure DB is ready.
 */
export function getDb(): IDBDatabase | null {
  return dbInstance;
}

/**
 * Returns the DB after opening if needed. Use in store layer for get/put/delete/list/clear.
 */
export async function getDbOrOpen(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return null;
  if (dbInstance) return dbInstance;
  return openDb();
}

/**
 * Closes the DB (e.g. for tests or cleanup). Resets singleton state.
 */
export function closeDb(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    openPromise = null;
  }
  return Promise.resolve();
}
