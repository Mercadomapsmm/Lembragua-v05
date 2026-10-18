'use client';

import React, { useState } from 'react';
import { WaterState } from '@/lib/types';
import { getTodayString, getLast7Days } from '@/lib/storage';
import { sounds, triggerVibration } from '@/lib/sound';
import confetti from 'canvas-confetti';
import {
  Droplet,
  RotateCcw,
  Volume2,
  VolumeX,
  Vibrate,
  Clock,
  Award,
  ChevronDown,
  Calendar,
  Scale,
  Calculator,
  Check,
  X,
  Info,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface WaterHabitProps {
  waterState: WaterState;
  onUpdate: (updater: (prev: WaterState) => WaterState) => void;
}

export function WaterHabit({ waterState, onUpdate }: WaterHabitProps) {
  const [selectedGlassMl, setSelectedGlassMl] = useState<number>(250);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [newTime, setNewTime] = useState<string>('09:00');

  // Weight & Goal Calculator state
  const [showWeightCalculator, setShowWeightCalculator] = useState<boolean>(false);
  const [tempWeight, setTempWeight] = useState<number>(() => waterState.weightKg || 70);
  const [mlPerKgRate, setMlPerKgRate] = useState<number>(35); // 35, 40, or 45 ml/kg
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customGoalInput, setCustomGoalInput] = useState<string>('');
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  const percent = Math.min(
    100,
    Math.round((waterState.consumedMl / Math.max(1, waterState.dailyGoalMl)) * 100)
  );
  const isGoalReached = waterState.consumedMl >= waterState.dailyGoalMl;

  // Live calculated goal
  const calculatedGoalMl = isCustomMode && customGoalInput
    ? Math.max(500, Math.min(10000, parseInt(customGoalInput, 10) || Math.round(tempWeight * mlPerKgRate)))
    : Math.round(tempWeight * mlPerKgRate);

  // Add water
  const handleDrink = (amount: number) => {
    onUpdate((prev) => {
      const nextAmount = prev.consumedMl + amount;
      return {
        ...prev,
        consumedMl: nextAmount,
      };
    });

    if (waterState.soundEnabled) {
      sounds.playWaterDrop();
    }
    if (waterState.vibrationEnabled) {
      triggerVibration([80, 50, 80]);
    }

    // Goal reached celebration
    if (waterState.consumedMl + amount >= waterState.dailyGoalMl && !isGoalReached) {
      sounds.playGoalCelebration();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd'],
      });
    }
  };

  // Undo last sip
  const handleUndo = () => {
    onUpdate((prev) => ({
      ...prev,
      consumedMl: Math.max(0, prev.consumedMl - selectedGlassMl),
    }));
  };

  // Apply new goal calculated by weight
  const handleApplyWeightGoal = () => {
    const finalGoal = Math.max(500, Math.min(10000, calculatedGoalMl));
    const finalWeight = Math.max(30, Math.min(250, Math.round(tempWeight)));
    onUpdate((prev) => ({
      ...prev,
      weightKg: finalWeight,
      dailyGoalMl: finalGoal,
    }));

    sounds.playGoalCelebration();
    triggerVibration([100, 60, 100]);
    confetti({
      particleCount: 75,
      spread: 65,
      origin: { y: 0.55 },
      colors: ['#0284c7', '#38bdf8', '#10b981'],
    });

    setToastFeedback(`Meta de ${finalGoal.toLocaleString('pt-BR')} ml calculada para ${finalWeight} kg com sucesso!`);
    setTimeout(() => {
      setToastFeedback(null);
      setShowWeightCalculator(false);
    }, 1800);
  };

  // Add reminder time
  const handleAddTime = () => {
    if (!newTime || waterState.reminderTimes.includes(newTime)) return;
    const sorted = [...waterState.reminderTimes, newTime].sort();
    onUpdate((prev) => ({ ...prev, reminderTimes: sorted }));
  };

  // Remove reminder time
  const handleRemoveTime = (timeToRemove: string) => {
    onUpdate((prev) => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter((t) => t !== timeToRemove),
    }));
  };

  // Generate spaced times (every 2.5 hours)
  const handleGenerateDefaultTimes = () => {
    const defaultTimes = ['08:00', '10:30', '13:00', '15:30', '18:00', '20:30'];
    onUpdate((prev) => ({ ...prev, reminderTimes: defaultTimes }));
  };

  // Test sound
  const handleTestSound = () => {
    sounds.playWaterDrop();
    triggerVibration([100, 60, 100]);
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-fade-in w-full">
      {/* Top 2 Cards: Animated Flask & Metric + Main Action (Stacked on Mobile, 2 Columns on Tablet/Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 items-stretch">
        {/* Top Hero: Animated Flask & Metric */}
        <div className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-900/90 p-4 sm:p-6 rounded-3xl border-2 border-sky-100 dark:border-slate-800 shadow-sm text-center transition-colors flex flex-col justify-between">
          {/* Soft background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-sky-200/40 dark:bg-sky-900/20 rounded-full blur-2xl pointer-events-none" />

          {/* Visual Water Bottle / Glass Container */}
          <div className="relative mx-auto w-28 h-36 sm:w-36 sm:h-48 bg-white/90 dark:bg-slate-800/90 rounded-3xl p-2 sm:p-2.5 border-4 border-sky-300 dark:border-sky-600 shadow-md flex flex-col justify-end overflow-hidden mb-3 sm:mb-4">
            {/* Measurement marks */}
            <div className="absolute top-3 sm:top-4 right-2 sm:right-3 text-[9px] sm:text-[10px] font-bold text-sky-400 select-none">
              100%
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-3 text-[9px] sm:text-[10px] font-bold text-sky-400 select-none">
              50%
            </div>
            <div className="absolute bottom-3 sm:bottom-4 right-2 sm:right-3 text-[9px] sm:text-[10px] font-bold text-sky-400 select-none">
              0%
            </div>
            <div className="absolute inset-y-0 right-6 sm:right-7 w-px border-r border-dashed border-sky-200 dark:border-sky-700" />

            {/* Liquid level */}
            <div
              className="w-full bg-gradient-to-t from-sky-500 to-sky-400 rounded-2xl transition-all duration-700 ease-out relative flex items-center justify-center shadow-inner overflow-hidden"
              style={{ height: `${Math.max(12, percent)}%` }}
            >
              {/* Water shine wave */}
              <div className="absolute inset-0 bg-white/15 animate-pulse" />
              <div className="absolute top-1 left-2 w-8 h-1 bg-white/40 rounded-full" />
              <span className="text-white font-black text-xs sm:text-sm drop-shadow-xs relative z-10">
                {percent}%
              </span>
            </div>
          </div>

          {/* Numbers & Metric */}
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="text-sky-600 dark:text-sky-400">
                  {waterState.consumedMl.toLocaleString('pt-BR')}
                </span>
                <span className="text-slate-400 text-lg sm:text-xl font-bold">/</span>
                <span className="text-slate-700 dark:text-slate-300 text-xl sm:text-2xl font-bold">
                  {waterState.dailyGoalMl.toLocaleString('pt-BR')} ml
                </span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">
              {isGoalReached
                ? '🎉 Parabéns! Meta de água alcançada com sucesso!'
                : `Faltam ${Math.max(
                    0,
                    waterState.dailyGoalMl - waterState.consumedMl
                  ).toLocaleString('pt-BR')} ml para sua meta de hoje`}
            </p>

            {/* Botão de Calcular Meta de acordo com o peso */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setTempWeight(waterState.weightKg || 70);
                  setMlPerKgRate(35);
                  setIsCustomMode(false);
                  setCustomGoalInput(String(waterState.dailyGoalMl));
                  setShowWeightCalculator(true);
                }}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 min-h-[38px] rounded-2xl bg-sky-100/90 hover:bg-sky-200 dark:bg-sky-950/70 dark:hover:bg-sky-900 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 text-[11px] sm:text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer group max-w-full truncate"
                title="Calcular meta de água de acordo com seu peso"
              >
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition shrink-0" />
                <span className="truncate">Calcular meta pelo peso ({waterState.weightKg || 70} kg)</span>
                <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-500 ml-0.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Motivational message upon goal completion */}
          {isGoalReached && (
            <div className="mt-3 p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold animate-bounce-subtle">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Seu corpo agradece pela hidratação hoje! Continue assim! 💧</span>
            </div>
          )}
        </div>

        {/* Main Action: "Já bebi!" with portion selectors */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors flex flex-col justify-between">
          <div className="space-y-3.5">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-sky-500" />
              Escolha o tamanho do copo:
            </h3>

            {/* Glass size pills */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {[
                { ml: 200, label: 'Copo pequeno', icon: '🥛' },
                { ml: 300, label: 'Copo grande', icon: '🥤' },
                { ml: 500, label: 'Garrafinha', icon: '🍶' },
              ].map((item) => (
                <button
                  key={item.ml}
                  type="button"
                  onClick={() => setSelectedGlassMl(item.ml)}
                  className={`p-2.5 sm:p-3 rounded-2xl border-2 text-center transition active:scale-95 cursor-pointer min-h-[70px] flex flex-col items-center justify-center ${
                    selectedGlassMl === item.ml
                      ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="text-xl sm:text-2xl mb-0.5">{item.icon}</div>
                  <div className="text-xs sm:text-sm font-black">{item.ml} ml</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate w-full">{item.label}</div>
                </button>
              ))}
            </div>

            {/* Big Action Button "JÁ BEBI!" */}
            <button
              type="button"
              onClick={() => handleDrink(selectedGlassMl)}
              className="w-full py-3.5 sm:py-4 px-4 sm:px-6 min-h-[50px] rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black text-base sm:text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Droplet className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
              <span>Já bebi! (+{selectedGlassMl} ml)</span>
            </button>
          </div>

          {/* Undo Button */}
          {waterState.consumedMl > 0 ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer min-h-[36px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Desfazer último copo (-{selectedGlassMl} ml)</span>
              </button>
            </div>
          ) : (
            <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 italic py-1">
              Clique no botão acima para registrar seu primeiro copo
            </div>
          )}
        </div>
      </div>

      {/* Histórico dos Últimos 7 Dias de Água */}
      {(() => {
        const todayStr = getTodayString();
        const last7Days = getLast7Days();
        const chronologicalDays = [...last7Days].reverse();
        let daysMetGoal = 0;
        const daysData = chronologicalDays.map((day) => {
          const isToday = day.dateStr === todayStr;
          let amount = 0;
          let goal = waterState.dailyGoalMl;
          if (isToday) {
            amount = waterState.consumedMl;
            goal = waterState.dailyGoalMl;
          } else {
            const entry = waterState.history.find((h) => h.date === day.dateStr);
            if (entry) {
              amount = entry.amountMl;
              goal = entry.goalMl || waterState.dailyGoalMl;
            }
          }
          const percent = Math.min(100, Math.round((amount / Math.max(1, goal)) * 100));
          const isGoalMet = amount >= goal;
          if (isGoalMet) daysMetGoal++;
          return {
            ...day,
            isToday,
            amount,
            goal,
            percent,
            isGoalMet,
          };
        });

        return (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white">
                    Evolução dos Últimos 7 Dias
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sua constância de hidratação dia a dia
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-3 py-1 rounded-full border border-sky-200 dark:border-sky-800">
                {daysMetGoal} de 7 metas batidas ✨
              </span>
            </div>

            {/* Visual 7-Day Bars */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-1">
              {daysData.map((d) => (
                <div
                  key={d.dateStr}
                  className={`p-1 sm:p-2 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-between text-center transition min-w-0 ${
                    d.isToday
                      ? 'border-sky-400 bg-sky-50/70 dark:bg-sky-950/50 shadow-xs ring-1 ring-sky-300'
                      : d.isGoalMet
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                  title={`${d.label} (${d.weekdayName}): ${d.amount.toLocaleString('pt-BR')} ml de ${d.goal.toLocaleString('pt-BR')} ml (${d.percent}%)`}
                >
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-0.5 sm:mb-1 truncate w-full">
                    {d.dayShort}
                  </span>
                  {/* Vertical mini progress bar */}
                  <div className="w-full h-12 sm:h-16 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl overflow-hidden p-0.5 flex flex-col justify-end border border-slate-200 dark:border-slate-700 mb-1">
                    <div
                      className={`w-full rounded-md sm:rounded-lg transition-all duration-500 ${
                        d.isGoalMet
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-t from-sky-500 to-sky-400'
                      }`}
                      style={{ height: `${Math.max(6, d.percent)}%` }}
                    />
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-black leading-tight truncate w-full">
                    {d.isGoalMet ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">{d.percent}%</span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold mt-0.5 truncate w-full ${
                      d.isToday ? 'text-sky-700 dark:text-sky-400 font-black underline' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Settings / Reminders Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold">
              <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Horários de lembretes e avisos sonoros
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {waterState.reminderTimes.length} horários programados • Som e vibração
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${
              showConfig ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showConfig && (
          <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-5">
            {/* Reminder Times */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Horários dos lembretes ({waterState.reminderTimes.length}):
                </label>
                <button
                  type="button"
                  onClick={handleGenerateDefaultTimes}
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Usar sugestão padrão
                </button>
              </div>

              {/* Time chips */}
              <div className="flex flex-wrap gap-2">
                {waterState.reminderTimes.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 rounded-xl text-xs font-bold"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(t)}
                      className="text-sky-400 hover:text-red-500 transition cursor-pointer"
                      title="Remover horário"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add custom time */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 cursor-pointer shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTime}
                    className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    + Adicionar horário
                  </button>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Click acima para definir a hora
                </span>
              </div>
            </div>

            {/* Sound & Vibration toggles */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Avisos sonoros e vibração
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({
                      ...prev,
                      soundEnabled: !prev.soundEnabled,
                    }))
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                    waterState.soundEnabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {waterState.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Som: {waterState.soundEnabled ? 'Ligado' : 'Desligado'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({
                      ...prev,
                      vibrationEnabled: !prev.vibrationEnabled,
                    }))
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                    waterState.vibrationEnabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Vibrate className="w-4 h-4" />
                  Vibração: {waterState.vibrationEnabled ? 'Ligada' : 'Desligada'}
                </button>

                <button
                  type="button"
                  onClick={handleTestSound}
                  className="px-3 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900 transition cursor-pointer"
                >
                  Testar som 🔊
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Calculadora de Meta de Acordo com o Peso Corporal */}
      {showWeightCalculator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-white dark:from-slate-900 dark:to-slate-850">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Calcular Meta pelo Peso
                  </h3>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    Fórmula médica: 35 ml de água por kg de peso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWeightCalculator(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                aria-label="Fechar calculadora"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Toast Feedback inside modal */}
              {toastFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2 animate-fade-in shadow-xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>{toastFeedback}</span>
                </div>
              )}

              {/* 1. SELETOR INTERATIVO DE PESO */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Seu peso corporal:
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
                    Ajuste nos botões ou no slider
                  </span>
                </div>

                {/* Big Number & Increment/Decrement */}
                <div className="flex items-center justify-center gap-1 sm:gap-2 pt-1 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setTempWeight((w) => Math.max(30, w - 5))}
                    className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Diminuir 5 kg"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempWeight((w) => Math.max(30, w - 1))}
                    className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Diminuir 1 kg"
                  >
                    -1
                  </button>

                  <div className="flex items-baseline justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-slate-900 border-2 border-sky-400 rounded-2xl shadow-xs min-w-24 sm:min-w-32">
                    <input
                      type="number"
                      min="30"
                      max="250"
                      value={tempWeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setTempWeight(val);
                      }}
                      className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center w-16 sm:w-20 bg-transparent focus:outline-hidden"
                    />
                    <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 ml-1">
                      kg
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTempWeight((w) => Math.min(250, w + 1))}
                    className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Aumentar 1 kg"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempWeight((w) => Math.min(250, w + 5))}
                    className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Aumentar 5 kg"
                  >
                    +5
                  </button>
                </div>

                {/* Smooth Slider */}
                <div className="pt-2">
                  <input
                    type="range"
                    min="35"
                    max="160"
                    step="1"
                    value={tempWeight}
                    onChange={(e) => setTempWeight(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5 mt-1">
                    <span>35 kg</span>
                    <span>70 kg</span>
                    <span>100 kg</span>
                    <span>160 kg</span>
                  </div>
                </div>
              </div>

              {/* 2. OPÇÃO DE TAXA POR KG / NÍVEL DE ATIVIDADE */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-500" />
                    Intensidade de hidratação:
                  </span>
                  <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold">
                    {mlPerKgRate} ml por kg
                  </span>
                </label>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                  {[
                    {
                      rate: 35,
                      label: 'Padrão (35 ml/kg)',
                      desc: 'Rotina normal, clima ameno (recomendado)',
                      icon: '💧',
                    },
                    {
                      rate: 40,
                      label: 'Ativo (40 ml/kg)',
                      desc: 'Caminhadas ou dias mais quentes',
                      icon: '🚶',
                    },
                    {
                      rate: 45,
                      label: 'Intenso (45 ml/kg)',
                      desc: 'Exercícios fortes ou calor intenso',
                      icon: '🏃',
                    },
                  ].map((item) => (
                    <button
                      key={item.rate}
                      type="button"
                      onClick={() => {
                        setMlPerKgRate(item.rate);
                        setIsCustomMode(false);
                      }}
                      className={`p-2.5 rounded-2xl border-2 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between ${
                        mlPerKgRate === item.rate && !isCustomMode
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span className="text-base">{item.icon}</span>
                        <div className="font-black text-[11px] leading-tight mt-0.5">
                          {item.label}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. CARD COM A FÓRMULA E RESULTADO EXPLICADO */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md space-y-2 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-100 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Cálculo da Sua Meta Diária
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-white/20 rounded-full">
                    {tempWeight} kg × {mlPerKgRate} ml
                  </span>
                </div>
                <div className="pt-1 flex items-baseline gap-2">
                  <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {calculatedGoalMl.toLocaleString('pt-BR')}{' '}
                    <span className="text-lg font-bold text-sky-100">ml / dia</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-white/20 flex items-center justify-between text-[11px] text-sky-100">
                  <span>Equivale a aproximadamente:</span>
                  <strong className="text-white font-black text-xs">
                    ~{Math.round(calculatedGoalMl / 250)} copos de 250 ml
                  </strong>
                </div>
              </div>

              {/* 4. AJUSTE MANUAL OPCIONAL */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customGoalCheck"
                    checked={isCustomMode}
                    onChange={(e) => {
                      setIsCustomMode(e.target.checked);
                      if (e.target.checked && !customGoalInput) {
                        setCustomGoalInput(String(calculatedGoalMl));
                      }
                    }}
                    className="w-4 h-4 rounded-md accent-sky-600 cursor-pointer"
                  />
                  <label
                    htmlFor="customGoalCheck"
                    className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Ajustar valor exato manualmente
                  </label>
                </div>
                {isCustomMode && (
                  <div className="flex items-center gap-1.5 animate-fade-in">
                    <input
                      type="number"
                      step="50"
                      min="500"
                      max="10000"
                      value={customGoalInput}
                      onChange={(e) => setCustomGoalInput(e.target.value)}
                      placeholder="Ex: 2500"
                      className="w-24 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 text-xs"
                    />
                    <span className="font-bold text-slate-500">ml</span>
                  </div>
                )}
              </div>

              {/* Explicação médica / Dica */}
              <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 rounded-2xl border border-sky-100 dark:border-sky-800/60 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <span>
                  O cálculo de <strong>35 ml por quilograma</strong> é a recomendação de referência de especialistas para manter rins saudáveis, circulação ideal e boa disposição diária.
                </span>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-855 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setShowWeightCalculator(false)}
                className="py-2.5 sm:py-3 px-4 min-h-[44px] rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyWeightGoal}
                className="flex-1 py-2.5 sm:py-3 px-4 min-h-[44px] rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Aplicar Meta ({calculatedGoalMl.toLocaleString('pt-BR')} ml)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
