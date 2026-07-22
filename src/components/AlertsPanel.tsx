/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { 
  AlertTriangle, Bell, Info, AlertCircle, Calendar, 
  CreditCard, Check, CheckCheck, Eye, EyeOff, RotateCcw, 
  ChevronDown, ChevronUp, History
} from 'lucide-react';

export default function AlertsPanel() {
  const { 
    alerts, 
    allGeneratedAlerts, 
    dismissedAlertIds, 
    dismissAlert, 
    restoreAlert, 
    dismissAllAlerts, 
    restoreAllAlerts, 
    hideAlertsPanel, 
    setHideAlertsPanel 
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'active' | 'dismissed'>('active');

  const dismissedAlerts = allGeneratedAlerts.filter(a => dismissedAlertIds.includes(a.id));

  // Se o painel estiver configurado como oculto pelo usuário
  if (hideAlertsPanel) {
    return (
      <div 
        id="alerts-hidden-bar" 
        className="bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
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
              ({alerts.length} {alerts.length === 1 ? 'alerta pendente' : 'alertas pendentes'})
            </span>
          </div>
        </div>

        <button
          onClick={() => setHideAlertsPanel(false)}
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

  return (
    <div id="alerts-list-panel" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-sm relative space-y-3">
      {/* Cabeçalho do Painel */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </div>
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Alertas Financeiros {activeTab === 'active' ? `Ativos (${alerts.length})` : `Lidos (${dismissedAlerts.length})`}
          </h3>
        </div>

        {/* Abas e Controles de Leitura e Ocultação */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Alternador de Abas (Ativos x Lidos) */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Ativos ({alerts.length})
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
              Lidos ({dismissedAlerts.length})
            </button>
          </div>

          {/* Botão Marcar Todos como Lidos */}
          {activeTab === 'active' && alerts.length > 0 && (
            <button
              onClick={dismissAllAlerts}
              id="btn-dismiss-all-alerts"
              className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
              title="Confirmar leitura de todos os alertas ativos"
            >
              <CheckCheck className="w-3 h-3" />
              Confirmar Todos
            </button>
          )}

          {/* Restaurar Todos */}
          {activeTab === 'dismissed' && dismissedAlerts.length > 0 && (
            <button
              onClick={restoreAllAlerts}
              id="btn-restore-all-alerts"
              className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/40 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
              title="Restaurar todos os alertas lidos para ativos"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Todos
            </button>
          )}

          {/* Botão Ocultar Painel Inteiro */}
          <button
            onClick={() => setHideAlertsPanel(true)}
            id="btn-hide-alerts-panel"
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg cursor-pointer transition-colors ml-1"
            title="Ocultar o painel de alertas"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conteúdo dos Alertas */}
      {activeTab === 'active' ? (
        alerts.length === 0 ? (
          <div id="alerts-empty-state" className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex gap-3 items-center">
              <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-lg shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Tudo sob controle!</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Nenhum alerta pendente no momento.</p>
              </div>
            </div>

            {dismissedAlerts.length > 0 && (
              <button
                onClick={() => setActiveTab('dismissed')}
                className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0"
              >
                Ver Lidos ({dismissedAlerts.length}) &rarr;
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {alerts.map(alert => {
              const isDanger = alert.severity === 'danger';
              const isWarning = alert.severity === 'warning';

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 transition-all ${
                    isDanger
                      ? 'bg-rose-50/50 border-rose-100 text-rose-900 dark:bg-rose-950/10 dark:border-rose-900/30'
                      : isWarning
                      ? 'bg-amber-50/50 border-amber-100 text-amber-900 dark:bg-amber-950/10 dark:border-amber-900/30'
                      : 'bg-blue-50/50 border-blue-100 text-blue-900 dark:bg-blue-950/10 dark:border-blue-900/30'
                  }`}
                >
                  <div className="flex gap-3 items-start min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
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

                  {/* Botão de Confirmar Leitura / Ocultar Alerta */}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    id={`btn-dismiss-alert-${alert.id}`}
                    className="shrink-0 p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/50 flex items-center gap-1"
                    title="Confirmar leitura / Ocultar este alerta"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold hidden sm:inline">Confirmar Leitura</span>
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Histórico de Alertas Lidos / Confirmados */
        dismissedAlerts.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Nenhum alerta foi marcado como lido recentemente.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {dismissedAlerts.map(alert => (
              <div
                key={alert.id}
                className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-xs flex items-center justify-between gap-3 opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex gap-3 items-center min-w-0 flex-1">
                  <div className="p-1.5 rounded-lg shrink-0 bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500">
                    <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-700 dark:text-zinc-300 line-through decoration-zinc-400">
                      {alert.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{alert.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => restoreAlert(alert.id)}
                  id={`btn-restore-alert-${alert.id}`}
                  className="shrink-0 p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50 flex items-center gap-1"
                  title="Restaurar alerta para os ativos"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold hidden sm:inline">Restaurar</span>
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
