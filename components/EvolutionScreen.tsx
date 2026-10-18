'use client';

import React, { useState } from 'react';
import { AppData, WaterState, MedicineState } from '@/lib/types';
import { getLast7Days, getTodayString } from '@/lib/storage';
import {
  TrendingUp,
  Droplet,
  Pill,
  CheckCircle2,
  Calendar,
  Award,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds, triggerVibration } from '@/lib/sound';

interface EvolutionScreenProps {
  data: AppData;
  onUpdateWater?: (updater: (prev: WaterState) => WaterState) => void;
  onUpdateMedicine: (updater: (prev: MedicineState) => MedicineState) => void;
}

export function EvolutionScreen({
  data,
  onUpdateWater,
  onUpdateMedicine,
}: EvolutionScreenProps) {
  const todayStr = getTodayString();
  const last7Days = getLast7Days();
  const chronological7Days = [...last7Days].reverse(); // De 6 dias atrás até Hoje

  const [selectedMedDayKey, setSelectedMedDayKey] = useState<string | null>(null);
  const [selectedWaterDayKey, setSelectedWaterDayKey] = useState<string | null>(null);
  const [customWaterInput, setCustomWaterInput] = useState<string>('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showToast = (text: string) => {
    setNotificationMsg(text);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Water statistics for the last 7 days
  const waterHistoryMap = new Map<string, number>();
  (data.water.history || []).forEach((h) => {
    waterHistoryMap.set(h.date, h.amountMl);
  });

  const water7DaysStats = chronological7Days.map((d) => {
    const isToday = d.dateStr === todayStr;
    const amount = isToday
      ? data.water.consumedMl
      : waterHistoryMap.get(d.dateStr) || 0;
    const goal = data.water.dailyGoalMl;
    const percent = Math.min(100, Math.round((amount / Math.max(1, goal)) * 100));
    const metGoal = amount >= goal;
    return {
      ...d,
      amount,
      goal,
      percent,
      metGoal,
      isToday,
    };
  });

  const totalConsumed7Days = water7DaysStats.reduce((sum, item) => sum + item.amount, 0);
  const daysMetGoal = water7DaysStats.filter((item) => item.metGoal).length;
  const dailyAverageMl = Math.round(totalConsumed7Days / 7);

  // Toggle medicine dose for a specific past date
  const handleToggleDoseForDate = (
    medId: string,
    dateStr: string,
    scheduledTime: string
  ) => {
    onUpdateMedicine((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => {
        if (m.id !== medId) return m;
        const exists = m.history.some(
          (h) => h.date === dateStr && h.time === scheduledTime
        );
        let newHistory = [...m.history];
        if (exists) {
          newHistory = newHistory.filter(
            (h) => !(h.date === dateStr && h.time === scheduledTime)
          );
        } else {
          const now = new Date();
          const takenAt = `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes()
          ).padStart(2, '0')}`;
          newHistory.push({
            date: dateStr,
            time: scheduledTime,
            takenAt,
          });
          sounds.playGoalCelebration();
          triggerVibration([60, 40, 60]);
        }
        return {
          ...m,
          history: newHistory,
        };
      }),
    }));
  };

  // Set or initialize water intake for any specific day
  const handleSetWaterForDate = (dateStr: string, newAmount: number) => {
    if (!onUpdateWater) return;
    const isToday = dateStr === todayStr;
    const cleanAmount = Math.max(0, Math.round(newAmount));

    onUpdateWater((prev) => {
      if (isToday) {
        return {
          ...prev,
          consumedMl: cleanAmount,
        };
      } else {
        const filtered = (prev.history || []).filter((h) => h.date !== dateStr);
        return {
          ...prev,
          history: [
            ...filtered,
            {
              date: dateStr,
              amountMl: cleanAmount,
              goalMl: prev.dailyGoalMl,
            },
          ],
        };
      }
    });
    sounds.playWaterDrop();
    triggerVibration([60, 40]);
    showToast(`Água de ${dateStr === todayStr ? 'Hoje' : dateStr}: ${cleanAmount.toLocaleString('pt-BR')} ml atualizado!`);
  };

  // Inicializar com semana de exemplo / dados saudáveis
  const handleInitializeSampleData = () => {
    if (onUpdateWater) {
      onUpdateWater((prev) => {
        const goal = prev.dailyGoalMl;
        const sampleMultipliers = [0.85, 1.0, 0.75, 1.0, 1.1, 0.95, 1.0];
        const newHistory = chronological7Days.slice(0, 6).map((day, idx) => ({
          date: day.dateStr,
          amountMl: Math.round(goal * sampleMultipliers[idx]),
          goalMl: goal,
        }));
        return {
          ...prev,
          consumedMl: Math.round(goal * sampleMultipliers[6]),
          history: newHistory,
        };
      });
    }

    onUpdateMedicine((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => {
        const sampleHistory = chronological7Days.flatMap((day, dayIdx) => {
          if (dayIdx === 2) return [];
          return m.times.map((t) => ({
            date: day.dateStr,
            time: t,
            takenAt: t,
          }));
        });
        return {
          ...m,
          history: sampleHistory,
        };
      }),
    }));

    sounds.playGoalCelebration();
    triggerVibration([100, 60, 100]);
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    showToast('Evoluções inicializadas com histórico saudável de exemplo! 🎉');
  };

  // Zerar apenas a evolução da Água
  const handleResetWater = () => {
    if (onUpdateWater) {
      onUpdateWater((prev) => ({
        ...prev,
        consumedMl: 0,
        history: (prev.history || []).filter(
          (h) => !chronological7Days.some((d) => d.dateStr === h.date)
        ),
      }));
    }
    sounds.playWaterDrop();
    triggerVibration([60, 40]);
    showToast('Evolução da água dos 7 dias zerada com sucesso!');
  };

  // Zerar apenas a evolução dos Remédios
  const handleResetMedicines = () => {
    onUpdateMedicine((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => ({
        ...m,
        history: m.history.filter(
          (h) => !chronological7Days.some((d) => d.dateStr === h.date)
        ),
      })),
    }));
    sounds.playWaterDrop();
    triggerVibration([60, 40]);
    showToast('Evolução dos Remédios dos 7 dias zerada com sucesso!');
  };

  // Zerar / Reiniciar o histórico dos 7 dias (Tudo)
  const handleResetEvolutions = () => {
    if (onUpdateWater) {
      onUpdateWater((prev) => ({
        ...prev,
        consumedMl: 0,
        history: (prev.history || []).filter(
          (h) => !chronological7Days.some((d) => d.dateStr === h.date)
        ),
      }));
    }
    onUpdateMedicine((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => ({
        ...m,
        history: m.history.filter(
          (h) => !chronological7Days.some((d) => d.dateStr === h.date)
        ),
      })),
    }));
    sounds.playWaterDrop();
    triggerVibration([80, 50, 80]);
    showToast('Evoluções zeradas com sucesso para reiniciar do zero!');
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-fade-in w-full">
      {/* Toast Feedback */}
      {notificationMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Banner da Tela da Evolução */}
      <div className="bg-gradient-to-br from-sky-500 via-teal-600 to-emerald-600 p-4 sm:p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner shrink-0">
            <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-sky-200 block truncate">
              Desempenho & Hábitos
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight truncate">
              Tela da Evolução
            </h2>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-sky-50 font-medium leading-relaxed mt-1">
          Acompanhe seu histórico dos últimos 7 dias, confira seus resultados e constância diária.
        </p>

        {/* Quick Highlights Row */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mt-4 pt-3.5 border-t border-white/20 text-center">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold text-sky-100 uppercase truncate">Metas Batidas</div>
            <div className="text-xs sm:text-lg font-black truncate">{daysMetGoal} / 7 dias</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold text-sky-100 uppercase truncate">Média Água</div>
            <div className="text-xs sm:text-lg font-black truncate">{dailyAverageMl} ml</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold text-sky-100 uppercase truncate">Remédios</div>
            <div className="text-xs sm:text-lg font-black truncate">{data.medicine.medicines.length} ativos</div>
          </div>
        </div>

        {/* Ações para Inicializar e Zerar as Evoluções */}
        <div className="mt-4 pt-3.5 border-t border-white/20 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-sky-100 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Inicializar ou zerar dados:</span>
            </span>
            <button
              type="button"
              onClick={handleInitializeSampleData}
              className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-sky-50 text-slate-900 rounded-xl text-[11px] sm:text-xs font-black transition active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5"
              title="Preencher histórico com semana de exemplo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Preencher Exemplo</span>
            </button>
          </div>

          {/* Opções de Zerar: Por Função ou Tudo */}
          <div className="flex items-center justify-end flex-wrap gap-1.5 pt-0.5">
            <span className="text-[10px] sm:text-[11px] text-sky-200 mr-auto font-medium">Zerar por função:</span>
            <button
              type="button"
              onClick={handleResetWater}
              className="px-2 sm:px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[11px] sm:text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
              title="Zerar apenas o histórico de água"
            >
              <Droplet className="w-3 h-3 text-sky-200 shrink-0" />
              <span>Zerar Água</span>
            </button>
            <button
              type="button"
              onClick={handleResetMedicines}
              className="px-2 sm:px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[11px] sm:text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
              title="Zerar apenas o histórico de remédios"
            >
              <Pill className="w-3 h-3 text-amber-300 shrink-0" />
              <span>Zerar Remédios</span>
            </button>
            <button
              type="button"
              onClick={handleResetEvolutions}
              className="px-2 sm:px-2.5 py-1 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl text-[11px] sm:text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Zerar água e remédios dos 7 dias para reiniciar tudo"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>Zerar Tudo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2 Evolution Cards: Responsive Grid on Desktop/Tablet, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        {/* 1. Evolução da Água (Últimos 7 Dias) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-sky-100 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <Droplet className="w-5 h-5 fill-sky-500 stroke-sky-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  Evolução da Água (Últimos 7 Dias)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Meta diária: {data.water.dailyGoalMl.toLocaleString('pt-BR')} ml • Toque para ajustar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-xs font-black text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2.5 sm:px-3 py-1 rounded-full border border-sky-200 dark:border-sky-800 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {daysMetGoal} de 7 metas
              </span>
              <button
                type="button"
                onClick={handleResetWater}
                className="px-2 sm:px-2.5 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl text-[11px] sm:text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                title="Zerar apenas o histórico de água"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>Zerar Água</span>
              </button>
            </div>
          </div>

          {/* Gráfico de Barras dos 7 Dias Interativo */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3">
            {water7DaysStats.map((item) => {
              const isSelected = selectedWaterDayKey === item.dateStr;
              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedWaterDayKey(isSelected ? null : item.dateStr);
                    setCustomWaterInput(item.amount > 0 ? String(item.amount) : '');
                  }}
                  className={`flex flex-col items-center justify-end p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition cursor-pointer active:scale-95 min-w-0 ${
                    isSelected
                      ? 'ring-2 ring-sky-500 border-sky-500 bg-sky-100/70 dark:bg-sky-950/80 shadow-xs'
                      : item.isToday
                      ? 'border-sky-400 bg-sky-50/60 dark:bg-sky-950/40'
                      : item.metGoal
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-sky-300'
                  }`}
                  title={`Toque para inicializar / alterar consumo de ${item.label} (${item.amount} ml)`}
                >
                  {/* Quantidade em ml no topo */}
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-1 truncate w-full">
                    {item.amount > 0 ? `${item.amount}` : '0'}
                  </span>

                  {/* Barra vertical de altura */}
                  <div className="w-full h-20 sm:h-28 bg-slate-200 dark:bg-slate-700 rounded-lg sm:rounded-xl overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
                    <div
                      className={`w-full rounded-md sm:rounded-lg transition-all duration-700 ${
                        item.metGoal
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                          : item.amount > 0
                          ? 'bg-gradient-to-t from-sky-500 to-sky-400'
                          : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.max(item.amount > 0 ? 8 : 0, item.percent)}%` }}
                    />
                  </div>

                  {/* Status e dia */}
                  <div className="mt-1.5 sm:mt-2 text-center w-full">
                    <div className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white truncate">
                      {item.dayShort}
                    </div>
                    <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 truncate">
                      {item.label}
                    </div>
                    {item.metGoal ? (
                      <span className="inline-block mt-0.5 text-[9px] sm:text-[10px] text-emerald-600 font-black">✓</span>
                    ) : (
                      <span className="inline-block mt-0.5 text-[8px] sm:text-[10px] text-slate-400 truncate">{item.percent}%</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Painel Interativo para Inicializar / Ajustar Água do dia selecionado */}
          {selectedWaterDayKey && (() => {
            const targetDay = water7DaysStats.find((d) => d.dateStr === selectedWaterDayKey);
            if (!targetDay) return null;
            const currentAmount = targetDay.amount;

            return (
              <div className="p-4 rounded-2xl bg-sky-50/90 dark:bg-slate-800/90 border border-sky-200 dark:border-sky-800 space-y-3 animate-fade-in text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                    <span>💧</span> Inicializar / Ajustar Água de {targetDay.label} ({targetDay.weekdayName})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedWaterDayKey(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
                  >
                    Fechar ✕
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Registrado neste dia: <strong className="text-sky-700 dark:text-sky-300">{currentAmount.toLocaleString('pt-BR')} ml</strong> de {targetDay.goal.toLocaleString('pt-BR')} ml</span>
                  <span className="font-bold text-slate-500">({targetDay.percent}%)</span>
                </div>

                {/* Botões rápidos de inicialização / incremento */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Ajuste rápido de consumo:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetWaterForDate(targetDay.dateStr, currentAmount + 250)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-sky-100 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 rounded-xl font-bold cursor-pointer transition active:scale-95 shadow-2xs"
                    >
                      + 250 ml (Copo)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetWaterForDate(targetDay.dateStr, currentAmount + 500)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-sky-100 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 rounded-xl font-bold cursor-pointer transition active:scale-95 shadow-2xs"
                    >
                      + 500 ml (Garrafa)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetWaterForDate(targetDay.dateStr, targetDay.goal)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer transition active:scale-95 shadow-2xs"
                    >
                      🎯 Bater Meta ({targetDay.goal.toLocaleString('pt-BR')} ml)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetWaterForDate(targetDay.dateStr, 0)}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl font-bold cursor-pointer transition active:scale-95"
                    >
                      Zerar (0 ml)
                    </button>
                  </div>
                </div>

                {/* Inserir ml exato */}
                <div className="flex items-center gap-2 pt-1 border-t border-sky-200/60 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Definir valor exato:</span>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="50"
                    value={customWaterInput}
                    onChange={(e) => setCustomWaterInput(e.target.value)}
                    placeholder="Ex: 2000"
                    className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseFloat(customWaterInput);
                      if (!isNaN(parsed)) {
                        handleSetWaterForDate(targetDay.dateStr, parsed);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Resumo da semana */}
          <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 rounded-2xl border border-sky-100 dark:border-sky-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Total consumido nos últimos 7 dias:
            </span>
            <span className="font-black text-sky-800 dark:text-sky-300">
              {(totalConsumed7Days / 1000).toFixed(2)} Litros (média {dailyAverageMl} ml/dia)
            </span>
          </div>
        </div>

        {/* 2. Evolução dos Remédios Marcado por Medicamento */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-100 dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-colors space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Pill className="w-5 h-5 fill-amber-300 stroke-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Evolução dos Remédios (7 Dias)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Adesão marcada individualmente por medicamento
                </p>
              </div>
            </div>

            {data.medicine.medicines.length > 0 && (
              <button
                type="button"
                onClick={handleResetMedicines}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                title="Zerar apenas o histórico de remédios"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Zerar Remédios</span>
              </button>
            )}
          </div>

          {data.medicine.medicines.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 text-center">
              Nenhum medicamento cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {data.medicine.medicines.map((med) => {
                let scheduledDaysCount = 0;
                let fullyTakenDaysCount = 0;

                chronological7Days.forEach((day) => {
                  const isScheduled =
                    med.frequency !== 'specific_days' ||
                    !med.specificDays ||
                    med.specificDays.includes(day.dayNumber);
                  if (isScheduled) {
                    scheduledDaysCount++;
                    const takenOnDay = med.times.filter((t) =>
                      med.history.some((h) => h.date === day.dateStr && h.time === t)
                    ).length;
                    if (med.times.length > 0 && takenOnDay >= med.times.length) {
                      fullyTakenDaysCount++;
                    }
                  }
                });

                const adherencePercent =
                  scheduledDaysCount > 0 && med.times.length > 0
                    ? Math.round((fullyTakenDaysCount / scheduledDaysCount) * 100)
                    : med.times.length === 0
                    ? 0
                    : 100;

                return (
                  <div
                    key={med.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: med.color || '#0284c7' }}
                        />
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {med.name}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          • {med.dosage}
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        {fullyTakenDaysCount}/{scheduledDaysCount} dias tomados ({adherencePercent}%)
                      </span>
                    </div>

                    {/* 7 Days Row */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                      {chronological7Days.map((day) => {
                        const isToday = day.dateStr === todayStr;
                        const isScheduled =
                          med.frequency !== 'specific_days' ||
                          !med.specificDays ||
                          med.specificDays.includes(day.dayNumber);
                        const takenCount = med.times.filter((t) =>
                          med.history.some((h) => h.date === day.dateStr && h.time === t)
                        ).length;
                        const hasTimes = med.times.length > 0;
                        const isComplete = isScheduled && hasTimes && takenCount >= med.times.length;
                        const isPartial =
                          isScheduled && hasTimes && takenCount > 0 && takenCount < med.times.length;
                        const isPendingToday = isScheduled && isToday && takenCount === 0;
                        const dayKey = `${med.id}-${day.dateStr}`;
                        const isExpanded = selectedMedDayKey === dayKey;

                        return (
                          <button
                            key={day.dateStr}
                            type="button"
                            onClick={() =>
                              setSelectedMedDayKey(isExpanded ? null : dayKey)
                            }
                            className={`p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-between text-center transition cursor-pointer active:scale-95 min-w-0 ${
                              isExpanded
                                ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-950/70'
                                : isComplete
                                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                                : isPartial
                                ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                : !isScheduled
                                ? 'border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 text-slate-400 opacity-60'
                                : isPendingToday
                                ? 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="text-[9px] sm:text-[10px] font-black uppercase truncate w-full">
                              {day.dayShort}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-semibold opacity-75 truncate w-full">
                              {day.label}
                            </span>
                            <div className="mt-1 flex items-center justify-center">
                              {isComplete ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : isPartial ? (
                                <span className="text-[9px] sm:text-[10px] font-black text-amber-600">
                                  {takenCount}/{med.times.length}
                                </span>
                              ) : !isScheduled ? (
                                <span className="text-[9px] sm:text-[10px] text-slate-400">-</span>
                              ) : isPendingToday ? (
                                <span className="text-[9px] sm:text-[10px] font-bold text-amber-500">Hoje</span>
                              ) : (
                                <span className="text-[9px] sm:text-[10px] text-slate-300">✕</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Detalhe interativo do dia selecionado */}
                    {selectedMedDayKey && selectedMedDayKey.startsWith(med.id) && (() => {
                      const dateStr = selectedMedDayKey.replace(`${med.id}-`, '');
                      const targetDay = chronological7Days.find((d) => d.dateStr === dateStr);
                      if (!targetDay) return null;

                      return (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-700 space-y-2 animate-fade-in text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              {targetDay.label} • {targetDay.weekdayName} ({targetDay.dateStr})
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedMedDayKey(null)}
                              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              Fechar ✕
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {med.times.map((scheduledTime) => {
                              const isTaken = med.history.some(
                                (h) => h.date === targetDay.dateStr && h.time === scheduledTime
                              );

                              return (
                                <div
                                  key={scheduledTime}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                                    isTaken
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-white">
                                      ⏰ {scheduledTime}
                                    </div>
                                    <div className="text-[10px] font-semibold">
                                      {isTaken ? (
                                        <span className="text-emerald-700 dark:text-emerald-400">
                                          ✓ Tomado
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">Não tomado</span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleDoseForDate(
                                        med.id,
                                        targetDay.dateStr,
                                        scheduledTime
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                                      isTaken
                                        ? 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                                    }`}
                                  >
                                    {isTaken ? 'Desfazer' : 'Marcar Tomado'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
