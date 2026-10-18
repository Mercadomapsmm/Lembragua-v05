'use client';

import { ArrowLeft, Bell, BellOff, Sun, Moon, Power } from 'lucide-react';
import { HabitTab } from '@/lib/types';
import { requestNotificationPermission } from '@/lib/notifications';
import { Logo } from '@/components/Logo';

interface HeaderProps {
  currentTab: HabitTab;
  onSelectTab: (tab: HabitTab) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onCloseApp?: () => void;
}

export function Header({
  currentTab,
  onSelectTab,
  notificationsEnabled,
  onToggleNotifications,
  theme,
  onToggleTheme,
  onCloseApp,
}: HeaderProps) {
  const handleNotificationClick = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        onToggleNotifications();
      } else {
        onToggleNotifications();
      }
    } else {
      onToggleNotifications();
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'water':
        return { title: 'Lembrete de Água', subtitle: 'Hidratação e Saúde', icon: '💧' };
      case 'medicine':
        return { title: 'Lembrete de Remédio', subtitle: 'Doses e Horários Certos', icon: '💊' };
      case 'evolution':
        return { title: 'Tela da Evolução', subtitle: 'Metas e Histórico dos 7 Dias', icon: '📈' };
      default:
        return { title: 'Lembragua.online', subtitle: 'Cuidado diário sem complicação', icon: null };
    }
  };

  const tabInfo = getTabTitle();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-4xl xl:max-w-5xl mx-auto px-3 sm:px-5 md:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          {currentTab !== 'home' ? (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => onSelectTab('home')}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm transition active:scale-95 cursor-pointer shrink-0"
                aria-label="Voltar para o início"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-100">Início</span>
              </button>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span className="shrink-0">{tabInfo.icon}</span>
                  <span className="truncate">{tabInfo.title}</span>
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden xs:block">{tabInfo.subtitle}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <Logo className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none truncate">
                  Lembragua.online
                </h1>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Leve • Sem cadastro • 100% Offline
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Theme Toggle, Notifications, Fechar App */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Duas opções para a cor da tela: Branco e Dark */}
          <div
            className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs"
            role="group"
            aria-label="Opções para a cor da tela: Branco e Dark"
          >
            <button
              type="button"
              onClick={() => {
                if (theme !== 'light') onToggleTheme();
              }}
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer min-h-[30px] ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tela na cor Branca (Clara)"
            >
              <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="hidden min-[480px]:inline">Branco</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (theme !== 'dark') onToggleTheme();
              }}
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer min-h-[30px] ${
                theme === 'dark'
                  ? 'bg-slate-700 text-amber-300 shadow-xs ring-1 ring-slate-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tela na cor Dark (Noturna)"
            >
              <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-amber-300' : 'text-slate-400'}`} />
              <span className="hidden min-[480px]:inline">Dark</span>
            </button>
          </div>

          {/* Notification Button */}
          <button
            onClick={handleNotificationClick}
            className={`p-1.5 sm:p-2 min-w-[34px] sm:min-w-[40px] min-h-[34px] sm:min-h-[40px] flex items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer ${
              notificationsEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
            }`}
            title={notificationsEnabled ? 'Notificações ativadas' : 'Ativar notificações'}
            aria-label="Controle de notificações"
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
            ) : (
              <BellOff className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            )}
          </button>

          {/* Botão Fechar o App */}
          {onCloseApp && (
            <button
              type="button"
              onClick={onCloseApp}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[34px] sm:min-h-[38px] rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs"
              title="Fechar o Aplicativo"
              aria-label="Fechar o Aplicativo"
            >
              <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
              <span>Fechar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
