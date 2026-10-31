'use client';

import React from 'react';
import { HabitTab, AppData } from '@/lib/types';
import { getTodayString } from '@/lib/storage';
import {
  Droplet,
  Pill,
  CheckCircle2,
  ChevronRight,
  Plus,
  BellRing,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds, triggerVibration } from '@/lib/sound';

interface HomeScreenProps {
  data: AppData;
  onSelectTab: (tab: HabitTab) => void;
  onQuickDrinkWater: (amountMl: number) => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
  notificationsEnabled?: boolean;
  onEnableBackgroundAlarms?: () => void;
  onTestBackgroundAlarm?: () => void;
  testAlarmCountdown?: number | null;
}

export function HomeScreen({
  data,
  onSelectTab,
  onQuickDrinkWater,
  notificationsEnabled = false,
  onEnableBackgroundAlarms,
  onTestBackgroundAlarm,
  testAlarmCountdown = null,
}: HomeScreenProps) {
  const todayStr = getTodayString();

  // Water calculation
  const waterPercent = Math.min(
    100,
    Math.round((data.water.consumedMl / Math.max(1, data.water.dailyGoalMl)) * 100)
  );
  const waterDone = data.water.consumedMl >= data.water.dailyGoalMl;

  // Medicine status: check how many doses left today
  let totalDosesToday = 0;
  let takenDosesToday = 0;
  const currentDayOfWeek = new Date().getDay();

  data.medicine.medicines.forEach((med) => {
    // Check if scheduled for current day of week
    if (
      med.frequency === 'specific_days' &&
      med.specificDays &&
      med.specificDays.length > 0 &&
      !med.specificDays.includes(currentDayOfWeek)
    ) {
      return;
    }

    med.times.forEach((t) => {
      totalDosesToday++;
      const taken = med.history.some((h) => h.date === todayStr && h.time === t);
      if (taken) takenDosesToday++;
    });
  });

  const allMedsDone = totalDosesToday > 0 ? takenDosesToday >= totalDosesToday : true;

  // Quick drink handler with feedback
  const handleQuickDrink = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickDrinkWater(250);
    sounds.playWaterDrop();
    triggerVibration([80, 50, 80]);

    if (data.water.consumedMl + 250 >= data.water.dailyGoalMl && !waterDone) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      sounds.playGoalCelebration();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 animate-fade-in">
      {/* Background / Closed-App Alarm Status & Quick Test */}
      {testAlarmCountdown !== null ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-black text-sm shrink-0 animate-pulse">
              {testAlarmCountdown}s
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200 leading-tight">
                Minimize ou feche o app agora!
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-amber-800 dark:text-amber-300/90 mt-0.5">
                O aviso de teste vai tocar em {testAlarmCountdown} segundo(s) com o app off.
              </p>
            </div>
          </div>
        </div>
      ) : !notificationsEnabled ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/90 dark:bg-slate-900 border-2 border-sky-200 dark:border-sky-800/80 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                Ativar Alarmes com o App Off
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                Receba os avisos de água e remédios mesmo com o app fechado ou tela bloqueada.
              </p>
            </div>
          </div>
          {onEnableBackgroundAlarms && (
            <button
              type="button"
              onClick={onEnableBackgroundAlarms}
              className="w-full sm:w-auto px-3.5 py-2 min-h-[38px] rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              Ativar Avisos
            </button>
          )}
        </div>
      ) : (
        <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200/90 dark:border-emerald-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
              Alarmes ativos mesmo com o app off
            </span>
          </div>
          {onTestBackgroundAlarm && (
            <button
              type="button"
              onClick={onTestBackgroundAlarm}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100/70 dark:hover:bg-slate-700 border border-emerald-200 dark:border-emerald-800 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 transition active:scale-95 cursor-pointer shrink-0"
              title="Agenda um aviso real para daqui a 5 segundos para testar com o app fechado"
            >
              <Sparkles className="w-3 h-3" />
              <span>Testar c/ app off (5s)</span>
            </button>
          )}
        </div>
      )}

      {/* 2 Big Cards - 1 Tap Away (Water and Medicine) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
        {/* 1º WATER CARD */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectTab('water')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectTab('water')}
          className="group relative text-left p-4 sm:p-5 lg:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-600 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer flex flex-col justify-between"
        >
          {/* Card Top */}
          <div>
            <div className="flex items-start justify-between gap-2.5 mb-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-inner group-hover:bg-sky-200 transition shrink-0">
                <Droplet className="w-7 h-7 sm:w-8 sm:h-8 fill-sky-500 stroke-sky-600" />
              </div>
              {waterDone ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Meta Atingida!
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800 shrink-0">
                  {waterPercent}%
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-sky-600 transition">
              1. Beber Água
            </h3>
            <div className="flex items-center justify-between gap-2 mt-0.5 flex-wrap">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                Meta: {data.water.dailyGoalMl.toLocaleString('pt-BR')} ml por dia
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTab('evolution');
                }}
                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                title="Ver tela de evolução"
              >
                Evolução →
              </button>
            </div>

            {/* Visual water level bar */}
            <div className="mt-3.5 space-y-1">
              <div className="w-full h-3 bg-sky-50 dark:bg-slate-800 rounded-full overflow-hidden border border-sky-100 dark:border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 pt-0.5">
                <span>{data.water.consumedMl.toLocaleString('pt-BR')} ml</span>
                <span className="text-slate-400 dark:text-slate-500">
                  falta {Math.max(0, data.water.dailyGoalMl - data.water.consumedMl)} ml
                </span>
              </div>
            </div>

            {/* Horários de hoje com risco quando confirmados */}
            <div className="mt-3.5 p-2.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Horários de hoje:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {data.water.reminderTimes.map((t) => {
                  const isConfirmed =
                    (data.water.confirmedSlots || []).includes(t) ||
                    data.water.consumedMl >= data.water.dailyGoalMl;
                  return (
                    <span
                      key={t}
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md transition ${
                        isConfirmed
                          ? 'line-through decoration-emerald-500 dark:decoration-emerald-400 decoration-2 text-slate-400 dark:text-slate-500 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800'
                          : 'text-sky-800 dark:text-sky-200 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 shadow-2xs'
                      }`}
                      title={isConfirmed ? `${t} - Confirmado` : `${t} - Pendente`}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleQuickDrink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              title="Registrar um copo d'água agora"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 250 ml agora</span>
            </button>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center group-hover:translate-x-1 transition shrink-0">
              Abrir <ChevronRight className="w-4 h-4 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 2º MEDICINE CARD */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectTab('medicine')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectTab('medicine')}
          className="group relative text-left p-4 sm:p-5 lg:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-2.5 mb-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner group-hover:bg-amber-200 transition shrink-0">
                <Pill className="w-7 h-7 sm:w-8 sm:h-8 fill-amber-300 stroke-amber-600" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                {data.medicine.medicines.length} cadastrado(s)
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-amber-600 transition">
              2. Remédios
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Horários regulares • Aviso até confirmar
            </p>

            <div className="mt-3.5 p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Doses de hoje:</span>
              <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
                {totalDosesToday > 0
                  ? `${takenDosesToday} de ${totalDosesToday} tomadas`
                  : 'Nenhum programado'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400 truncate">
              {allMedsDone ? 'Tudo em dia! ✨' : 'Doses pendentes'}
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center group-hover:translate-x-1 transition shrink-0">
              Abrir <ChevronRight className="w-4 h-4 ml-0.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
