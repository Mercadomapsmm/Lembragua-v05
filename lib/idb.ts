import { AppData } from './types';

const IDB_NAME = 'lembragua_bg_db';
const IDB_VERSION = 1;
const STORE_NAME = 'kv';

export interface PendingSWConfirmation {
  id: string;
  alertType: 'water' | 'medicine';
  time: string;
  medicineId?: string;
  date: string;
  confirmedAtClock: string;
}

export interface SharedAlarmTrackingMap {
  [alertId: string]: {
    date: string;
    lastTriggeredAt: number;
    count: number;
  };
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function mirrorAppDataToIDB(
  data: AppData,
  notificationsEnabled?: boolean
): Promise<void> {
  await idbSet('appData', data);
  if (typeof notificationsEnabled === 'boolean') {
    await idbSet('notificationsEnabled', notificationsEnabled);
  }
}

export async function consumePendingSWConfirmations(): Promise<PendingSWConfirmation[]> {
  const list = (await idbGet<PendingSWConfirmation[]>('pendingConfirmations')) || [];
  if (list.length > 0) {
    await idbSet('pendingConfirmations', []);
  }
  return list;
}

export async function recordForegroundAlarmTrigger(
  alertId: string,
  dateStr: string,
  count: number
): Promise<void> {
  const tracking = (await idbGet<SharedAlarmTrackingMap>('alarmTracking')) || {};
  tracking[alertId] = {
    date: dateStr,
    lastTriggeredAt: Date.now(),
    count,
  };
  await idbSet('alarmTracking', tracking);
}

export async function clearAlarmTrackingInIDB(alertId: string): Promise<void> {
  const tracking = (await idbGet<SharedAlarmTrackingMap>('alarmTracking')) || {};
  if (tracking[alertId]) {
    delete tracking[alertId];
    await idbSet('alarmTracking', tracking);
  }
}
