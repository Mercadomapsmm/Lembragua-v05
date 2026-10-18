'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALLED_STORAGE_KEY = 'lembragua_app_installed';

function checkIsAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // 1. Check browser display-mode standalone
  const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandaloneMatch) return true;
  // 2. iOS standalone check
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isIOSStandalone) return true;
  // 3. Android WebAPK / TWA referrer
  if (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://')) {
    return true;
  }
  // 4. Stored installation flag in localStorage
  try {
    if (localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch {
    // ignore storage access errors
  }
  return false;
}

function subscribeInstalled(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const handleMediaChange = () => callback();
  mediaQuery.addEventListener('change', handleMediaChange);

  const handleAppInstalled = () => {
    try {
      localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
    } catch {}
    callback();
  };
  window.addEventListener('appinstalled', handleAppInstalled);

  return () => {
    mediaQuery.removeEventListener('change', handleMediaChange);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isInstalled = useSyncExternalStore(
    subscribeInstalled,
    checkIsAppInstalled,
    () => false
  );
  const [isIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const markAsInstalled = () => {
    try {
      localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
      window.dispatchEvent(new Event('appinstalled'));
    } catch {}
  };

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        try {
          localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
        } catch {}
        setDeferredPrompt(null);
        window.dispatchEvent(new Event('appinstalled'));
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
    markAsInstalled,
    prompt: deferredPrompt,
  };
}
