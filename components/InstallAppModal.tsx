'use client';

import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Share2,
  Smartphone,
  Laptop,
  X,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Logo } from '@/components/Logo';
import confetti from 'canvas-confetti';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { isInstallable, isInstalled, install, markAsInstalled } = usePWAInstall();
  const [activeGuide, setActiveGuide] = useState<'android' | 'ios' | 'pc'>('android');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#10b981'],
      });
      setDownloadSuccess('Instalação iniciada com sucesso! O ícone foi adicionado à sua tela inicial.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-50/70 via-teal-50/40 to-white dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/70 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Baixar App com seu Ícone
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Instale na tela inicial do celular ou baixe os arquivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Notification Toast */}
          {downloadSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* App Icon Showcase Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-b from-sky-50/60 to-white dark:from-slate-855 dark:to-slate-900 border-2 border-sky-100 dark:border-slate-800 flex items-center gap-4 shadow-xs">
            <div className="relative group shrink-0">
              <Logo className="w-16 h-16 shadow-md" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-900 dark:text-white text-base truncate">
                  Lembragua.online
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  Ícone Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Água & Remédios • 100% Offline • Sem cadastro
              </p>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Fixa direto na tela do seu aparelho com este ícone
              </div>
            </div>
          </div>

          {/* Direct Install Button (if browser supports beforeinstallprompt) */}
          {isInstallable && (
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  ⚡ Instalação Direta Pronta:
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                  1 Toque
                </span>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Instalar Agora no Aparelho</span>
              </button>
            </div>
          )}

          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-black text-sm">Aplicativo Já Instalado!</p>
                <p className="text-[11px] font-normal text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Identificamos que o Lembragua.online já está instalado no seu aparelho com o ícone oficial. Os avisos de download foram ocultados.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Já adicionou o app à tela inicial?
              </span>
              <button
                type="button"
                onClick={() => {
                  markAsInstalled();
                  setDownloadSuccess('App marcado como instalado! O botão "Baixar App" foi ocultado.');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
              >
                Já Baixei / Já Instalei
              </button>
            </div>
          )}

          {/* Step-by-Step Instructions by Device */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
              Como adicionar o ícone à tela inicial:
            </h4>

            {/* Platform Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveGuide('android')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeGuide === 'android'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuide('ios')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeGuide === 'ios'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>🍎 iPhone</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuide('pc')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeGuide === 'pc'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>PC / Mac</span>
              </button>
            </div>

            {/* Android Guide */}
            {activeGuide === 'android' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-fade-in text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                  No Chrome ou Samsung Internet (Android):
                </div>
                <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 list-decimal list-inside pl-1 font-medium">
                  <li>Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.</li>
                  <li>Procure e toque em <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.</li>
                  <li>Confirme o nome <strong>Lembragua.online</strong>.</li>
                  <li>Pronto! O app aparecerá na gaveta e na tela inicial do seu celular com seu ícone próprio.</li>
                </ol>
              </div>
            )}

            {/* iOS Guide */}
            {activeGuide === 'ios' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-fade-in text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  No Safari do iPhone / iPad:
                </div>
                <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 list-decimal list-inside pl-1 font-medium">
                  <li>No Safari, toque no botão <strong>Compartilhar</strong> (o quadrado com uma seta para cima na barra inferior).</li>
                  <li>Role a lista de opções para baixo e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong>.</li>
                  <li>Verifique o ícone do <strong>Lembragua.online</strong> e toque em <strong>Adicionar</strong> no canto superior direito.</li>
                  <li>O app abrirá em tela cheia como um aplicativo nativo da Apple!</li>
                </ol>
              </div>
            )}

            {/* PC / Desktop Guide */}
            {activeGuide === 'pc' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-fade-in text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  No Chrome, Edge ou Opera (Computador):
                </div>
                <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 list-decimal list-inside pl-1 font-medium">
                  <li>Olhe na <strong>barra de endereços</strong> do navegador (à direita, onde fica a estrela de favoritos).</li>
                  <li>Clique no ícone de <strong>computador com seta para baixo</strong> ou <strong>&quot;Instalar Lembragua.online&quot;</strong>.</li>
                  <li>O aplicativo será aberto em uma janela dedicada e criará um atalho com seu ícone na área de trabalho.</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Lembragua.online • 100% Offline
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
