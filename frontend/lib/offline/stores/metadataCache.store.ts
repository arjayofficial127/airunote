/**
 * Phase 3 — Metadata cache store (list cache).
 * Generic access only: get, put, delete, listByOrgAndApp, clearByOrg.
 * NO domain-specific helpers, NO sync.
 */

import { getDbOrOpen } from '../offlineDb';

export interface MetadataCacheEntity {
  cacheId: string;
  orgId: string;
  appId: string;
  listType: string;
  items: unknown;
  updatedAt: number;
}

const STORE = 'metadataCache';

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  return getDbOrOpen().then((db) => {
    if (!db) return Promise.reject(new Error('IndexedDB not available'));
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      fn(store).then(resolve, reject);
      tx.onerror = () => reject(tx.error);
    });
  });
}

export async function get(id: string): Promise<MetadataCacheEntity | null> {
  return withStore('readonly', (store) => {
    return new Promise<MetadataCacheEntity | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function put(entity: MetadataCacheEntity): Promise<void> {
  return withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.put(entity);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/** delete(id) — reserved word in JS, so named deleteById. */
export async function deleteById(id: string): Promise<void> {
  return withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function listByOrgAndApp(orgId: string, appId: string): Promise<MetadataCacheEntity[]> {
  return withStore('readonly', (store) => {
    const index = store.index('orgId');
    return new Promise<MetadataCacheEntity[]>((resolve, reject) => {
      const results: MetadataCacheEntity[] = [];
      const req = index.openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const item = cursor.value as MetadataCacheEntity;
          if (item.appId === appId) results.push(item);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/** List all metadata cache entries for org (any app). Used by offline summary. */
export async function listByOrg(orgId: string): Promise<MetadataCacheEntity[]> {
  return withStore('readonly', (store) => {
    const index = store.index('orgId');
    return new Promise<MetadataCacheEntity[]>((resolve, reject) => {
      const results: MetadataCacheEntity[] = [];
      const req = index.openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value as MetadataCacheEntity);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function clearByOrg(orgId: string): Promise<void> {
  return withStore('readwrite', (store) => {
    const index = store.index('orgId');
    return new Promise<void>((resolve, reject) => {
      const req = index.openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}
