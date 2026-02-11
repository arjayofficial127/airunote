/**
 * Phase 3 — Snapshots store (opaque payloads).
 * Generic access only: get, put, delete, listByOrgAndApp, clearByOrg.
 * NO domain-specific helpers, NO sync.
 */

import { getDbOrOpen } from '../offlineDb';

export interface SnapshotEntity {
  snapshotId: string;
  orgId: string;
  appId: string;
  createdAt: number;
  itemCount: number;
  estimatedSize: number;
  payload: unknown;
}

const STORE = 'snapshots';

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

export async function get(id: string): Promise<SnapshotEntity | null> {
  return withStore('readonly', (store) => {
    return new Promise<SnapshotEntity | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function put(entity: SnapshotEntity): Promise<void> {
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

export async function listByOrgAndApp(orgId: string, appId: string): Promise<SnapshotEntity[]> {
  return withStore('readonly', (store) => {
    const index = store.index('orgId');
    return new Promise<SnapshotEntity[]>((resolve, reject) => {
      const results: SnapshotEntity[] = [];
      const req = index.openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const item = cursor.value as SnapshotEntity;
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

/** List all snapshots for org (any app). Used by offline summary. */
export async function listByOrg(orgId: string): Promise<SnapshotEntity[]> {
  return withStore('readonly', (store) => {
    const index = store.index('orgId');
    return new Promise<SnapshotEntity[]>((resolve, reject) => {
      const results: SnapshotEntity[] = [];
      const req = index.openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value as SnapshotEntity);
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
