'use client';

import React, { useState } from 'react';
import { AppData } from '@/lib/types';
import { exportDataAsJSON, resetAllData } from '@/lib/storage';
import {
  ShieldCheck,
  Star,
  Download,
  HardDrive,
  Upload,
  Code2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Logo } from '@/components/Logo';

interface AboutModalProps {
  appData: AppData;
  onRestoreData: (data: AppData) => void;
  onClose: () => void;
  onSetTheme?: (theme: 'light' | 'dark') => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
}

export function AboutModal({
  appData,
  onRestoreData,
  onSetTheme,
  onOpenInstall,
  isInstalled = false,
}: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<'sobre' | 'codigo' | 'backup'>('sobre');
  const [rating, setRating] = useState<number>(5);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Rate stars
  const handleRate = (stars: number) => {
    setRating(stars);
    setRatingSubmitted(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#fbbf24', '#10b981'],
    });
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.water && parsed.medicine) {
          onRestoreData(parsed);
          showNotification('success', 'Dados restaurados com sucesso a partir do backup!');
        } else {
          showNotification('error', 'Arquivo de backup inválido.');
        }
      } catch {
        showNotification('error', 'Erro ao ler o arquivo JSON selecionado.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset data
  const handleResetData = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    const reset = resetAllData();
    onRestoreData(reset);
    setResetConfirm(false);
    showNotification('success', 'Os dados foram restaurados para o padrão original.');
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-fade-in w-full">
      {/* Inline Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold transition-all shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

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

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab('sobre')}
          className={`flex-1 py-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'sobre'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          ⭐ Avaliar & Sobre
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('codigo')}
          className={`flex-1 py-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'codigo'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          📱 Guia Android / APK
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex-1 py-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          💾 Meus Dados
        </button>
      </div>

      {/* TAB 1: Guia Android / APK & Código */}
      {activeTab === 'codigo' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-4 animate-fade-in transition-colors">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Como Gerar o APK Nativo para Android Studio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Você pode converter este aplicativo em um APK nativo instalável para a Google Play Store de formas muito fáceis. Aqui está a explicação simples:
            </p>
          </div>

          {/* Option 1: PWA Builder */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">1</span>
                Método Mais Fácil: PWABuilder (Gera APK em 1 clique)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Recomendado
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              O Google criou uma ferramenta oficial gratuita que pega qualquer PWA como este e gera o pacote APK/AAB pronto:
            </p>
            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-decimal list-inside font-medium">
              <li>Acesse <strong>pwabuilder.com</strong> no seu computador.</li>
              <li>Cole o endereço (URL) do seu aplicativo.</li>
              <li>Clique em <strong>&quot;Build My App&quot;</strong> e selecione <strong>Android</strong>.</li>
              <li>Ele gera o arquivo <code>.apk</code> e o projeto completo pronto para Android Studio!</li>
            </ol>
          </div>

          {/* Option 2: Android Studio com WebView / TWA */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px]">2</span>
              Método Android Studio Direto (Kotlin / Bubblewrap):
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Se você prefere abrir direto no Android Studio, pode rodar o comando:
            </p>
            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto space-y-1">
              <div># Instalar a ferramenta oficial do Google:</div>
              <div className="text-emerald-400">npm install -g @bubblewrap/cli</div>
              <div># Inicializar seu projeto Android:</div>
              <div className="text-emerald-400">bubblewrap init --manifest=URL_DO_APP/manifest.webmanifest</div>
              <div># Gerar o APK:</div>
              <div className="text-emerald-400">bubblewrap build</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Isso cria a pasta com o projeto Gradle e código Kotlin que você abre diretamente no Android Studio clicando em <em>Open Project</em>.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Avaliar & Sobre */}
      {activeTab === 'sobre' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-5 animate-fade-in transition-colors">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Os Pilares do Lembragua.online
            </h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-100 dark:border-sky-800 text-xs">
                <span className="text-lg">💧</span>
                <div className="font-bold text-sky-900 dark:text-sky-200 mt-1">1. Água</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Cálculo de meta e lembretes visuais.</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-800 text-xs">
                <span className="text-lg">💊</span>
                <div className="font-bold text-amber-900 dark:text-amber-200 mt-1">2. Remédios</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Avisos de horário até confirmar.</div>
              </div>
            </div>
          </div>

          {/* Rating Section */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-2">
            <h4 className="text-xs font-bold uppercase text-amber-900 dark:text-amber-200">
              O que você está achando do app?
            </h4>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRate(star)}
                  className="p-1 transition active:scale-125 cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {ratingSubmitted ? (
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-fade-in">
                ✨ Muito obrigado! Sua avaliação ajuda o Lembragua.online a continuar 100% gratuito e livre de anúncios para todos.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Toque nas estrelas para avaliar.
              </p>
            )}
          </div>

          <div className="text-center text-xs text-slate-400 dark:text-slate-500">
            Desenvolvido com carinho para simplificar sua rotina diária.
          </div>
        </div>
      )}

      {/* TAB 3: Meus Dados / Backup */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-4 animate-fade-in transition-colors">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Backup e Armazenamento Local
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Você tem total controle. Seus dados nunca saem do seu telefone. Você pode exportar um arquivo de backup ou restaurar a qualquer momento.
            </p>
          </div>

          {/* Export button */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">Exportar Backup</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Baixa um arquivo com todos seus registros e horários.
              </div>
            </div>
            <button
              type="button"
              onClick={() => exportDataAsJSON(appData)}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>

          {/* Import file */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">Restaurar Backup</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Restaura um arquivo de backup baixado anteriormente.
              </div>
            </div>
            <label className="px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              Restaurar
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset button */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-200">Limpar / Reiniciar Dados</div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400">
                Restaura os valores para o padrão inicial do aplicativo.
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                resetConfirm
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950'
              }`}
            >
              {resetConfirm ? 'Confirmar Limpeza' : 'Reiniciar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
