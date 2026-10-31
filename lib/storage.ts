import { useSyncExternalStore } from 'react';
import { AppData, WaterState, MedicineState } from './types';
import {
  mirrorAppDataToIDB,
  consumePendingSWConfirmations,
  PendingSWConfirmation,
} from './idb';

const STORAGE_KEY = 'habitos_simples_v1';

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DayInfo {
  dateStr: string;
  label: string;
  dayShort: string;
  weekdayName: string;
  dayNumber: number;
}

export function getLast7Days(): DayInfo[] {
  const days: DayInfo[] = [];
  const now = new Date();
  const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dayShorts = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let label = `${day}/${month}`;
    if (i === 0) label = 'Hoje';
    else if (i === 1) label = 'Ontem';

    days.push({
      dateStr,
      label,
      dayShort: dayShorts[d.getDay()],
      weekdayName: weekdayNames[d.getDay()],
      dayNumber: d.getDay(),
    });
  }

  return days;
}

export const defaultInitialData: AppData = {
  water: {
    weightKg: 70,
    dailyGoalMl: 2450, // 70 kg * 35 ml
    consumedMl: 0,
    reminderTimes: ['08:00', '10:30', '13:00', '15:30', '18:00', '20:30'],
    soundEnabled: true,
    vibrationEnabled: true,
    lastUpdatedDate: getTodayString(),
    history: [],
    confirmedSlots: [],
  },
  medicine: {
    medicines: [
      {
        id: 'med-1',
        name: 'Vitamina D / Cálcio',
        dosage: '1 comprimido',
        times: ['08:00'],
        frequency: 'daily',
        notes: 'Tomar junto ao café da manhã com água',
        color: '#0284c7',
        history: [],
      },
      {
        id: 'med-2',
        name: 'Pressão / Protetor',
        dosage: '1 dose',
        times: ['20:00'],
        frequency: 'daily',
        notes: 'Não deitar imediatamente após tomar',
        color: '#7c3aed',
        history: [],
      },
    ],
    soundEnabled: true,
  },
  settings: {
    userName: '',
    notificationsAllowed: false,
    theme: 'light',
  },
};

let cachedData: AppData = defaultInitialData;
let isLoaded = false;
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAppData(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function loadAppData(): AppData {
  if (typeof window === 'undefined') {
    return defaultInitialData;
  }
  if (isLoaded) {
    return cachedData;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedData = defaultInitialData;
      isLoaded = true;
      saveAppData(defaultInitialData);
      return cachedData;
    }
    const parsed = JSON.parse(raw);
    const today = getTodayString();
    let needsSave = false;

    // Validate and sanitize water state
    const water: WaterState = {
      weightKg: typeof parsed.water?.weightKg === 'number' ? parsed.water.weightKg : 70,
      dailyGoalMl: typeof parsed.water?.dailyGoalMl === 'number' ? parsed.water.dailyGoalMl : 2450,
      consumedMl: typeof parsed.water?.consumedMl === 'number' ? parsed.water.consumedMl : 0,
      reminderTimes: Array.isArray(parsed.water?.reminderTimes)
        ? parsed.water.reminderTimes
        : defaultInitialData.water.reminderTimes,
      soundEnabled: parsed.water?.soundEnabled ?? true,
      vibrationEnabled: parsed.water?.vibrationEnabled ?? true,
      lastUpdatedDate: parsed.water?.lastUpdatedDate || today,
      history: Array.isArray(parsed.water?.history) ? parsed.water.history : [],
      confirmedSlots: Array.isArray(parsed.water?.confirmedSlots) ? parsed.water.confirmedSlots : [],
    };

    // New day transition for water tracking
    if (water.lastUpdatedDate !== today) {
      if (water.consumedMl > 0) {
        water.history = [
          ...water.history.slice(-13),
          {
            date: water.lastUpdatedDate,
            amountMl: water.consumedMl,
            goalMl: water.dailyGoalMl,
          },
        ];
      }
      water.consumedMl = 0;
      water.confirmedSlots = [];
      water.lastUpdatedDate = today;
      needsSave = true;
    }

    // Validate and sanitize medicine state
    const medicine: MedicineState = {
      medicines: Array.isArray(parsed.medicine?.medicines)
        ? parsed.medicine.medicines
        : defaultInitialData.medicine.medicines,
      soundEnabled: parsed.medicine?.soundEnabled ?? true,
    };

    // Sanitize settings
    const settings = {
      userName: parsed.settings?.userName || '',
      notificationsAllowed: parsed.settings?.notificationsAllowed ?? false,
      theme: parsed.settings?.theme === 'dark' ? ('dark' as const) : ('light' as const),
    };

    const sanitizedData: AppData = {
      water,
      medicine,
      settings,
    };

    if (needsSave || 'exercise' in parsed || 'sleep' in parsed || 'dailyEmojis' in parsed) {
      saveAppData(sanitizedData);
    } else {
      mirrorAppDataToIDB(sanitizedData).catch(() => {});
    }
    cachedData = sanitizedData;
    isLoaded = true;
    return cachedData;
  } catch (err) {
    console.error('Failed to parse saved data:', err);
    cachedData = defaultInitialData;
    isLoaded = true;
    return cachedData;
  }
}

export function saveAppData(data: AppData): void {
  cachedData = data;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save data:', err);
    }
    mirrorAppDataToIDB(data).catch(() => {});
  }
  emitChange();
}

export async function reconcileBackgroundConfirmations(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const pending: PendingSWConfirmation[] = await consumePendingSWConfirmations();
  if (pending.length === 0) return false;

  const current = loadAppData();
  const todayStr = getTodayString();
  let nextWater: WaterState = { ...current.water };
  let nextMedicines = [...current.medicine.medicines];
  let changed = false;

  for (const item of pending) {
    if (item.alertType === 'water') {
      if (item.date === todayStr) {
        const slots = nextWater.confirmedSlots || [];
        if (!slots.includes(item.time)) {
          nextWater = {
            ...nextWater,
            consumedMl: nextWater.consumedMl + 250,
            confirmedSlots: [...slots, item.time],
          };
          changed = true;
        }
      }
    } else if (item.alertType === 'medicine' && item.medicineId) {
      nextMedicines = nextMedicines.map((med) => {
        if (med.id !== item.medicineId) return med;
        const already = med.history.some(
          (h) => h.date === item.date && h.time === item.time
        );
        if (already) return med;
        changed = true;
        return {
          ...med,
          history: [
            ...med.history,
            {
              date: item.date,
              time: item.time,
              takenAt: item.confirmedAtClock || item.time,
            },
          ],
        };
      });
    }
  }

  if (changed) {
    saveAppData({
      ...current,
      water: nextWater,
      medicine: {
        ...current.medicine,
        medicines: nextMedicines,
      },
    });
  }
  return changed;
}

export function useAppData(): [AppData, (updater: (prev: AppData) => AppData) => void] {
  const data = useSyncExternalStore(
    subscribeAppData,
    () => loadAppData(),
    () => defaultInitialData
  );

  const update = (updater: (prev: AppData) => AppData) => {
    const next = updater(cachedData);
    saveAppData(next);
  };

  return [data, update];
}

export function exportDataAsJSON(data: AppData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lembragua-backup-${getTodayString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function resetAllData(): AppData {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  cachedData = defaultInitialData;
  saveAppData(defaultInitialData);
  return defaultInitialData;
}
