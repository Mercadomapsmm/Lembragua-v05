'use client';

import React from 'react';
import { ActiveAlert } from '@/lib/notifications';
import { Bell, Check, X } from 'lucide-react';

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
    <div className="fixed top-14 sm:top-16 inset-x-3 sm:inset-x-4 z-50 max-w-lg mx-auto">
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-amber-400/80 flex items-start justify-between gap-2.5 sm:gap-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center shrink-0 font-bold text-lg animate-pulse">
            <Bell className="w-5 h-5 fill-slate-900" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                Alerta de Horário: {alert.time}
              </span>
            </div>
            <h4 className="text-sm font-black text-white leading-tight">
              {alert.title}
            </h4>
            <p className="text-xs text-slate-300 leading-snug">
              {alert.message}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onConfirmAction(alert)}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Confirmar
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
              >
                Lembrar depois
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          title="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
