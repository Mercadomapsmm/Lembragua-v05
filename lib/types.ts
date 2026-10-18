export type HabitTab = 'home' | 'water' | 'medicine' | 'evolution';

export interface WaterHistoryEntry {
  date: string; // 'YYYY-MM-DD'
  amountMl: number;
  goalMl: number;
}

export interface WaterState {
  weightKg: number;
  dailyGoalMl: number;
  consumedMl: number;
  reminderTimes: string[]; // ex: ['08:00', '10:30', '13:00', ...]
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  lastUpdatedDate: string; // 'YYYY-MM-DD'
  history: WaterHistoryEntry[];
}

export type MedicineFrequency = 'daily' | 'interval' | 'specific_days';

export interface MedicineHistoryEntry {
  date: string; // 'YYYY-MM-DD'
  time: string; // '08:00'
  takenAt: string; // '08:05'
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string; // ex: '50mg' ou '1 comprimido'
  times: string[]; // ex: ['08:00', '20:00']
  frequency: MedicineFrequency;
  intervalHours?: number; // ex: 8 (a cada 8 horas)
  specificDays?: number[]; // [1, 2, 3, 4, 5] (dias específicos)
  notes: string; // ex: 'Tomar após as refeições'
  color: string; // hex color
  history: MedicineHistoryEntry[];
}

export interface MedicineState {
  medicines: Medicine[];
  soundEnabled: boolean;
}

export interface AppSettings {
  userName?: string;
  notificationsAllowed: boolean;
  theme?: 'light' | 'dark';
}

export interface AppData {
  water: WaterState;
  medicine: MedicineState;
  settings: AppSettings;
}
