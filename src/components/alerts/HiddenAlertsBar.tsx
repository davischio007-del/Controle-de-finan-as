/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Eye } from 'lucide-react';

interface HiddenAlertsBarProps {
  alertsCount: number;
  onUnhide: () => void;
}

export function HiddenAlertsBar({ alertsCount, onUnhide }: HiddenAlertsBarProps) {
  return (
    <div
      id="alerts-hidden-bar"
      className="bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs"
    >
      <div className="flex items-center gap-2.5">
        <div className="relative p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <Bell className="w-4 h-4" />
          {alertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          )}
        </div>
        <div>
          <span className="font-bold text-zinc-700 dark:text-zinc-300">
            Alertas Financeiros Ocultos
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-2 font-medium">
            ({alertsCount} {alertsCount === 1 ? 'alerta pendente' : 'alertas pendentes'})
          </span>
        </div>
      </div>

      <button
        onClick={onUnhide}
        id="btn-unhide-alerts-panel"
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/50 rounded-lg cursor-pointer transition-colors"
        title="Exibir o painel de alertas"
      >
        <Eye className="w-3.5 h-3.5" />
        Exibir Painel de Alertas
      </button>
    </div>
  );
}
