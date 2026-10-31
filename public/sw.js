// Lembragua Service Worker - Background Alarms, Web Push & Offline Cache
const CACHE_NAME = 'lembragua-pwa-v13';
const IDB_NAME = 'lembragua_bg_db';
const IDB_VERSION = 1;
const STORE_NAME = 'kv';
const REPEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutos

const ASSETS_TO_CACHE = [
  '/',
  '/icon.svg',
  '/icon-96.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
  '/manifest.json',
  '/manifest-dark.json',
];

// --- IndexedDB Helpers ---
function openSWDB() {
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

async function idbGet(key) {
  const db = await openSWDB();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function idbSet(key, value) {
  const db = await openSWDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// --- Date & Alarm Evaluation Helpers ---
function getLocalClock() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = d.getHours();
  const minute = d.getMinutes();
  return {
    todayStr: `${year}-${month}-${day}`,
    dayOfWeek: d.getDay(),
    currentMinutes: hour * 60 + minute,
    clockStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function evaluateDueAlerts(appData, todayStr, dayOfWeek, currentMinutes) {
  if (!appData) return [];
  const alerts = [];

  // 1. Remédios
  const medicines = Array.isArray(appData.medicine?.medicines)
    ? appData.medicine.medicines
    : [];
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
            body: `Dosagem: ${med.dosage}.${med.notes ? ` (${med.notes})` : ''} (Repete a cada 3 min até confirmar)`,
            medicineId: med.id,
            time: t,
            date: todayStr,
            scheduledMinutes: schedMinutes,
          });
        }
      }
    }
  }

  // 2. Água
  const isSameDay = appData.water?.lastUpdatedDate === todayStr;
  const consumedMl = isSameDay ? appData.water?.consumedMl || 0 : 0;
  const dailyGoalMl = appData.water?.dailyGoalMl || 2450;
  const confirmedSlots = isSameDay ? appData.water?.confirmedSlots || [] : [];
  const reminderTimes = Array.isArray(appData.water?.reminderTimes)
    ? appData.water.reminderTimes
    : [];

  if (consumedMl < dailyGoalMl) {
    for (const t of reminderTimes) {
      const schedMinutes = timeToMinutes(t);
      if (currentMinutes >= schedMinutes && !confirmedSlots.includes(t)) {
        alerts.push({
          id: `water-${t}`,
          alertType: 'water',
          title: '💧 Hora de beber água!',
          body: 'Mantenha seu corpo hidratado. Beba um copo de água agora. (Repete a cada 3 min até confirmar)',
          time: t,
          date: todayStr,
          scheduledMinutes: schedMinutes,
        });
      }
    }
  }

  return alerts.sort((a, b) => b.scheduledMinutes - a.scheduledMinutes);
}

async function displaySystemAlarmNotification(alertData) {
  const isTest = alertData.id === 'lembragua-test-alarm';
  const actions = isTest
    ? [{ action: 'open', title: 'Abrir Lembragua' }]
    : [
        { action: 'confirm', title: '✅ Confirmar agora' },
        { action: 'snooze', title: '⏰ Lembrar em 3 min' },
      ];

  await self.registration.showNotification(alertData.title, {
    body: alertData.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: alertData.id,
    renotify: true,
    requireInteraction: !isTest,
    vibrate:
      alertData.alertType === 'medicine'
        ? [350, 120, 350, 120, 450]
        : [250, 100, 250, 100, 300],
    data: {
      ...alertData,
      url: '/',
    },
    actions,
  });

  // Notifica janelas abertas ou minimizadas para tocar o som/banner também
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of windowClients) {
    client.postMessage({
      type: 'SW_ALARM_TRIGGERED',
      alert: alertData,
    });
  }
}

async function checkOfflineAlarmsInSW() {
  const enabled = await idbGet('notificationsEnabled');
  if (!enabled) return;

  const appData = await idbGet('appData');
  if (!appData) return;

  const { todayStr, dayOfWeek, currentMinutes } = getLocalClock();
  const dueAlerts = evaluateDueAlerts(appData, todayStr, dayOfWeek, currentMinutes);
  const dueIds = new Set(dueAlerts.map((a) => a.id));

  const tracking = (await idbGet('alarmTracking')) || {};
  let trackingChanged = false;

  for (const key of Object.keys(tracking)) {
    if (!dueIds.has(key) || tracking[key].date !== todayStr) {
      delete tracking[key];
      trackingChanged = true;
    }
  }

  const nowMs = Date.now();
  for (const alert of dueAlerts) {
    const existing = tracking[alert.id];
    if (
      !existing ||
      existing.date !== todayStr ||
      nowMs - existing.lastTriggeredAt >= REPEAT_INTERVAL_MS - 4000
    ) {
      const nextCount = existing && existing.date === todayStr ? existing.count + 1 : 1;
      tracking[alert.id] = {
        date: todayStr,
        lastTriggeredAt: nowMs,
        count: nextCount,
      };
      trackingChanged = true;

      const displayTitle =
        nextCount > 1 ? `(${nextCount}º aviso) ${alert.title}` : alert.title;

      await displaySystemAlarmNotification({
        ...alert,
        title: displayTitle,
        rawTitle: alert.title,
        repeatCount: nextCount,
      });
      break;
    }
  }

  if (trackingChanged) {
    await idbSet('alarmTracking', tracking);
  }
}

// Agenda notificações offline futuras caso o navegador suporte TimestampTrigger
async function scheduleUpcomingTimestampTriggers(appData, enabled) {
  if (!('TimestampTrigger' in self)) return;

  try {
    const existingNotifications = await self.registration.getNotifications({
      includeTriggered: true,
    });
    for (const n of existingNotifications) {
      if (n.tag && n.tag.startsWith('scheduled-')) {
        n.close();
      }
    }
  } catch {
    return;
  }

  if (!enabled || !appData) return;

  const now = new Date();
  const { todayStr, dayOfWeek, currentMinutes } = getLocalClock();

  // Agenda próximos horários de água de hoje
  const confirmedSlots =
    appData.water?.lastUpdatedDate === todayStr
      ? appData.water?.confirmedSlots || []
      : [];
  const waterTimes = Array.isArray(appData.water?.reminderTimes)
    ? appData.water.reminderTimes
    : [];

  for (const t of waterTimes) {
    const mins = timeToMinutes(t);
    if (mins > currentMinutes && !confirmedSlots.includes(t)) {
      const [h, m] = t.split(':').map(Number);
      const target = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        h || 0,
        m || 0,
        0,
        0
      );
      try {
        await self.registration.showNotification('💧 Hora de beber água!', {
          body: 'Mantenha seu corpo hidratado. Beba um copo de água agora.',
          icon: '/icon-192.png',
          badge: '/icon-96.png',
          tag: `scheduled-water-${t}`,
          vibrate: [250, 100, 250, 100, 300],
          showTrigger: new self.TimestampTrigger(target.getTime()),
          data: {
            id: `water-${t}`,
            alertType: 'water',
            time: t,
            date: todayStr,
            url: '/',
          },
          actions: [
            { action: 'confirm', title: '✅ Confirmar agora' },
            { action: 'snooze', title: '⏰ Lembrar em 3 min' },
          ],
        });
      } catch {
        // Ignore if trigger permission missing
      }
    }
  }

  // Agenda próximos horários de remédios de hoje
  const medicines = Array.isArray(appData.medicine?.medicines)
    ? appData.medicine.medicines
    : [];
  for (const med of medicines) {
    if (
      med.frequency === 'specific_days' &&
      Array.isArray(med.specificDays) &&
      med.specificDays.length > 0 &&
      !med.specificDays.includes(dayOfWeek)
    ) {
      continue;
    }

    for (const t of med.times || []) {
      const mins = timeToMinutes(t);
      const alreadyTaken = (med.history || []).some(
        (h) => h.date === todayStr && h.time === t
      );
      if (mins > currentMinutes && !alreadyTaken) {
        const [h, m] = t.split(':').map(Number);
        const target = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h || 0,
          m || 0,
          0,
          0
        );
        try {
          await self.registration.showNotification(`💊 Hora do remédio: ${med.name}`, {
            body: `Dosagem: ${med.dosage}.${med.notes ? ` (${med.notes})` : ''}`,
            icon: '/icon-192.png',
            badge: '/icon-96.png',
            tag: `scheduled-med-${med.id}-${t}`,
            vibrate: [350, 120, 350, 120, 450],
            showTrigger: new self.TimestampTrigger(target.getTime()),
            data: {
              id: `med-${med.id}-${t}`,
              alertType: 'medicine',
              medicineId: med.id,
              time: t,
              date: todayStr,
              url: '/',
            },
            actions: [
              { action: 'confirm', title: '✅ Confirmar agora' },
              { action: 'snooze', title: '⏰ Lembrar em 3 min' },
            ],
          });
        } catch {
          // Ignore if trigger permission missing
        }
      }
    }
  }
}

// --- Lifecycle & Caching ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('PWA caching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      ),
      self.clients.claim(),
      checkOfflineAlarmsInSW().catch(() => {}),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Nunca interceptar rotas de API de push
  if (event.request.url.includes('/api/')) return;

  const isNavigationOrManifest =
    event.request.mode === 'navigate' || event.request.url.includes('manifest');

  if (isNavigationOrManifest) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches
            .match(event.request)
            .then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// --- Web Push Event (Aciona mesmo com o app 100% fechado / tela bloqueada) ---
self.addEventListener('push', (event) => {
  const handlePush = async () => {
    let payload = null;
    try {
      payload = event.data ? event.data.json() : null;
    } catch {
      payload = {
        type: 'ALARM',
        alert: {
          id: 'water-push',
          alertType: 'water',
          title: '🔔 Lembrete Lembragua',
          body: event.data ? event.data.text() : 'Hora de cuidar da sua saúde!',
          time: getLocalClock().clockStr,
          date: getLocalClock().todayStr,
        },
      };
    }

    if (!payload || !payload.alert) {
      await checkOfflineAlarmsInSW();
      return;
    }

    const alert = payload.alert;

    // Evita disparo duplicado do teste caso o fallback local e o servidor cheguem juntos
    if (payload.type === 'TEST_ALARM') {
      const lastTestAt = (await idbGet('lastTestAlarmAt')) || 0;
      if (Date.now() - lastTestAt < 4000) {
        return;
      }
      await idbSet('lastTestAlarmAt', Date.now());
      await displaySystemAlarmNotification(alert);
      return;
    }

    // Registra no rastreamento compartilhado para manter sincronia com o app
    const tracking = (await idbGet('alarmTracking')) || {};
    const existing = tracking[alert.id];
    const nowMs = Date.now();

    // Evita tocar duas vezes no mesmo ciclo se o app em 1º plano acabou de disparar há < 15s
    if (
      existing &&
      existing.date === alert.date &&
      nowMs - existing.lastTriggeredAt < 15000
    ) {
      return;
    }

    tracking[alert.id] = {
      date: alert.date || getLocalClock().todayStr,
      lastTriggeredAt: nowMs,
      count: alert.repeatCount || (existing?.count || 0) + 1,
    };
    await idbSet('alarmTracking', tracking);

    await displaySystemAlarmNotification(alert);
  };

  event.waitUntil(handlePush());
});

// --- Clique na Notificação / Botões Interativos ("Confirmar agora" / "Lembrar em 3 min") ---
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const alertData = notification.data || {};
  const action = event.action;

  notification.close();

  const handleInteraction = async () => {
    if (action === 'snooze') {
      // Fecha a notificação atual; o ciclo de 3 minutos continuará avisando até confirmar
      return;
    }

    if (action === 'confirm' && alertData.id && alertData.id !== 'lembragua-test-alarm') {
      const { todayStr, clockStr } = getLocalClock();
      const targetDate = alertData.date || todayStr;

      // 1. Atualiza o estado local no IndexedDB imediatamente (funciona 100% offline com app fechado!)
      const appData = await idbGet('appData');
      if (appData) {
        if (alertData.alertType === 'water') {
          if (appData.water.lastUpdatedDate !== targetDate) {
            appData.water.consumedMl = 0;
            appData.water.confirmedSlots = [];
            appData.water.lastUpdatedDate = targetDate;
          }
          const slots = appData.water.confirmedSlots || [];
          if (!slots.includes(alertData.time)) {
            appData.water.confirmedSlots = [...slots, alertData.time];
            appData.water.consumedMl = (appData.water.consumedMl || 0) + 250;
          }
        } else if (alertData.alertType === 'medicine' && alertData.medicineId) {
          appData.medicine.medicines = (appData.medicine.medicines || []).map((med) => {
            if (med.id !== alertData.medicineId) return med;
            const exists = (med.history || []).some(
              (h) => h.date === targetDate && h.time === alertData.time
            );
            if (exists) return med;
            return {
              ...med,
              history: [
                ...(med.history || []),
                { date: targetDate, time: alertData.time, takenAt: clockStr },
              ],
            };
          });
        }
        await idbSet('appData', appData);
      }

      // 2. Registra na fila para sincronizar com o localStorage quando o app abrir
      const pending = (await idbGet('pendingConfirmations')) || [];
      pending.push({
        id: alertData.id,
        alertType: alertData.alertType,
        time: alertData.time,
        medicineId: alertData.medicineId,
        date: targetDate,
        confirmedAtClock: clockStr,
      });
      await idbSet('pendingConfirmations', pending);

      // 3. Limpa o rastreamento de repetição de 3 minutos
      const tracking = (await idbGet('alarmTracking')) || {};
      if (tracking[alertData.id]) {
        delete tracking[alertData.id];
        await idbSet('alarmTracking', tracking);
      }

      // 4. Avisa o servidor Web Push (se online) para encerrar as repetições de 3 min
      const pushEndpoint = await idbGet('pushEndpoint');
      fetch('/api/push/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: pushEndpoint,
          alertId: alertData.id,
          alertType: alertData.alertType,
          time: alertData.time,
          medicineId: alertData.medicineId,
          date: targetDate,
        }),
      }).catch(() => {});

      // 5. Notifica qualquer aba aberta do Lembragua
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        client.postMessage({
          type: 'SW_ALERT_CONFIRMED',
          alertId: alertData.id,
        });
      }

      return;
    }

    // Clique padrão no corpo da notificação: foca ou abre o Lembragua
    const windowClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of windowClients) {
      if ('focus' in client) {
        client.postMessage({ type: 'SW_OPEN_APP', alert: alertData });
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(alertData.url || '/');
    }
  };

  event.waitUntil(handleInteraction());
});

// --- Periodic Background Sync & One-off Sync ---
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'lembragua-alarm-check') {
    event.waitUntil(checkOfflineAlarmsInSW());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'lembragua-alarm-sync') {
    event.waitUntil(checkOfflineAlarmsInSW());
  }
});

// --- Mensagens enviadas pelo App ---
let swLocalCheckTimer = null;

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'SYNC_DATA') {
    const syncWork = async () => {
      if (msg.appData) {
        await idbSet('appData', msg.appData);
      }
      if (typeof msg.notificationsEnabled === 'boolean') {
        await idbSet('notificationsEnabled', msg.notificationsEnabled);
      }
      if (msg.pushEndpoint) {
        await idbSet('pushEndpoint', msg.pushEndpoint);
      }
      await scheduleUpcomingTimestampTriggers(
        msg.appData,
        Boolean(msg.notificationsEnabled)
      );

      // Mantém verificação auxiliar enquanto o Service Worker estiver ativo em 2º plano
      if (swLocalCheckTimer) {
        clearInterval(swLocalCheckTimer);
        swLocalCheckTimer = null;
      }
      if (msg.notificationsEnabled) {
        swLocalCheckTimer = setInterval(() => {
          checkOfflineAlarmsInSW().catch(() => {});
        }, 20000);
      }
    };
    event.waitUntil(syncWork());
  } else if (msg.type === 'CHECK_ALARMS') {
    event.waitUntil(checkOfflineAlarmsInSW());
  } else if (msg.type === 'CLEAR_ALERT' && msg.alertId) {
    const clearWork = async () => {
      const tracking = (await idbGet('alarmTracking')) || {};
      if (tracking[msg.alertId]) {
        delete tracking[msg.alertId];
        await idbSet('alarmTracking', tracking);
      }
      const openNotifs = await self.registration.getNotifications({
        tag: msg.alertId,
      });
      for (const n of openNotifs) {
        n.close();
      }
    };
    event.waitUntil(clearWork());
  } else if (msg.type === 'SCHEDULE_TEST_ALARM') {
    const delayMs = typeof msg.delayMs === 'number' ? msg.delayMs : 5000;
    const waitAndFire = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const lastTestAt = (await idbGet('lastTestAlarmAt')) || 0;
          if (Date.now() - lastTestAt >= 4000) {
            await idbSet('lastTestAlarmAt', Date.now());
            await displaySystemAlarmNotification({
              id: 'lembragua-test-alarm',
              alertType: 'water',
              title: '🔔 Teste Lembragua (App Off)',
              body: 'Tudo certo! Seus alarmes de água e remédios estão funcionando mesmo com o app fechado.',
              time: getLocalClock().clockStr,
              date: getLocalClock().todayStr,
            });
          }
        } catch {
          // ignore
        }
        resolve();
      }, delayMs);
    });
    event.waitUntil(waitAndFire);
  }
});
