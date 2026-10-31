import { AppData, Medicine } from './types';
import { sounds, triggerVibration } from './sound';
import {
  mirrorAppDataToIDB,
  recordForegroundAlarmTrigger,
  clearAlarmTrackingInIDB,
  idbSet,
} from './idb';

export const ALERT_REPEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutos

export interface ActiveAlert {
  id: string;
  type: 'water' | 'medicine';
  title: string;
  message: string;
  medicineId?: string;
  time: string;
  scheduledMinutes?: number;
  repeatCount?: number;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((resolve) => setTimeout(() => resolve(reg!), 2000)),
    ]);
    return readyReg || reg;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

export function hasNotificationPermission(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export async function sendBrowserNotification(
  title: string,
  body: string,
  alertMeta?: ActiveAlert,
  todayStr?: string
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const tag = alertMeta?.id || 'lembragua-alert';
  const alertType = alertMeta?.type || 'water';

  if (alertMeta && todayStr) {
    recordForegroundAlarmTrigger(
      alertMeta.id,
      todayStr,
      alertMeta.repeatCount || 1
    ).catch(() => {});
  }

  // Prioriza o ServiceWorkerRegistration.showNotification (obrigatório no Android/PWA e com botões interativos)
  const reg = await getReadyServiceWorker();
  if (reg && 'showNotification' in reg) {
    try {
      const options: NotificationOptions & {
        renotify?: boolean;
        vibrate?: number[];
        actions?: Array<{ action: string; title: string }>;
      } = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        tag,
        renotify: true,
        requireInteraction: true,
        vibrate:
          alertType === 'medicine'
            ? [350, 120, 350, 120, 450]
            : [250, 100, 250, 100, 300],
        data: {
          id: tag,
          alertType,
          medicineId: alertMeta?.medicineId,
          time: alertMeta?.time,
          date: todayStr,
          url: '/',
        },
        actions: [
          { action: 'confirm', title: '✅ Confirmar agora' },
          { action: 'snooze', title: '⏰ Lembrar em 3 min' },
        ],
      };
      await reg.showNotification(title, options);
      return;
    } catch {
      // Fallback para Notification padrão de desktop abaixo
    }
  }

  try {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      tag,
    });
  } catch {
    // ignore
  }
}

export async function closeSystemNotification(alertId: string): Promise<void> {
  clearAlarmTrackingInIDB(alertId).catch(() => {});
  const reg = await getReadyServiceWorker();
  if (!reg) return;
  try {
    reg.active?.postMessage({ type: 'CLEAR_ALERT', alertId });
    const notifications = await reg.getNotifications({ tag: alertId });
    notifications.forEach((n) => n.close());
  } catch {
    // ignore
  }
}

async function ensurePushSubscription(
  reg: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!('pushManager' in reg)) return null;

  try {
    const vapidRes = await fetch('/api/push/vapid', { cache: 'no-store' });
    if (!vapidRes.ok) {
      return await reg.pushManager.getSubscription();
    }
    const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
    if (!publicKey) {
      return await reg.pushManager.getSubscription();
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const existing = await reg.pushManager.getSubscription();

    if (existing) {
      // Verifica se a chave VAPID atual corresponde à assinatura existente
      const existingKey = existing.options?.applicationServerKey;
      if (existingKey) {
        const existingBytes = new Uint8Array(existingKey);
        if (
          existingBytes.length === applicationServerKey.length &&
          existingBytes.every((b, idx) => b === applicationServerKey[idx])
        ) {
          await idbSet('pushEndpoint', existing.endpoint);
          return existing;
        }
        // Chave mudou: renova assinatura silenciosamente
        await existing.unsubscribe().catch(() => {});
      } else {
        await idbSet('pushEndpoint', existing.endpoint);
        return existing;
      }
    }

    const freshSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await idbSet('pushEndpoint', freshSub.endpoint);
    return freshSub;
  } catch {
    try {
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  }
}

async function registerBackgroundSyncCapabilities(
  reg: ServiceWorkerRegistration
): Promise<void> {
  // Periodic Background Sync (para verificação offline em segundo plano quando suportado)
  const regWithPeriodic = reg as ServiceWorkerRegistration & {
    periodicSync?: {
      register: (tag: string, options: { minInterval: number }) => Promise<void>;
    };
    sync?: {
      register: (tag: string) => Promise<void>;
    };
  };

  if (regWithPeriodic.periodicSync) {
    try {
      await regWithPeriodic.periodicSync.register('lembragua-alarm-check', {
        minInterval: 60 * 1000,
      });
    } catch {
      // Permissão opcional do navegador
    }
  }

  if (regWithPeriodic.sync) {
    try {
      await regWithPeriodic.sync.register('lembragua-alarm-sync');
    } catch {
      // ignore
    }
  }
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export async function syncBackgroundSchedule(
  data: AppData,
  notificationsEnabled: boolean,
  activeAlertIds: string[] = []
): Promise<void> {
  if (typeof window === 'undefined') return;

  await mirrorAppDataToIDB(data, notificationsEnabled);

  const reg = await getReadyServiceWorker();
  if (reg) {
    await registerBackgroundSyncCapabilities(reg);
  }

  let sub: PushSubscription | null = null;
  if (reg && notificationsEnabled && hasNotificationPermission()) {
    sub = await ensurePushSubscription(reg);
  } else if (reg && 'pushManager' in reg) {
    sub = await reg.pushManager.getSubscription().catch(() => null);
  }

  if (reg?.active) {
    reg.active.postMessage({
      type: 'SYNC_DATA',
      appData: data,
      notificationsEnabled: notificationsEnabled && hasNotificationPermission(),
      pushEndpoint: sub?.endpoint,
    });
  }

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(() => {
    if (!sub) return;
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    const timezoneOffsetMinutes = new Date().getTimezoneOffset();

    fetch('/api/push/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        notificationsEnabled: notificationsEnabled && hasNotificationPermission(),
        timeZone,
        timezoneOffsetMinutes,
        water: {
          dailyGoalMl: data.water.dailyGoalMl,
          consumedMl: data.water.consumedMl,
          reminderTimes: data.water.reminderTimes,
          confirmedSlots: data.water.confirmedSlots || [],
          lastUpdatedDate: data.water.lastUpdatedDate,
        },
        medicine: {
          medicines: data.medicine.medicines,
        },
        clientActiveAlertIds: activeAlertIds,
      }),
    }).catch(() => {});
  }, 300);
}

export async function enableBackgroundAlarms(data: AppData): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await syncBackgroundSchedule(data, true);
  return true;
}

export async function disableBackgroundAlarms(data: AppData): Promise<void> {
  await syncBackgroundSchedule(data, false);
}

export async function triggerBackgroundTestAlarm(
  data: AppData,
  delayMs = 5000
): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await syncBackgroundSchedule(data, true);
  const reg = await getReadyServiceWorker();

  // 1. Agenda via Service Worker local (funciona mesmo sem internet)
  if (reg?.active) {
    reg.active.postMessage({
      type: 'SCHEDULE_TEST_ALARM',
      delayMs,
    });
  }

  // 2. Agenda via Web Push no servidor (acorda o aparelho mesmo com o app 100% fechado)
  if (reg) {
    const sub = await ensurePushSubscription(reg);
    if (sub) {
      fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          delayMs,
        }),
      }).catch(() => {});
    }
  }

  return true;
}

// Convert "HH:mm" to minutes from 00:00
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Format minutes from 00:00 to "HH:mm"
export function minutesToTime(totalMinutes: number): string {
  let mins = totalMinutes % (24 * 60);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Checks which habit alerts are due and unconfirmed right now
export function checkActiveAlerts(data: AppData, todayStr: string): ActiveAlert[] {
  const alerts: ActiveAlert[] = [];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ...

  // 1. Medicine check (unconfirmed doses whose scheduled time has arrived)
  data.medicine.medicines.forEach((med: Medicine) => {
    // If set to specific days, verify today is scheduled
    if (
      med.frequency === 'specific_days' &&
      med.specificDays &&
      med.specificDays.length > 0 &&
      !med.specificDays.includes(currentDayOfWeek)
    ) {
      return;
    }

    med.times.forEach((t) => {
      const schedMinutes = timeToMinutes(t);
      if (currentMinutes >= schedMinutes) {
        const alreadyTaken = med.history.some(
          (h) => h.date === todayStr && h.time === t
        );
        if (!alreadyTaken) {
          alerts.push({
            id: `med-${med.id}-${t}`,
            type: 'medicine',
            title: `💊 Hora do remédio: ${med.name}`,
            message: `Dosagem: ${med.dosage}. ${med.notes ? `(${med.notes})` : ''}`,
            medicineId: med.id,
            time: t,
            scheduledMinutes: schedMinutes,
          });
        }
      }
    });
  });

  // 2. Water check (unconfirmed reminder slots whose scheduled time has arrived)
  if (data.water.consumedMl < data.water.dailyGoalMl) {
    const confirmedSlots = data.water.confirmedSlots || [];
    data.water.reminderTimes.forEach((t) => {
      const schedMinutes = timeToMinutes(t);
      if (currentMinutes >= schedMinutes) {
        const alreadyConfirmed = confirmedSlots.includes(t);
        if (!alreadyConfirmed) {
          alerts.push({
            id: `water-${t}`,
            type: 'water',
            title: '💧 Hora de beber água!',
            message: 'Mantenha seu corpo hidratado. Beba um copo de água agora.',
            time: t,
            scheduledMinutes: schedMinutes,
          });
        }
      }
    });
  }

  // Sort alerts with the most recent scheduled time first
  return alerts.sort((a, b) => (b.scheduledMinutes || 0) - (a.scheduledMinutes || 0));
}

// Trigger alert sound & vibration respecting user preferences
export function triggerAlertEffects(
  type: 'water' | 'medicine',
  data?: AppData
): void {
  if (type === 'water') {
    if (data?.water?.soundEnabled !== false) {
      sounds.playWaterDrop();
    }
    if (data?.water?.vibrationEnabled !== false) {
      triggerVibration([100, 80, 100]);
    }
  } else if (type === 'medicine') {
    if (data?.medicine?.soundEnabled !== false) {
      sounds.playMedicineAlert();
    }
    triggerVibration([300, 100, 300, 100, 300]);
  }
}
