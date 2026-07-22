/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell } from 'lucide-react';

interface AlertsEmptyProps {
  dismissedCount: number;
  onViewDismissed: () => void;
}

export function AlertsEmpty({ dismissedCount, onViewDismissed }: AlertsEmptyProps) {
  return (
    <div
      id="alerts-empty-state"
      className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3.5 flex items-center justify-between gap-3"
    >
      <div className="flex gap-3 items-center">
        <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-lg shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
            Tudo sob controle!
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
            Nenhum alerta pendente no momento.
          </p>
        </div>
      </div>

      {dismissedCount > 0 && (
        <button
          onClick={onViewDismissed}
          className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0"
        >
          Ver Lidos ({dismissedCount}) &rarr;
        </button>
      )}
    </div>
  );
}
