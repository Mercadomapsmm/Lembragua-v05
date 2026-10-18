'use client';

import React from 'react';
import { ActiveAlert } from '@/lib/notifications';
import { Bell, Check, X, RotateCcw } from 'lucide-react';

interface ActiveAlertBannerProps {
  alert: ActiveAlert | null;
  onDismiss: () => void;
  onConfirmAction: (alert: ActiveAlert) => void;
}

export function ActiveAlertBanner({
  alert,
  onDismiss,
  onConfirmAction,
}: ActiveAlertBannerProps) {
  if (!alert) return null;

  return (
    <div className="fixed top-14 sm:top-16 inset-x-3 sm:inset-x-4 z-50 max-w-lg mx-auto animate-bounce-subtle">
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-amber-400 flex items-start justify-between gap-2.5 sm:gap-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center shrink-0 font-bold text-lg animate-pulse shadow-md">
            <Bell className="w-5 h-5 fill-slate-900" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                Horário: {alert.time}
              </span>
              <span className="text-[10px] font-bold bg-rose-500/25 text-rose-300 px-2 py-0.5 rounded-full border border-rose-400/30 flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" />
                Aciona a cada 3 min até confirmar
              </span>
              {alert.repeatCount && alert.repeatCount > 1 && (
                <span className="text-[10px] font-black bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-md">
                  {alert.repeatCount}º toque
                </span>
              )}
            </div>
            <h4 className="text-sm font-black text-white leading-tight">
              {alert.title}
            </h4>
            <p className="text-xs text-slate-300 leading-snug">
              {alert.message}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => onConfirmAction(alert)}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Confirmar
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                title="Fechar e ser avisado novamente em 3 minutos"
              >
                Lembrar em 3 min
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          title="Fechar aviso (repetirá em 3 min se não confirmado)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
