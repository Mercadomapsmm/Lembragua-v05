import fs from 'fs';
import os from 'os';
import path from 'path';
import webpush, { PushSubscription } from 'web-push';
import { Medicine } from './types';

const ALERT_REPEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutos
const SCHEDULER_TICK_MS = 15 * 1000; // Verifica a cada 15 segundos no servidor

const VAPID_FILE_PATH = path.join(os.tmpdir(), 'lembragua-vapid-keys.json');
const SUBSCRIPTIONS_FILE_PATH = path.join(os.tmpdir(), 'lembragua-push-subscriptions.json');

export interface SyncedWaterSchedule {
  dailyGoalMl: number;
  consumedMl: number;
  reminderTimes: string[];
  confirmedSlots: string[];
  lastUpdatedDate: string;
}

export interface SyncedMedicineSchedule {
  medicines: Medicine[];
}

export interface AlertTrackingEntry {
  date: string;
  lastTriggeredAt: number;
  count: number;
}

export interface PushSubscriberRecord {
  subscription: PushSubscription;
  notificationsEnabled: boolean;
  timeZone: string;
  timezoneOffsetMinutes: number;
  water: SyncedWaterSchedule;
  medicine: SyncedMedicineSchedule;
  alertTracking: Record<string, AlertTrackingEntry>;
  updatedAt: number;
}

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

interface GlobalPushState {
  vapidKeys?: VapidKeys;
  vapidConfigured?: boolean;
  subscribers?: Map<string, PushSubscriberRecord>;
  schedulerTimer?: ReturnType<typeof setInterval>;
  isChecking?: boolean;
}

const globalForPush = globalThis as unknown as {
  __lembraguaPushState?: GlobalPushState;
};

function getGlobalState(): GlobalPushState {
  if (!globalForPush.__lembraguaPushState) {
    globalForPush.__lembraguaPushState = {};
  }
  return globalForPush.__lembraguaPushState;
}

function isValidEnvKey(val: string | undefined): val is string {
  return Boolean(val && val.trim().length > 20 && !val.startsWith('MY_'));
}

function getOrCreateVapidKeys(): VapidKeys {
  const state = getGlobalState();
  if (state.vapidKeys) {
    return state.vapidKeys;
  }

  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (isValidEnvKey(envPub) && isValidEnvKey(envPriv)) {
    state.vapidKeys = { publicKey: envPub.trim(), privateKey: envPriv.trim() };
    return state.vapidKeys;
  }

  try {
    if (fs.existsSync(VAPID_FILE_PATH)) {
      const raw = fs.readFileSync(VAPID_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<VapidKeys>;
      if (parsed.publicKey && parsed.privateKey) {
        state.vapidKeys = {
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
        };
        return state.vapidKeys;
      }
    }
  } catch {
    // Fallback to generating fresh keys
  }

  const generated = webpush.generateVAPIDKeys();
  state.vapidKeys = generated;
  try {
    fs.writeFileSync(VAPID_FILE_PATH, JSON.stringify(generated, null, 2), 'utf-8');
  } catch {
    // Ignore write failure on read-only tmp
  }
  return generated;
}

function ensureWebPushConfigured(): VapidKeys {
  const state = getGlobalState();
  const keys = getOrCreateVapidKeys();
  if (!state.vapidConfigured) {
    const subject =
      process.env.VAPID_SUBJECT && process.env.VAPID_SUBJECT.trim().length > 0
        ? process.env.VAPID_SUBJECT.trim()
        : 'mailto:contato@lembragua.app';
    webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
    state.vapidConfigured = true;
  }
  return keys;
}

function loadSubscribersMap(): Map<string, PushSubscriberRecord> {
  const state = getGlobalState();
  if (state.subscribers) {
    return state.subscribers;
  }

  const map = new Map<string, PushSubscriberRecord>();
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE_PATH)) {
      const raw = fs.readFileSync(SUBSCRIPTIONS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, PushSubscriberRecord>;
      for (const [endpoint, record] of Object.entries(parsed)) {
        if (endpoint && record?.subscription?.endpoint) {
          map.set(endpoint, record);
        }
      }
    }
  } catch {
    // Ignore corrupted cache file
  }

  state.subscribers = map;
  return map;
}

function persistSubscribersMap(): void {
  const map = loadSubscribersMap();
  try {
    const obj: Record<string, PushSubscriberRecord> = {};
    for (const [endpoint, record] of map.entries()) {
      obj[endpoint] = record;
    }
    fs.writeFileSync(SUBSCRIPTIONS_FILE_PATH, JSON.stringify(obj), 'utf-8');
  } catch {
    // Ignore disk persistence error
  }
}

export function getPublicVapidKey(): string {
  ensurePushSchedulerStarted();
  return ensureWebPushConfigured().publicKey;
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getSubscriberLocalClock(
  timeZone: string,
  timezoneOffsetMinutes: number
): { todayStr: string; dayOfWeek: number; currentMinutes: number; clockStr: string } {
  const now = new Date();
  try {
    if (timeZone) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);

      const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
      const year = getPart('year');
      const month = getPart('month');
      const day = getPart('day');
      const rawHour = Number(getPart('hour'));
      const hour = rawHour === 24 ? 0 : rawHour;
      const minute = Number(getPart('minute'));
      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const dayOfWeek = weekdayMap[getPart('weekday')] ?? now.getDay();

      if (year && month && day && !Number.isNaN(hour) && !Number.isNaN(minute)) {
        return {
          todayStr: `${year}-${month}-${day}`,
          dayOfWeek,
          currentMinutes: hour * 60 + minute,
          clockStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        };
      }
    }
  } catch {
    // Fallback to timezoneOffsetMinutes below
  }

  // Fallback calculation using client's Date.getTimezoneOffset() (minutes behind UTC)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const clientDate = new Date(utcMs - (timezoneOffsetMinutes || 0) * 60000);
  const year = clientDate.getFullYear();
  const month = String(clientDate.getMonth() + 1).padStart(2, '0');
  const day = String(clientDate.getDate()).padStart(2, '0');
  const hour = clientDate.getHours();
  const minute = clientDate.getMinutes();

  return {
    todayStr: `${year}-${month}-${day}`,
    dayOfWeek: clientDate.getDay(),
    currentMinutes: hour * 60 + minute,
    clockStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

interface DuePushAlert {
  id: string;
  alertType: 'water' | 'medicine';
  title: string;
  body: string;
  medicineId?: string;
  time: string;
  scheduledMinutes: number;
}

function computeDueAlertsForSubscriber(
  record: PushSubscriberRecord,
  todayStr: string,
  dayOfWeek: number,
  currentMinutes: number
): DuePushAlert[] {
  const alerts: DuePushAlert[] = [];

  // 1. Remédios pendentes cujo horário já chegou hoje
  const medicines = Array.isArray(record.medicine?.medicines) ? record.medicine.medicines : [];
  for (const med of medicines) {
    if (
      med.frequency === 'specific_days' &&
      Array.isArray(med.specificDays) &&
      med.specificDays.length > 0 &&
      !med.specificDays.includes(dayOfWeek)
    ) {
      continue;
    }

    const times = Array.isArray(med.times) ? med.times : [];
    const history = Array.isArray(med.history) ? med.history : [];
    for (const t of times) {
      const schedMinutes = timeToMinutes(t);
      if (currentMinutes >= schedMinutes) {
        const alreadyTaken = history.some((h) => h.date === todayStr && h.time === t);
        if (!alreadyTaken) {
          alerts.push({
            id: `med-${med.id}-${t}`,
            alertType: 'medicine',
            title: `💊 Hora do remédio: ${med.name}`,
            body: `Dosagem: ${med.dosage}.${med.notes ? ` (${med.notes})` : ''}`,
            medicineId: med.id,
            time: t,
            scheduledMinutes: schedMinutes,
          });
        }
      }
    }
  }

  // 2. Água pendente cujo horário já chegou hoje (com virada automática de dia à meia-noite)
  const isSameDay = record.water?.lastUpdatedDate === todayStr;
  const consumedMl = isSameDay ? record.water?.consumedMl || 0 : 0;
  const dailyGoalMl = record.water?.dailyGoalMl || 2450;
  const confirmedSlots = isSameDay ? record.water?.confirmedSlots || [] : [];
  const reminderTimes = Array.isArray(record.water?.reminderTimes)
    ? record.water.reminderTimes
    : [];

  if (consumedMl < dailyGoalMl) {
    for (const t of reminderTimes) {
      const schedMinutes = timeToMinutes(t);
      if (currentMinutes >= schedMinutes && !confirmedSlots.includes(t)) {
        alerts.push({
          id: `water-${t}`,
          alertType: 'water',
          title: '💧 Hora de beber água!',
          body: 'Mantenha seu corpo hidratado. Beba um copo de água agora.',
          time: t,
          scheduledMinutes: schedMinutes,
        });
      }
    }
  }

  return alerts.sort((a, b) => b.scheduledMinutes - a.scheduledMinutes);
}

async function sendWebPushPayload(
  subscription: PushSubscription,
  payload: Record<string, unknown>
): Promise<'sent' | 'gone' | 'error'> {
  ensureWebPushConfigured();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 180,
      urgency: 'high',
    });
    return 'sent';
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return 'gone';
    }
    return 'error';
  }
}

async function evaluateAllSubscribers(): Promise<void> {
  const state = getGlobalState();
  if (state.isChecking) return;
  state.isChecking = true;

  try {
    const map = loadSubscribersMap();
    if (map.size === 0) return;

    let dirty = false;
    const nowMs = Date.now();

    for (const [endpoint, record] of map.entries()) {
      if (!record.notificationsEnabled) continue;

      const { todayStr, dayOfWeek, currentMinutes } = getSubscriberLocalClock(
        record.timeZone,
        record.timezoneOffsetMinutes
      );

      // Virada automática de dia no servidor caso o app esteja fechado desde ontem
      if (record.water && record.water.lastUpdatedDate !== todayStr) {
        record.water.consumedMl = 0;
        record.water.confirmedSlots = [];
        record.water.lastUpdatedDate = todayStr;
        dirty = true;
      }

      const dueAlerts = computeDueAlertsForSubscriber(
        record,
        todayStr,
        dayOfWeek,
        currentMinutes
      );
      const dueIds = new Set(dueAlerts.map((a) => a.id));

      // Limpa rastreamentos que já foram confirmados ou são de dias anteriores
      for (const trackedId of Object.keys(record.alertTracking || {})) {
        const entry = record.alertTracking[trackedId];
        if (!dueIds.has(trackedId) || entry.date !== todayStr) {
          delete record.alertTracking[trackedId];
          dirty = true;
        }
      }

      // Aciona o alerta pendente principal a cada 3 minutos até ser confirmado
      for (const alert of dueAlerts) {
        const existing = record.alertTracking?.[alert.id];
        const shouldFire =
          !existing ||
          existing.date !== todayStr ||
          nowMs - existing.lastTriggeredAt >= ALERT_REPEAT_INTERVAL_MS;

        if (shouldFire) {
          const nextCount = existing && existing.date === todayStr ? existing.count + 1 : 1;
          record.alertTracking = record.alertTracking || {};
          record.alertTracking[alert.id] = {
            date: todayStr,
            lastTriggeredAt: nowMs,
            count: nextCount,
          };
          dirty = true;

          const titleWithRepeat =
            nextCount > 1 ? `(${nextCount}º aviso) ${alert.title}` : alert.title;

          const result = await sendWebPushPayload(record.subscription, {
            type: 'ALARM',
            alert: {
              id: alert.id,
              alertType: alert.alertType,
              title: titleWithRepeat,
              rawTitle: alert.title,
              body: `${alert.body} (Repete a cada 3 min até confirmar)`,
              medicineId: alert.medicineId,
              time: alert.time,
              date: todayStr,
              repeatCount: nextCount,
              triggeredAt: nowMs,
            },
          });

          if (result === 'gone') {
            map.delete(endpoint);
            dirty = true;
          }
          break;
        }
      }
    }

    if (dirty) {
      persistSubscribersMap();
    }
  } finally {
    state.isChecking = false;
  }
}

export function ensurePushSchedulerStarted(): void {
  const state = getGlobalState();
  ensureWebPushConfigured();
  if (!state.schedulerTimer) {
    state.schedulerTimer = setInterval(() => {
      evaluateAllSubscribers().catch(() => {});
    }, SCHEDULER_TICK_MS);
    if (typeof state.schedulerTimer.unref === 'function') {
      state.schedulerTimer.unref();
    }
  }
}

export interface UpsertSubscriberInput {
  subscription: PushSubscription;
  notificationsEnabled: boolean;
  timeZone?: string;
  timezoneOffsetMinutes?: number;
  water: SyncedWaterSchedule;
  medicine: SyncedMedicineSchedule;
  clientActiveAlertIds?: string[];
}

export function upsertPushSubscriber(input: UpsertSubscriberInput): void {
  ensurePushSchedulerStarted();
  const map = loadSubscribersMap();
  const endpoint = input.subscription.endpoint;
  const existing = map.get(endpoint);
  const nowMs = Date.now();

  const preservedTracking: Record<string, AlertTrackingEntry> = {
    ...(existing?.alertTracking || {}),
  };

  // Se o cliente acabou de sincronizar um alerta que já disparou no app aberto,
  // evita que o servidor envie push duplicado no mesmo segundo; o próximo será em 3 min
  const { todayStr } = getSubscriberLocalClock(
    input.timeZone || 'America/Sao_Paulo',
    input.timezoneOffsetMinutes ?? 180
  );
  if (Array.isArray(input.clientActiveAlertIds)) {
    for (const id of input.clientActiveAlertIds) {
      if (!preservedTracking[id] || preservedTracking[id].date !== todayStr) {
        preservedTracking[id] = {
          date: todayStr,
          lastTriggeredAt: nowMs,
          count: 1,
        };
      }
    }
  }

  map.set(endpoint, {
    subscription: input.subscription,
    notificationsEnabled: input.notificationsEnabled,
    timeZone: input.timeZone || existing?.timeZone || 'America/Sao_Paulo',
    timezoneOffsetMinutes:
      typeof input.timezoneOffsetMinutes === 'number'
        ? input.timezoneOffsetMinutes
        : existing?.timezoneOffsetMinutes ?? 180,
    water: input.water,
    medicine: input.medicine,
    alertTracking: preservedTracking,
    updatedAt: nowMs,
  });

  persistSubscribersMap();
  evaluateAllSubscribers().catch(() => {});
}

export function removePushSubscriber(endpoint: string): void {
  const map = loadSubscribersMap();
  if (map.delete(endpoint)) {
    persistSubscribersMap();
  }
}

export interface ConfirmSubscriberAlertInput {
  endpoint?: string;
  alertId: string;
  alertType: 'water' | 'medicine';
  time: string;
  medicineId?: string;
  date?: string;
}

export function confirmSubscriberAlert(input: ConfirmSubscriberAlertInput): boolean {
  const map = loadSubscribersMap();
  let updated = false;

  const applyConfirmationToRecord = (record: PushSubscriberRecord) => {
    const { todayStr, clockStr } = getSubscriberLocalClock(
      record.timeZone,
      record.timezoneOffsetMinutes
    );
    const targetDate = input.date || todayStr;

    if (input.alertType === 'water') {
      if (record.water.lastUpdatedDate !== targetDate) {
        record.water.consumedMl = 0;
        record.water.confirmedSlots = [];
        record.water.lastUpdatedDate = targetDate;
      }
      if (!record.water.confirmedSlots.includes(input.time)) {
        record.water.confirmedSlots.push(input.time);
        record.water.consumedMl += 250;
      }
    } else if (input.alertType === 'medicine' && input.medicineId) {
      for (const med of record.medicine.medicines) {
        if (med.id === input.medicineId) {
          const exists = med.history.some(
            (h) => h.date === targetDate && h.time === input.time
          );
          if (!exists) {
            med.history.push({
              date: targetDate,
              time: input.time,
              takenAt: clockStr,
            });
          }
        }
      }
    }

    if (record.alertTracking && record.alertTracking[input.alertId]) {
      delete record.alertTracking[input.alertId];
    }
    record.updatedAt = Date.now();
    updated = true;
  };

  if (input.endpoint && map.has(input.endpoint)) {
    const rec = map.get(input.endpoint)!;
    applyConfirmationToRecord(rec);
  } else {
    // Fallback caso o endpoint não tenha sido enviado pelo SW
    for (const rec of map.values()) {
      applyConfirmationToRecord(rec);
    }
  }

  if (updated) {
    persistSubscribersMap();
  }
  return updated;
}

export function scheduleServerTestPush(
  subscription: PushSubscription,
  delayMs = 5000
): void {
  ensurePushSchedulerStarted();
  const safeDelay = Math.min(Math.max(delayMs, 1000), 30000);
  setTimeout(() => {
    sendWebPushPayload(subscription, {
      type: 'TEST_ALARM',
      alert: {
        id: 'lembragua-test-alarm',
        alertType: 'water',
        title: '🔔 Teste Lembragua (App Off)',
        body: 'Tudo certo! Seus alarmes de água e remédios estão funcionando mesmo com o app fechado.',
        time: new Date().toTimeString().slice(0, 5),
        triggeredAt: Date.now(),
      },
    }).catch(() => {});
  }, safeDelay);
}
