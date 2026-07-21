/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { AlertTriangle, Bell, Info, AlertCircle, Calendar, CreditCard, ChevronRight } from 'lucide-react';

export default function AlertsPanel() {
  const { alerts } = useFinancial();

  if (alerts.length === 0) {
    return (
      <div id="alerts-empty-state" className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 flex gap-3 items-center">
        <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-lg shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Tudo sob controle!</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Nenhum alerta pendente ou conta vencida no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="alerts-list-panel" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 border-b border-zinc-100 dark:border-zinc-850 pb-2">
        <div className="relative">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
        </div>
        <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Alertas Financeiros Ativos ({alerts.length})</h3>
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {alerts.map(alert => {
          const isDanger = alert.severity === 'danger';
          const isWarning = alert.severity === 'warning';

          return (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border text-xs flex gap-3 transition-all ${
                isDanger
                  ? 'bg-rose-50/50 border-rose-100 text-rose-900 dark:bg-rose-950/10 dark:border-rose-900/30'
                  : isWarning
                  ? 'bg-amber-50/50 border-amber-100 text-amber-900 dark:bg-amber-950/10 dark:border-amber-900/30'
                  : 'bg-blue-50/50 border-blue-100 text-blue-900 dark:bg-blue-950/10 dark:border-blue-900/30'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${
                isDanger ? 'bg-rose-500/10 text-rose-600' :
                isWarning ? 'bg-amber-500/10 text-amber-600' :
                'bg-blue-500/10 text-blue-600'
              }`}>
                {alert.type === 'atrasado' && <AlertCircle className="w-4 h-4" />}
                {alert.type === 'vencendo' && <Calendar className="w-4 h-4" />}
                {alert.type === 'limite_cartao' && <CreditCard className="w-4 h-4" />}
                {alert.type === 'fechamento_cartao' && <Info className="w-4 h-4" />}
                {alert.type === 'consignado_proximo' && <AlertTriangle className="w-4 h-4" />}
                {alert.type === 'parcelas_terminando' && <Info className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`font-bold ${
                  isDanger ? 'text-rose-800 dark:text-rose-400' :
                  isWarning ? 'text-amber-800 dark:text-amber-400' :
                  'text-blue-800 dark:text-blue-400'
                }`}>
                  {alert.title}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
