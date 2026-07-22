/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FinancialAlert } from '../../types';
import { AlertCircle, Calendar, CreditCard, Info, AlertTriangle, Check } from 'lucide-react';

export interface AlertCardProps {
  key?: React.Key;
  alert: FinancialAlert;
  onDismiss: (id: string) => void;
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const isDanger = alert.severity === 'danger';
  const isWarning = alert.severity === 'warning';

  return (
    <div
      className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 transition-all ${
        isDanger
          ? 'bg-rose-50/50 border-rose-100 text-rose-900 dark:bg-rose-950/10 dark:border-rose-900/30'
          : isWarning
          ? 'bg-amber-50/50 border-amber-100 text-amber-900 dark:bg-amber-950/10 dark:border-amber-900/30'
          : 'bg-blue-50/50 border-blue-100 text-blue-900 dark:bg-blue-950/10 dark:border-blue-900/30'
      }`}
    >
      <div className="flex gap-3 items-start min-w-0 flex-1">
        <div
          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
            isDanger
              ? 'bg-rose-500/10 text-rose-600'
              : isWarning
              ? 'bg-amber-500/10 text-amber-600'
              : 'bg-blue-500/10 text-blue-600'
          }`}
        >
          {alert.type === 'atrasado' && <AlertCircle className="w-4 h-4" />}
          {alert.type === 'vencendo' && <Calendar className="w-4 h-4" />}
          {(alert.type === 'limite_cartao' || alert.type === 'fechamento_cartao') && (
            <CreditCard className="w-4 h-4" />
          )}
          {alert.type === 'consignado_proximo' && <AlertTriangle className="w-4 h-4" />}
          {alert.type === 'parcelas_terminando' && <Info className="w-4 h-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{alert.title}</p>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                isDanger
                  ? 'bg-rose-100 text-rose-800'
                  : isWarning
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {alert.severity}
            </span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">{alert.description}</p>
          {alert.dueDate && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-1 font-medium">
              Vencimento: {new Date(alert.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onDismiss(alert.id)}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-md shrink-0 cursor-pointer transition-colors"
        title="Confirmar leitura / Ocultar alerta"
      >
        <Check className="w-4 h-4" />
      </button>
    </div>
  );
}
