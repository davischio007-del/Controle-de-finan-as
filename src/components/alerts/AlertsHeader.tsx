/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, History, CheckCheck, RotateCcw, EyeOff } from 'lucide-react';

interface AlertsHeaderProps {
  activeTab: 'active' | 'dismissed';
  setActiveTab: (tab: 'active' | 'dismissed') => void;
  activeCount: number;
  dismissedCount: number;
  onDismissAll: () => void;
  onRestoreAll: () => void;
  onHidePanel: () => void;
}

export function AlertsHeader({
  activeTab,
  setActiveTab,
  activeCount,
  dismissedCount,
  onDismissAll,
  onRestoreAll,
  onHidePanel,
}: AlertsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2.5">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </div>
        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
          Alertas Financeiros {activeTab === 'active' ? `Ativos (${activeCount})` : `Lidos (${dismissedCount})`}
        </h3>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${
              activeTab === 'active'
                ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Ativos ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('dismissed')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
              activeTab === 'dismissed'
                ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-2.5 h-2.5" />
            Lidos ({dismissedCount})
          </button>
        </div>

        {activeTab === 'active' && activeCount > 0 && (
          <button
            onClick={onDismissAll}
            id="btn-dismiss-all-alerts"
            className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
            title="Confirmar leitura de todos os alertas ativos"
          >
            <CheckCheck className="w-3 h-3" />
            Confirmar Todos
          </button>
        )}

        {activeTab === 'dismissed' && dismissedCount > 0 && (
          <button
            onClick={onRestoreAll}
            id="btn-restore-all-alerts"
            className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/40 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
            title="Restaurar todos os alertas lidos para ativos"
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar Todos
          </button>
        )}

        <button
          onClick={onHidePanel}
          id="btn-hide-alerts-panel"
          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg cursor-pointer transition-colors ml-1"
          title="Ocultar o painel de alertas"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
