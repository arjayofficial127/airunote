/**
 * Phase 3 — Offline content store (saved-for-offline items).
 * Generic access only: get, put, delete, listByOrgAndApp, clearByOrg.
 * NO domain-specific helpers, NO sync.
 */

import { getDbOrOpen } from '../offlineDb';

export interface OfflineContentEntity {
  offlineItemId: string;
  orgId: string;
  appId: string;
  sourceItemId: string;
  payload: unknown;
  savedAt: number;
  payloadHash: string | null;
}

const STORE = 'offlineContent';

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

export async function get(id: string): Promise<OfflineContentEntity | null> {
  return withStore('readonly', (store) => {
    return new Promise<OfflineContentEntity | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function put(entity: OfflineContentEntity): Promise<void> {
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

/** Read-only total count (e.g. for connectivity awareness). */
export async function countAll(): Promise<number> {
  return withStore('readonly', (store) => {
    return new Promise<number>((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function listByOrgAndApp(orgId: string, appId: string): Promise<OfflineContentEntity[]> {
  return withStore('readonly', (store) => {
    const index = store.index('orgId');
    return new Promise<OfflineContentEntity[]>((resolve, reject) => {
      const results: OfflineContentEntity[] = [];
      const req = index.openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const item = cursor.value as OfflineContentEntity;
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

/** List all offline content for org (any app). Used by offline summary. */
export async function listByOrg(orgId: string): Promise<OfflineContentEntity[]> {
  return withStore('readonly', (store) => {
    const index = store.index('orgId');
    return new Promise<OfflineContentEntity[]>((resolve, reject) => {
      const results: OfflineContentEntity[] = [];
      const req = index.openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value as OfflineContentEntity);
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
