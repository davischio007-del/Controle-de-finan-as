/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FinancialAlert } from '../../types';
import { RefreshCw } from 'lucide-react';

export interface DismissedAlertCardProps {
  key?: React.Key;
  alert: FinancialAlert;
  onRestore: (id: string) => void;
}

export function DismissedAlertCard({ alert, onRestore }: DismissedAlertCardProps) {
  return (
    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-xs flex items-center justify-between gap-3 opacity-60 hover:opacity-100 transition-opacity">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-zinc-700 dark:text-zinc-300 text-xs line-through">{alert.title}</p>
          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-bold uppercase tracking-wider">
            Lido
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{alert.description}</p>
      </div>

      <button
        onClick={() => onRestore(alert.id)}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600 rounded-md shrink-0 cursor-pointer transition-colors"
        title="Restaurar alerta para ativos"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
