'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HabitTab, WaterState, MedicineState, AppData } from '@/lib/types';
import { useAppData, loadAppData, getTodayString } from '@/lib/storage';
import {
  checkActiveAlerts,
  ActiveAlert,
  triggerAlertEffects,
  sendBrowserNotification,
  hasNotificationPermission,
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
import { WifiOff, CheckCircle2, RotateCcw } from 'lucide-react';

export default function Page() {
  const [data, updateData] = useAppData();
  const { isInstalled } = usePWAInstall();
  const [currentTab, setCurrentTab] = useState<HabitTab | 'about'>('home');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAppClosed, setIsAppClosed] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    hasNotificationPermission()
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  // Track last triggered timestamp and repeat count for 3-minute recurring alerts
  const alertRepeatTrackingRef = useRef<Map<string, { lastTriggeredAt: number; count: number }>>(new Map());

  // Listen to connectivity changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.onbeforeunload = null;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Synchronize document dark class, color-scheme, status bar, and system navigation bar colors
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const persistedTheme = loadAppData()?.settings?.theme;
      const activeTheme = data?.settings?.theme ?? persistedTheme ?? 'light';
      const isDark = activeTheme === 'dark';
      const systemBarColor = isDark ? '#0f172a' : '#ffffff';
      const scheme = isDark ? 'dark' : 'light';

      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = scheme;
      document.documentElement.style.backgroundColor = systemBarColor;
      if (document.body) {
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
        manifestLink.setAttribute('href', isDark ? '/manifest-dark.json' : '/manifest.webmanifest');
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

  // Periodic alarm verification: aciona de 3 em 3 minutos até ser confirmado
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

      // Se o alerta ativo foi confirmado na interface, fecha a faixa
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
          triggerAlertEffects(alert.type);
          sendBrowserNotification(
            newCount > 1 ? `(${newCount}º aviso) ${alert.title}` : alert.title,
            `${alert.message} (Aciona a cada 3 min até confirmar)`
          );
          break; // Aciona o alerta pendente principal
        }
      }
    };

    // Executa verificação inicial imediata e a cada 5 segundos
    checkAndTriggerAlerts();
    const interval = setInterval(checkAndTriggerAlerts, 5000);

    return () => clearInterval(interval);
  }, [data, activeAlert]);

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

    // Remove do rastreamento de 3 em 3 minutos e fecha o alerta
    alertRepeatTrackingRef.current.delete(alert.id);
    setActiveAlert(null);
  };

  if (!data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#ffffff] dark:bg-[#0f172a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center animate-spin text-sky-600 dark:text-sky-400">
            💧
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Carregando Lembragua.online...</p>
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
    // Fecha diretamente sem pedir nenhuma confirmação
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
        className={
          theme === 'dark'
            ? 'dark min-h-dvh bg-[#0f172a] text-slate-100 flex items-center justify-center p-4 selection:bg-sky-500/30'
            : 'min-h-dvh bg-[#ffffff] text-slate-800 flex items-center justify-center p-4 selection:bg-sky-200'
        }
      >
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-xl animate-fade-in space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Aplicativo Fechado
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Lembragua.online foi encerrado com sucesso. Seus dados de água e remédios continuam 100% salvos no seu aparelho.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 font-semibold">
            Você pode fechar esta aba ou janela com segurança.
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAppClosed(false)}
              className="w-full py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-black text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reabrir Lembragua.online</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        theme === 'dark'
          ? 'dark min-h-dvh bg-[#0f172a] text-slate-100 flex flex-col selection:bg-sky-500/30'
          : 'min-h-dvh bg-[#ffffff] text-slate-800 flex flex-col selection:bg-sky-200'
      }
    >
      {/* Top Header with Close App button */}
      <Header
        currentTab={currentTab as HabitTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={() => setNotificationsEnabled((prev) => !prev)}
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

      {/* Offline Toast Indicator */}
      {!isOnline && (
        <div className="fixed bottom-34 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-800 text-white px-3.5 py-2 text-xs font-bold shadow-lg border border-slate-700">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Modo Offline: tudo salvo no aparelho.</span>
        </div>
      )}

      {/* Modal for App Download / Installation with Icon */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Main Content Area with Smooth Page Transitions */}
      <div className="flex-1 w-full bg-slate-50/60 dark:bg-slate-950 pb-[calc(118px+env(safe-area-inset-bottom,0px))]">
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
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Elevated Quick Navigation Bar (one position above bottom) */}
      <nav className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 w-full z-40 bg-[#ffffff] dark:bg-[#0f172a] shadow-[0_2px_0_0_#ffffff] dark:shadow-[0_2px_0_0_#0f172a] border-t border-slate-200/80 dark:border-slate-800">
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

      {/* Dedicated 56px bottom-0 bar so mobile system navigation bar / chin matches status bar color */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 left-0 right-0 w-full h-[calc(56px+env(safe-area-inset-bottom,0px))] z-40 bg-[#ffffff] dark:bg-[#0f172a] pointer-events-none"
      />
    </div>
  );
}
