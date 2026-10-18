'use client';

import React, { useState } from 'react';
import { MedicineState, Medicine, MedicineFrequency } from '@/lib/types';
import { getTodayString, getLast7Days } from '@/lib/storage';
import { sounds, triggerVibration } from '@/lib/sound';
import confetti from 'canvas-confetti';
import {
  Pill,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Info,
  X,
  Save,
  Check,
  Calendar,
} from 'lucide-react';

interface MedicineHabitProps {
  medicineState: MedicineState;
  onUpdate: (updater: (prev: MedicineState) => MedicineState) => void;
}

const daysOfWeekList = [
  { id: 1, label: 'Seg', fullName: 'Segunda' },
  { id: 2, label: 'Ter', fullName: 'Terça' },
  { id: 3, label: 'Qua', fullName: 'Quarta' },
  { id: 4, label: 'Qui', fullName: 'Quinta' },
  { id: 5, label: 'Sex', fullName: 'Sexta' },
  { id: 6, label: 'Sáb', fullName: 'Sábado' },
  { id: 0, label: 'Dom', fullName: 'Domingo' },
];

export function MedicineHabit({
  medicineState,
  onUpdate,
}: MedicineHabitProps) {
  const todayStr = getTodayString();
  const currentDayOfWeek = new Date().getDay();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [selectedHistoryDayKey, setSelectedHistoryDayKey] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [timeInput, setTimeInput] = useState('');
  const [frequency, setFrequency] = useState<MedicineFrequency>('daily');
  const [intervalHours, setIntervalHours] = useState(8);
  const [specificDays, setSpecificDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#0284c7');

  const openAddModal = () => {
    setEditingMedId(null);
    setName('');
    setDosage('');
    setTimes([]);
    setTimeInput('');
    setFrequency('daily');
    setIntervalHours(8);
    setSpecificDays([1, 2, 3, 4, 5]);
    setNotes('');
    setColor('#0284c7');
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditingMedId(med.id);
    setName(med.name);
    setDosage(med.dosage);
    setTimes(med.times || []);
    setTimeInput('');
    setFrequency(med.frequency);
    setIntervalHours(med.intervalHours || 8);
    setSpecificDays(med.specificDays && med.specificDays.length > 0 ? med.specificDays : [1, 2, 3, 4, 5]);
    setNotes(med.notes);
    setColor(med.color || '#0284c7');
    setIsModalOpen(true);
  };

  // Add a time to list
  const handleAddTime = () => {
    if (!timeInput || times.includes(timeInput)) return;
    setTimes([...times, timeInput].sort());
    setTimeInput('');
  };

  // Remove time
  const handleRemoveTime = (t: string) => {
    setTimes(times.filter((item) => item !== t));
  };

  // Toggle specific day in modal
  const handleToggleSpecificDayInForm = (e: React.MouseEvent, dayId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSpecificDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length > 1) {
          return prev.filter((d) => d !== dayId);
        }
        return prev;
      } else {
        return [...prev, dayId].sort();
      }
    });
  };

  // Save medicine
  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Use current times list, or auto-include timeInput if user typed one
    const finalTimes = times.length > 0
      ? times
      : (timeInput.trim() ? [timeInput.trim()] : []);

    if (editingMedId) {
      // Edit
      onUpdate((prev) => ({
        ...prev,
        medicines: prev.medicines.map((m) =>
          m.id === editingMedId
            ? {
                ...m,
                name: name.trim(),
                dosage: dosage.trim() || '1 comprimido',
                times: finalTimes,
                frequency,
                intervalHours: frequency === 'interval' ? intervalHours : undefined,
                specificDays: frequency === 'specific_days' ? specificDays : undefined,
                notes: notes.trim(),
                color,
              }
            : m
        ),
      }));
    } else {
      // Create new
      const newMed: Medicine = {
        id: `med-${Date.now()}`,
        name: name.trim(),
        dosage: dosage.trim() || '1 comprimido',
        times: finalTimes,
        frequency,
        intervalHours: frequency === 'interval' ? intervalHours : undefined,
        specificDays: frequency === 'specific_days' ? specificDays : undefined,
        notes: notes.trim(),
        color,
        history: [],
      };
      onUpdate((prev) => ({
        ...prev,
        medicines: [...prev.medicines, newMed],
      }));
    }
    setIsModalOpen(false);
  };

  // Delete medicine without window.confirm
  const handleDeleteMedicine = (medId: string) => {
    onUpdate((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((m) => m.id !== medId),
    }));
    setConfirmingDeleteId(null);
  };

  // Mark dose as taken
  const handleMarkTaken = (medId: string, scheduledTime: string) => {
    const now = new Date();
    const currentClock = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    onUpdate((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => {
        if (m.id !== medId) return m;
        const filteredHistory = m.history.filter(
          (h) => !(h.date === todayStr && h.time === scheduledTime)
        );
        return {
          ...m,
          history: [
            ...filteredHistory,
            { date: todayStr, time: scheduledTime, takenAt: currentClock },
          ],
        };
      }),
    }));

    sounds.playGoalCelebration();
    triggerVibration([200, 100, 200]);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#10b981', '#3b82f6'],
    });
  };

  // Unmark dose
  const handleUnmarkTaken = (medId: string, scheduledTime: string) => {
    onUpdate((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => {
        if (m.id !== medId) return m;
        return {
          ...m,
          history: m.history.filter(
            (h) => !(h.date === todayStr && h.time === scheduledTime)
          ),
        };
      }),
    }));
  };

  // Toggle dose for any date in the 7-day history
  const handleToggleDoseForDate = (
    medId: string,
    dateStr: string,
    scheduledTime: string
  ) => {
    const isToday = dateStr === todayStr;
    const now = new Date();
    const currentClock = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    let willTake = false;

    onUpdate((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => {
        if (m.id !== medId) return m;
        const alreadyTaken = m.history.some(
          (h) => h.date === dateStr && h.time === scheduledTime
        );
        willTake = !alreadyTaken;
        if (alreadyTaken) {
          return {
            ...m,
            history: m.history.filter(
              (h) => !(h.date === dateStr && h.time === scheduledTime)
            ),
          };
        } else {
          return {
            ...m,
            history: [
              ...m.history.filter(
                (h) => !(h.date === dateStr && h.time === scheduledTime)
              ),
              {
                date: dateStr,
                time: scheduledTime,
                takenAt: isToday ? currentClock : scheduledTime,
              },
            ],
          };
        }
      }),
    }));

    if (willTake) {
      sounds.playGoalCelebration();
      triggerVibration([150, 60, 150]);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-fade-in w-full">
      {/* Header Info Banner */}
      <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-2xs flex items-center justify-between gap-2.5 sm:gap-3 transition-colors flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
            <Pill className="w-5 h-5 fill-amber-400 stroke-amber-700 dark:stroke-amber-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">
              Controle Pontual de Medicamentos
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
              O aviso toca no horário até você apertar &quot;Tomei!&quot;.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="shrink-0 px-3.5 py-2 min-h-[38px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto sm:ml-0"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar</span>
        </button>
      </div>

      {/* Medicines List */}
      <div className="space-y-4">
        {medicineState.medicines.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3 transition-colors">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Pill className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Nenhum remédio cadastrado ainda
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Adicione seus medicamentos para receber alertas no horário correto e nunca esquecer uma dose.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Remédio
            </button>
          </div>
        ) : (
          medicineState.medicines.map((med) => {
            const isScheduledForToday =
              med.frequency !== 'specific_days' ||
              !med.specificDays ||
              med.specificDays.includes(currentDayOfWeek);
            const isConfirmingDelete = confirmingDeleteId === med.id;

            return (
              <div
                key={med.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs space-y-4 transition-colors"
              >
                {/* Med Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: med.color || '#0284c7' }}
                    >
                      <Pill className="w-5 h-5 fill-white/80" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        {med.name}
                      </h3>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        Dosagem: <span className="text-slate-800 dark:text-slate-200">{med.dosage}</span>
                        {med.frequency === 'specific_days' && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">
                            (Dias específicos)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(med)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Editar remédio"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(isConfirmingDelete ? null : med.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Excluir remédio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline delete confirmation */}
                {isConfirmingDelete && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                      Excluir este lembrete de remédio?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteMedicine(med.id)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                      >
                        Sim, excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes if any */}
                {med.notes && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 flex items-start gap-1.5">
                    <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Observação:</strong> {med.notes}
                    </span>
                  </div>
                )}

                {/* Doses for today */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Doses programadas hoje:
                    </span>
                    {!isScheduledForToday && (
                      <span className="text-[11px] text-slate-400 font-normal italic">
                        Não programado para hoje
                      </span>
                    )}
                  </div>

                  {med.times.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 italic">
                      Nenhum horário cadastrado para este remédio. Toque no ícone de editar acima para adicionar horários.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {med.times.map((scheduledTime) => {
                        const log = med.history.find(
                          (h) => h.date === todayStr && h.time === scheduledTime
                        );
                        const isTaken = !!log;

                        return (
                          <div
                            key={scheduledTime}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition ${
                              isTaken
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            <div>
                              <div className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1">
                                <span>⏰</span> {scheduledTime}
                              </div>
                              <div className="text-[11px] font-bold mt-0.5">
                                {isTaken ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" /> Tomado às{' '}
                                    {log.takenAt || scheduledTime}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-400">Pendente hoje</span>
                                )}
                              </div>
                            </div>

                            {isTaken ? (
                              <button
                                type="button"
                                onClick={() => handleUnmarkTaken(med.id, scheduledTime)}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                              >
                                Desfazer
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkTaken(med.id, scheduledTime)}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Tomei!
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Histórico dos Últimos 7 Dias Marcado por Medicamento */}
                {(() => {
                  const last7Days = getLast7Days();
                  const chronological7Days = [...last7Days].reverse();
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
                      : (med.times.length === 0 ? 0 : 100);

                  return (
                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Histórico dos últimos 7 dias:</span>
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
                          const isExpanded = selectedHistoryDayKey === dayKey;

                          return (
                            <button
                              key={day.dateStr}
                              type="button"
                              onClick={() =>
                                setSelectedHistoryDayKey(isExpanded ? null : dayKey)
                              }
                              className={`p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-between text-center transition cursor-pointer active:scale-95 min-w-0 ${
                                isExpanded
                                  ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/80 dark:bg-amber-950/70 shadow-xs'
                                  : isComplete
                                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                                  : isPartial
                                  ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                  : !isScheduled
                                  ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500'
                                  : isPendingToday
                                  ? 'border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 text-sky-900 dark:text-sky-300'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
                              }`}
                              title={`${day.label} (${day.weekdayName}) - ${
                                !isScheduled
                                  ? 'Não programado'
                                  : isComplete
                                  ? 'Todas as doses tomadas'
                                  : `${takenCount} de ${med.times.length} tomadas`
                              } • Toque para detalhes/marcar`}
                            >
                              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 leading-none mb-1 truncate w-full">
                                {day.dayShort}
                              </span>

                              {/* Status Indicator Icon / Circle */}
                              <div
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black mb-1 shrink-0 ${
                                  isComplete
                                    ? 'bg-emerald-500 text-white'
                                    : isPartial
                                    ? 'bg-amber-500 text-white'
                                    : !isScheduled
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 text-[10px]'
                                    : isPendingToday
                                    ? 'border-2 border-dashed border-sky-500 text-sky-600 dark:text-sky-400'
                                    : 'bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isComplete ? '✓' : isPartial ? '½' : !isScheduled ? '—' : isPendingToday ? '⏳' : '✕'}
                              </div>

                              <span
                                className={`text-[9px] sm:text-[10px] font-bold truncate w-full ${
                                  isToday ? 'text-amber-700 dark:text-amber-400 font-black underline' : ''
                                }`}
                              >
                                {day.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Expanded day panel to view / retroactively mark doses for that day */}
                      {selectedHistoryDayKey && selectedHistoryDayKey.startsWith(`${med.id}-`) && (() => {
                        const selectedDateStr = selectedHistoryDayKey.replace(`${med.id}-`, '');
                        const targetDay = chronological7Days.find((d) => d.dateStr === selectedDateStr);
                        if (!targetDay) return null;
                        const isScheduled =
                          med.frequency !== 'specific_days' ||
                          !med.specificDays ||
                          med.specificDays.includes(targetDay.dayNumber);

                        return (
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-amber-200/80 dark:border-amber-900/50 space-y-2.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                <span>📅</span> {targetDay.label} • {targetDay.weekdayName} ({targetDay.dateStr})
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedHistoryDayKey(null)}
                                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              >
                                Fechar ✕
                              </button>
                            </div>

                            {!isScheduled ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                Este medicamento não estava programado para este dia da semana ({targetDay.weekdayName}).
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                  Toque para marcar ou desmarcar doses tomadas nesta data:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {med.times.map((scheduledTime) => {
                                    const log = med.history.find(
                                      (h) => h.date === targetDay.dateStr && h.time === scheduledTime
                                    );
                                    const isTaken = !!log;

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
                                          <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                            <span>⏰</span> {scheduledTime}
                                          </div>
                                          <div className="text-[10px] font-semibold">
                                            {isTaken ? (
                                              <span className="text-emerald-700 dark:text-emerald-400">
                                                ✓ Tomado {log.takenAt ? `às ${log.takenAt}` : ''}
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
                                              ? 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* Mensagem de Motivação & Cuidado */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 flex items-center gap-3.5 shadow-2xs">
        <span className="text-2xl sm:text-3xl shrink-0">💖</span>
        <div>
          <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-0.5">
            Motivação Diária
          </h4>
          <p className="text-xs font-medium text-amber-950/80 dark:text-amber-200/90 leading-relaxed">
            Tomar seus medicamentos no horário certo é um compromisso de amor com a sua saúde e longevidade. Parabéns por se cuidar hoje!
          </p>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                <Pill className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{editingMedId ? 'Editar Remédio' : 'Novo Lembrete de Remédio'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Remédio: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Losartana, Dipirona, Vitamina C"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white text-sm bg-white dark:bg-slate-800 focus:outline-amber-500"
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dosagem:
                </label>
                <input
                  type="text"
                  placeholder="Ex: 50mg, 1 comprimido, 10 gotas"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white text-sm bg-white dark:bg-slate-800 focus:outline-amber-500"
                />
              </div>

              {/* Repetition */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Frequência / Repetição:
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as MedicineFrequency)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white text-sm bg-white dark:bg-slate-800"
                >
                  <option value="daily">Diário (todos os dias)</option>
                  <option value="specific_days">Dias específicos da semana</option>
                  <option value="interval">A cada X horas (intervalo)</option>
                </select>
              </div>

              {/* Specific days selector */}
              {frequency === 'specific_days' && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Dias específicos para tomar:
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Toque para marcar
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {daysOfWeekList.map((day) => {
                      const isSelected = specificDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={(e) => handleToggleSpecificDayInForm(e, day.id)}
                          className={`py-1.5 sm:py-2 px-0.5 rounded-xl text-[10px] sm:text-xs font-black transition cursor-pointer active:scale-95 select-none min-w-0 truncate ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 border border-slate-200 dark:border-slate-700'
                          }`}
                          title={`Clique para ${isSelected ? 'desmarcar' : 'marcar'} ${day.fullName}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {frequency === 'interval' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Intervalo em horas:
                  </label>
                  <select
                    value={intervalHours}
                    onChange={(e) => setIntervalHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white text-sm bg-white dark:bg-slate-800"
                  >
                    <option value={4}>A cada 4 horas (6 doses/dia)</option>
                    <option value={6}>A cada 6 horas (4 doses/dia)</option>
                    <option value={8}>A cada 8 horas (3 doses/dia)</option>
                    <option value={12}>A cada 12 horas (2 doses/dia)</option>
                  </select>
                </div>
              )}

              {/* Schedule times */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Horário(s) das doses:
                  </label>
                  {times.length > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {times.length} {times.length === 1 ? 'horário' : 'horários'}
                    </span>
                  )}
                </div>

                {times.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {times.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-bold"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(t)}
                          className="text-amber-500 hover:text-red-500 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer transition text-xs font-black"
                          title={`Remover horário ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    Nenhum horário cadastrado ainda (em branco). Escolha a hora no relógio abaixo e clique em &ldquo;Adicionar horário&rdquo;.
                  </p>
                )}

                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="time"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 cursor-pointer shadow-2xs min-h-[38px]"
                    />
                    <button
                      type="button"
                      onClick={handleAddTime}
                      className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-900 cursor-pointer flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs min-h-[38px]"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Adicionar horário</span>
                    </button>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    Click acima para definir a hora
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações de uso:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tomar com almoço, Em jejum com água"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-medium text-slate-800 dark:text-white text-sm bg-white dark:bg-slate-800 focus:outline-amber-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cor do cartão:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['#0284c7', '#059669', '#7c3aed', '#d97706', '#dc2626', '#e11d48'].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition cursor-pointer ${
                          color === c ? 'border-slate-900 dark:border-white scale-110 shadow-xs' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Save / Cancel buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 sm:py-3 px-4 min-h-[44px] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 sm:py-3 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Remédio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
