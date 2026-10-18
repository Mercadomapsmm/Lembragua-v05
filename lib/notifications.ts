import { AppData, Medicine } from './types';
import { sounds, triggerVibration } from './sound';

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

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
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

export function sendBrowserNotification(title: string, body: string, icon = '/icon.svg'): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon,
        badge: '/icon.svg',
      });
    } catch {
      // ignore
    }
  }
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

// Trigger alert sound & vibration
export function triggerAlertEffects(type: 'water' | 'medicine'): void {
  if (type === 'water') {
    sounds.playWaterDrop();
    triggerVibration([100, 80, 100]);
  } else if (type === 'medicine') {
    sounds.playMedicineAlert();
    triggerVibration([300, 100, 300, 100, 300]);
  }
}
