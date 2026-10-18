'use client';

import React from 'react';
import { AppData } from '@/lib/types';
import {
  ShieldCheck,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

interface AboutModalProps {
  appData: AppData;
  onRestoreData?: (data: AppData) => void;
  onClose: () => void;
  onSetTheme?: (theme: 'light' | 'dark') => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
}

export function AboutModal({
  appData,
  onSetTheme,
  onOpenInstall,
  isInstalled = false,
}: AboutModalProps) {
  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-fade-in w-full">
      {/* Brand Hero */}
      <div className="text-center p-6 bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-900/90 rounded-3xl border-2 border-sky-100 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <Logo className="w-16 h-16 mx-auto" />
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Lembragua.online
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            Versão 1.0.0 • Gratuito & 100% Offline
          </div>
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Criado para pessoas comuns manterem água e remédios em dia, sem login, sem complicação e sem anúncios.
        </p>
      </div>

      {/* Theme Selection: Branco vs Dark */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-2.5 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Cor da Tela (Duas Opções):
          </span>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
            {appData.settings?.theme === 'dark' ? 'Modo Dark Ativo 🌙' : 'Modo Branco Ativo ☀️'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onSetTheme?.('light')}
            className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-black text-xs transition cursor-pointer active:scale-95 ${
              appData.settings?.theme !== 'dark'
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-900 dark:text-sky-200 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <span className="text-base">☀️</span>
            <span>Tela Branca (Clara)</span>
          </button>
          <button
            type="button"
            onClick={() => onSetTheme?.('dark')}
            className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-black text-xs transition cursor-pointer active:scale-95 ${
              appData.settings?.theme === 'dark'
                ? 'bg-slate-800 border-sky-400 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <span className="text-base">🌙</span>
            <span>Tela Dark (Escura)</span>
          </button>
        </div>
      </div>

      {/* App Installation Status / Download Banner */}
      {isInstalled ? (
        <div className="w-full p-4 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-left shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                Aplicativo Instalado
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                  No Aparelho
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Operando 100% offline com o ícone oficial
              </div>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 shrink-0">
            ✓ Ativo
          </span>
        </div>
      ) : (
        onOpenInstall && (
          <button
            type="button"
            onClick={onOpenInstall}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-sky-50 via-teal-50/50 to-white dark:from-slate-850 dark:to-slate-900 border-2 border-sky-200 dark:border-slate-700 flex items-center justify-between gap-3 text-left hover:border-sky-400 dark:hover:border-sky-500 transition cursor-pointer shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Baixar App com Ícone
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Instalável
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fixe o ícone oficial na tela inicial do celular ou baixe os arquivos
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-600 text-white shadow-xs group-hover:bg-sky-700 shrink-0">
              Abrir →
            </span>
          </button>
        )
      )}
    </div>
  );
}
