'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HabitTab, WaterState, MedicineState, AppData } from '@/lib/types';
import {
  useAppData,
  loadAppData,
  getTodayString,
  reconcileBackgroundConfirmations,
} from '@/lib/storage';
import {
  checkActiveAlerts,
  ActiveAlert,
  triggerAlertEffects,
  sendBrowserNotification,
  hasNotificationPermission,
  enableBackgroundAlarms,
  disableBackgroundAlarms,
  syncBackgroundSchedule,
  closeSystemNotification,
  triggerBackgroundTestAlarm,
  ALERT_REPEAT_INTERVAL_MS,
} from '@/lib/notifications';
import { Header } from '@/components/Header';
import { HomeScreen } from '@/components/HomeScreen';
import { WaterHabit } from '@/components/WaterHabit';
import { MedicineHabit } from '@/components/MedicineHabit';
import { EvolutionScreen } from '@/components/EvolutionScreen';
import { AboutModal } from '@/components/AboutModal';
import { ActiveAlertBanner } from '@/components/ActiveAlertBanner';
import { InstallAppModal } from '@/components/InstallAppModal';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { AnimatePresence, motion } from 'motion/react';
import { WifiOff, CheckCircle2, RotateCcw, BellRing, AlertCircle, X } from 'lucide-react';

const BG_PAUSED_KEY = 'lembragua_bg_paused';

export default function Page() {
  const [data, updateData] = useAppData();
  const { isInstalled } = usePWAInstall();
  const [currentTab, setCurrentTab] = useState<HabitTab | 'about'>('home');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAppClosed, setIsAppClosed] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isPaused = localStorage.getItem(BG_PAUSED_KEY) === '1';
    return hasNotificationPermission() && !isPaused;
  });
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [testAlarmCountdown, setTestAlarmCountdown] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  // Track last triggered timestamp and repeat count for 3-minute recurring alerts
  const alertRepeatTrackingRef = useRef<Map<string, { lastTriggeredAt: number; count: number }>>(
    new Map()
  );

  // Listen to connectivity changes & visibility reconciliation from Service Worker
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        reconcileBackgroundConfirmations().catch(() => {});
        const isPaused = localStorage.getItem(BG_PAUSED_KEY) === '1';
        setNotificationsEnabled(hasNotificationPermission() && !isPaused);
      }
    };

    reconcileBackgroundConfirmations().catch(() => {});

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.onbeforeunload = null;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Listen to real-time messages from the Service Worker (background push, confirmations, open)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'SW_ALERT_CONFIRMED') {
        reconcileBackgroundConfirmations().catch(() => {});
        if (msg.alertId) {
          alertRepeatTrackingRef.current.delete(msg.alertId);
          setActiveAlert((prev) => (prev?.id === msg.alertId ? null : prev));
        }
      } else if (msg.type === 'SW_OPEN_APP') {
        setIsAppClosed(false);
        reconcileBackgroundConfirmations().catch(() => {});
      } else if (msg.type === 'SW_ALARM_TRIGGERED' && msg.alert) {
        const swAlert = msg.alert;
        if (swAlert.id === 'lembragua-test-alarm') {
          triggerAlertEffects('water', loadAppData());
          return;
        }
        const nowMs = Date.now();
        alertRepeatTrackingRef.current.set(swAlert.id, {
          lastTriggeredAt: nowMs,
          count: swAlert.repeatCount || 1,
        });
        const mappedType: 'water' | 'medicine' =
          swAlert.alertType === 'medicine' ? 'medicine' : 'water';
        setActiveAlert({
          id: swAlert.id,
          type: mappedType,
          title: swAlert.rawTitle || swAlert.title,
          message: swAlert.body || '',
          medicineId: swAlert.medicineId,
          time: swAlert.time || '',
          repeatCount: swAlert.repeatCount || 1,
        });
        triggerAlertEffects(mappedType, loadAppData());
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // Sync schedule & subscription with Service Worker + Web Push server whenever data or toggle changes
  useEffect(() => {
    if (!data) return;
    const todayStr = getTodayString();
    const currentAlerts = checkActiveAlerts(data, todayStr);
    const activeIds = currentAlerts
      .filter((a) => alertRepeatTrackingRef.current.has(a.id))
      .map((a) => a.id);

    syncBackgroundSchedule(data, notificationsEnabled, activeIds).catch(() => {});
  }, [data, notificationsEnabled]);

  // Countdown timer for 5s closed-app test alarm
  useEffect(() => {
    if (testAlarmCountdown === null || testAlarmCountdown <= 0) return;
    const timer = setTimeout(() => {
      setTestAlarmCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [testAlarmCountdown]);

  // Synchronize document dark class, color-scheme, status bar, and system navigation bar colors
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const persistedTheme = loadAppData()?.settings?.theme;
      const activeTheme = data?.settings?.theme ?? persistedTheme ?? 'light';
      const isDark = activeTheme === 'dark';
      const systemBarColor = isDark ? '#0f172a' : '#ffffff';
      const scheme = isDark ? 'dark' : 'light';

      const cookieAttrs =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? '; path=/; max-age=31536000; SameSite=None; Secure'
          : '; path=/; max-age=31536000; SameSite=Lax';
      document.cookie = `lembragua_theme=${scheme}${cookieAttrs}`;

      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = scheme;
      document.documentElement.style.backgroundColor = systemBarColor;
      if (document.body) {
        document.body.classList.toggle('dark', isDark);
        document.body.style.colorScheme = scheme;
        document.body.style.backgroundColor = systemBarColor;
      }

      // Keep single <meta name="theme-color"> without media queries so status & nav bars match in-app theme
      const existingThemeMetas = document.querySelectorAll('meta[name="theme-color"]');
      if (existingThemeMetas.length > 0) {
        existingThemeMetas.forEach((meta, idx) => {
          if (idx === 0) {
            meta.removeAttribute('media');
            meta.setAttribute('content', systemBarColor);
          } else {
            meta.remove();
          }
        });
      } else {
        const metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        metaThemeColor.setAttribute('content', systemBarColor);
        document.head.appendChild(metaThemeColor);
      }

      let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
      if (!colorSchemeMeta) {
        colorSchemeMeta = document.createElement('meta');
        colorSchemeMeta.setAttribute('name', 'color-scheme');
        document.head.appendChild(colorSchemeMeta);
      }
      colorSchemeMeta.setAttribute('content', scheme);

      let msNavMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
      if (!msNavMeta) {
        msNavMeta = document.createElement('meta');
        msNavMeta.setAttribute('name', 'msapplication-navbutton-color');
        document.head.appendChild(msNavMeta);
      }
      msNavMeta.setAttribute('content', systemBarColor);

      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute('href', `/manifest.webmanifest?theme=${scheme}`);
      }

      // Optional native Android WebView / APK wrapper bridges
      try {
        const win = window as unknown as {
          NavigationBar?: { backgroundColorByHexString?: (hex: string, light?: boolean) => void };
          StatusBar?: { backgroundColorByHexString?: (hex: string) => void };
          Android?: {
            setNavigationBarColor?: (hex: string) => void;
            setStatusBarColor?: (hex: string) => void;
            setSystemBarsColor?: (hex: string) => void;
          };
          ReactNativeWebView?: { postMessage?: (msg: string) => void };
        };
        win.NavigationBar?.backgroundColorByHexString?.(systemBarColor, !isDark);
        win.StatusBar?.backgroundColorByHexString?.(systemBarColor);
        win.Android?.setNavigationBarColor?.(systemBarColor);
        win.Android?.setStatusBarColor?.(systemBarColor);
        win.Android?.setSystemBarsColor?.(systemBarColor);
        win.ReactNativeWebView?.postMessage?.(
          JSON.stringify({ type: 'SYSTEM_BARS_COLOR', color: systemBarColor, dark: isDark })
        );
      } catch {
        // Ignore when running in standard browser/PWA
      }
    }
  }, [data?.settings?.theme]);

  // Specific state updaters
  const updateWater = (updater: (prev: WaterState) => WaterState) => {
    updateData((prev) => ({ ...prev, water: updater(prev.water) }));
  };

  const updateMedicine = (updater: (prev: MedicineState) => MedicineState) => {
    updateData((prev) => ({ ...prev, medicine: updater(prev.medicine) }));
  };

  const restoreAllData = (newData: AppData) => {
    updateData(() => newData);
  };

  const handleEnableBackgroundAlarms = useCallback(async () => {
    const currentData = loadAppData();
    const granted = await enableBackgroundAlarms(currentData);
    if (granted) {
      localStorage.removeItem(BG_PAUSED_KEY);
      setNotificationsEnabled(true);
      setPermissionNotice(null);
      updateData((prev) => ({
        ...prev,
        settings: { ...prev.settings, notificationsAllowed: true },
      }));
    } else {
      setPermissionNotice(
        'Para receber alarmes com o app off, permita as notificações nas configurações do navegador ou do celular.'
      );
    }
  }, [updateData]);

  const handleToggleNotifications = useCallback(async () => {
    if (!notificationsEnabled) {
      await handleEnableBackgroundAlarms();
    } else {
      localStorage.setItem(BG_PAUSED_KEY, '1');
      setNotificationsEnabled(false);
      await disableBackgroundAlarms(loadAppData());
      updateData((prev) => ({
        ...prev,
        settings: { ...prev.settings, notificationsAllowed: false },
      }));
    }
  }, [notificationsEnabled, handleEnableBackgroundAlarms, updateData]);

  const handleTestBackgroundAlarm = useCallback(async () => {
    const currentData = loadAppData();
    const ok = await triggerBackgroundTestAlarm(currentData, 5000);
    if (ok) {
      localStorage.removeItem(BG_PAUSED_KEY);
      setNotificationsEnabled(true);
      setPermissionNotice(null);
      setTestAlarmCountdown(5);
    } else {
      setPermissionNotice(
        'Permita as notificações no navegador/celular para testar o alarme com o app off.'
      );
    }
  }, []);

  // Periodic alarm verification: aciona de 3 em 3 minutos até ser confirmado (inclusive na tela "Fechado")
  useEffect(() => {
    if (!data) return;

    const checkAndTriggerAlerts = () => {
      const todayStr = getTodayString();
      const currentAlerts = checkActiveAlerts(data, todayStr);
      const activeIds = new Set(currentAlerts.map((a) => a.id));

      // Limpa alertas que já foram confirmados ou não estão mais pendentes
      for (const key of alertRepeatTrackingRef.current.keys()) {
        if (!activeIds.has(key)) {
          alertRepeatTrackingRef.current.delete(key);
        }
      }

      // Se o alerta ativo foi confirmado na interface ou pela notificação externa, fecha a faixa
      if (activeAlert && !activeIds.has(activeAlert.id)) {
        setActiveAlert(null);
      }

      const nowMs = Date.now();
      for (const alert of currentAlerts) {
        const tracking = alertRepeatTrackingRef.current.get(alert.id);
        const shouldTrigger =
          !tracking || nowMs - tracking.lastTriggeredAt >= ALERT_REPEAT_INTERVAL_MS;

        if (shouldTrigger) {
          const newCount = (tracking?.count || 0) + 1;
          alertRepeatTrackingRef.current.set(alert.id, {
            lastTriggeredAt: nowMs,
            count: newCount,
          });

          const alertWithRepeat: ActiveAlert = {
            ...alert,
            repeatCount: newCount,
          };

          setActiveAlert(alertWithRepeat);
          triggerAlertEffects(alert.type, data);
          if (notificationsEnabled) {
            sendBrowserNotification(
              newCount > 1 ? `(${newCount}º aviso) ${alert.title}` : alert.title,
              `${alert.message} (Aciona a cada 3 min até confirmar)`,
              alertWithRepeat,
              todayStr
            ).catch(() => {});
          }
          break; // Aciona o alerta pendente principal
        }
      }
    };

    // Executa verificação inicial imediata e a cada 5 segundos
    checkAndTriggerAlerts();
    const interval = setInterval(checkAndTriggerAlerts, 5000);

    return () => clearInterval(interval);
  }, [data, activeAlert, notificationsEnabled]);

  // Quick drink 250ml
  const handleQuickDrinkWater = (amountMl: number) => {
    const todayStr = getTodayString();
    const currentAlerts = checkActiveAlerts(data, todayStr);
    const activeWaterAlert = currentAlerts.find((a) => a.type === 'water');

    updateWater((prev) => ({
      ...prev,
      consumedMl: prev.consumedMl + amountMl,
      confirmedSlots: activeWaterAlert
        ? [
            ...(prev.confirmedSlots || []).filter((s) => s !== activeWaterAlert.time),
            activeWaterAlert.time,
          ]
        : prev.confirmedSlots,
    }));

    if (activeWaterAlert) {
      alertRepeatTrackingRef.current.delete(activeWaterAlert.id);
      closeSystemNotification(activeWaterAlert.id).catch(() => {});
      if (activeAlert?.id === activeWaterAlert.id) {
        setActiveAlert(null);
      }
    }
  };

  // Confirm active alert action
  const handleConfirmAlertAction = (alert: ActiveAlert) => {
    const todayStr = getTodayString();
    if (alert.type === 'water') {
      updateWater((prev) => ({
        ...prev,
        consumedMl: prev.consumedMl + 250,
        confirmedSlots: [
          ...(prev.confirmedSlots || []).filter((s) => s !== alert.time),
          alert.time,
        ],
      }));
    } else if (alert.type === 'medicine' && alert.medicineId) {
      const now = new Date();
      const currentClock = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      updateMedicine((prev) => ({
        ...prev,
        medicines: prev.medicines.map((m) => {
          if (m.id !== alert.medicineId) return m;
          return {
            ...m,
            history: [
              ...m.history.filter(
                (h) => !(h.date === todayStr && h.time === alert.time)
              ),
              { date: todayStr, time: alert.time, takenAt: currentClock },
            ],
          };
        }),
      }));
    }

    // Remove do rastreamento de 3 em 3 minutos e fecha o alerta no app e no sistema
    alertRepeatTrackingRef.current.delete(alert.id);
    closeSystemNotification(alert.id).catch(() => {});
    setActiveAlert(null);
  };

  if (!data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#ffffff] dark:bg-[#0f172a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center animate-spin text-sky-600 dark:text-sky-400">
            💧
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Carregando Lembragua...</p>
        </div>
      </div>
    );
  }

  const theme = data.settings?.theme || 'light';

  const handleToggleTheme = () => {
    updateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: prev.settings?.theme === 'dark' ? 'light' : 'dark',
      },
    }));
  };

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    updateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: newTheme,
      },
    }));
  };

  const handleCloseApp = () => {
    // Sincroniza imediatamente a agenda com o Service Worker e Web Push antes de fechar
    syncBackgroundSchedule(data, notificationsEnabled).catch(() => {});

    if (typeof window !== 'undefined') {
      window.onbeforeunload = null;
      try {
        window.close();
      } catch {
        // Fallback se bloqueado pelo browser
      }
      const nav = window.navigator as unknown as { app?: { exitApp?: () => void } };
      if (nav?.app?.exitApp) {
        try {
          nav.app.exitApp();
        } catch {
          // ignore
        }
      }
    }
    setIsAppClosed(true);
  };

  if (isAppClosed) {
    return (
      <div
        className={`${
          theme === 'dark' ? 'dark ' : ''
        }min-h-dvh bg-[#ffffff] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 selection:bg-sky-200 dark:selection:bg-sky-500/30`}
      >
        {/* Mantém o alerta flutuante ativo mesmo na tela de app fechado */}
        <ActiveAlertBanner
          alert={activeAlert}
          onDismiss={() => setActiveAlert(null)}
          onConfirmAction={handleConfirmAlertAction}
        />

        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-xl animate-fade-in space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Aplicativo em Descanso (Off)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Seus dados de água e remédios estão salvos e protegidos no aparelho.
            </p>
          </div>

          {notificationsEnabled ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 font-bold flex items-center justify-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Alarmes e avisos seguem ativos mesmo com o app fechado.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-semibold">
                Ative os avisos abaixo para ser lembrado mesmo com a aba fechada:
              </div>
              <button
                type="button"
                onClick={handleEnableBackgroundAlarms}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                <span>Ativar Alarmes em 2º Plano</span>
              </button>
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsAppClosed(false)}
              className="w-full py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-black text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reabrir Lembragua</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        theme === 'dark' ? 'dark ' : ''
      }min-h-dvh bg-[#ffffff] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-sky-200 dark:selection:bg-sky-500/30`}
    >
      {/* Top Header with Close App button */}
      <Header
        currentTab={currentTab as HabitTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onCloseApp={handleCloseApp}
      />

      {/* Active Floating Alert (Alarm Simulator & Trigger) */}
      <ActiveAlertBanner
        alert={activeAlert}
        onDismiss={() => setActiveAlert(null)}
        onConfirmAction={handleConfirmAlertAction}
      />

      {/* Permission Guidance Banner (Non-blocking replacement for alert) */}
      {permissionNotice && (
        <div className="max-w-4xl xl:max-w-5xl w-full mx-auto px-3 sm:px-5 md:px-6 pt-3">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 flex items-start justify-between gap-2.5 text-xs font-bold text-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{permissionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setPermissionNotice(null)}
              className="p-0.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-200/50 cursor-pointer shrink-0"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Offline Toast Indicator */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-800 text-white px-3.5 py-2 text-xs font-bold shadow-lg border border-slate-700">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Modo Offline: alarmes locais e dados salvos no aparelho.</span>
        </div>
      )}

      {/* Modal for App Download / Installation with Icon */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Main Content Area with Smooth Page Transitions */}
      <div className="flex-1 w-full bg-slate-50/60 dark:bg-slate-950 pb-[calc(68px+env(safe-area-inset-bottom,0px))]">
        <main className="max-w-4xl xl:max-w-5xl w-full mx-auto px-3 sm:px-5 md:px-6 pt-3 sm:pt-6 pb-4 overflow-x-clip">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {currentTab === 'home' && (
                <HomeScreen
                  data={data}
                  onSelectTab={(tab) => setCurrentTab(tab)}
                  onQuickDrinkWater={handleQuickDrinkWater}
                  onOpenInstall={() => setIsInstallModalOpen(true)}
                  isInstalled={isInstalled}
                  notificationsEnabled={notificationsEnabled}
                  onEnableBackgroundAlarms={handleEnableBackgroundAlarms}
                  onTestBackgroundAlarm={handleTestBackgroundAlarm}
                  testAlarmCountdown={testAlarmCountdown}
                />
              )}
              {currentTab === 'water' && (
                <WaterHabit waterState={data.water} onUpdate={updateWater} />
              )}
              {currentTab === 'medicine' && (
                <MedicineHabit
                  medicineState={data.medicine}
                  onUpdate={updateMedicine}
                />
              )}
              {currentTab === 'evolution' && (
                <EvolutionScreen
                  data={data}
                  onUpdateWater={updateWater}
                  onUpdateMedicine={updateMedicine}
                />
              )}
              {currentTab === 'about' && (
                <AboutModal
                  appData={data}
                  onRestoreData={restoreAllData}
                  onClose={() => setCurrentTab('home')}
                  onSetTheme={handleSetTheme}
                  onOpenInstall={() => setIsInstallModalOpen(true)}
                  isInstalled={isInstalled}
                  notificationsEnabled={notificationsEnabled}
                  onToggleNotifications={handleToggleNotifications}
                  onTestBackgroundAlarm={handleTestBackgroundAlarm}
                  testAlarmCountdown={testAlarmCountdown}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Quick Navigation Bar + Native System Safe-Area Fill */}
      <nav className="fixed bottom-0 left-0 right-0 w-full z-40 pb-[env(safe-area-inset-bottom,0px)] bg-[#ffffff] dark:bg-[#0f172a] border-t border-slate-200/80 dark:border-slate-800 after:content-[''] after:absolute after:left-0 after:right-0 after:top-full after:h-20 after:bg-[#ffffff] dark:after:bg-[#0f172a] after:pointer-events-none">
        <div className="max-w-md sm:max-w-lg lg:max-w-xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-around gap-1 sm:gap-2">
          {/* Home */}
          <button
            type="button"
            onClick={() => setCurrentTab('home')}
            className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 sm:px-3 min-h-[44px] rounded-2xl transition cursor-pointer flex-1 min-w-0 ${
              currentTab === 'home'
                ? 'text-sky-600 dark:text-sky-400 font-black bg-sky-50 dark:bg-sky-950/60 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-lg sm:text-xl leading-none">🏠</span>
            <span className="text-[10px] sm:text-xs font-bold truncate mt-0.5">Início</span>
          </button>

          {/* Water */}
          <button
            type="button"
            onClick={() => setCurrentTab('water')}
            className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 sm:px-3 min-h-[44px] rounded-2xl transition cursor-pointer flex-1 min-w-0 ${
              currentTab === 'water'
                ? 'text-sky-600 dark:text-sky-400 font-black bg-sky-50 dark:bg-sky-950/60 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-lg sm:text-xl leading-none">💧</span>
            <span className="text-[10px] sm:text-xs font-bold truncate mt-0.5">Água</span>
          </button>

          {/* Medicine */}
          <button
            type="button"
            onClick={() => setCurrentTab('medicine')}
            className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 sm:px-3 min-h-[44px] rounded-2xl transition cursor-pointer flex-1 min-w-0 ${
              currentTab === 'medicine'
                ? 'text-amber-600 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-950/60 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-lg sm:text-xl leading-none">💊</span>
            <span className="text-[10px] sm:text-xs font-bold truncate mt-0.5">Remédios</span>
          </button>

          {/* Evolution */}
          <button
            type="button"
            onClick={() => setCurrentTab('evolution')}
            className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 sm:px-3 min-h-[44px] rounded-2xl transition cursor-pointer flex-1 min-w-0 ${
              currentTab === 'evolution'
                ? 'text-teal-600 dark:text-teal-400 font-black bg-teal-50 dark:bg-teal-950/60 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-lg sm:text-xl leading-none">📈</span>
            <span className="text-[10px] sm:text-xs font-bold truncate mt-0.5">Evolução</span>
          </button>

          {/* About / Settings */}
          <button
            type="button"
            onClick={() => setCurrentTab('about')}
            className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 sm:px-3 min-h-[44px] rounded-2xl transition cursor-pointer flex-1 min-w-0 ${
              currentTab === 'about'
                ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-950/60 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-lg sm:text-xl leading-none">⚙️</span>
            <span className="text-[10px] sm:text-xs font-bold truncate mt-0.5">Sobre</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
