/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { HiddenAlertsBar } from './alerts/HiddenAlertsBar';
import { AlertsHeader } from './alerts/AlertsHeader';
import { AlertCard } from './alerts/AlertCard';
import { DismissedAlertCard } from './alerts/DismissedAlertCard';
import { AlertsEmpty } from './alerts/AlertsEmpty';

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
    setHideAlertsPanel,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'active' | 'dismissed'>('active');

  const dismissedAlerts = allGeneratedAlerts.filter(a => dismissedAlertIds.includes(a.id));

  if (hideAlertsPanel) {
    return (
      <HiddenAlertsBar
        alertsCount={alerts.length}
        onUnhide={() => setHideAlertsPanel(false)}
      />
    );
  }

  return (
    <div
      id="alerts-list-panel"
      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-xs relative space-y-3"
    >
      <AlertsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCount={alerts.length}
        dismissedCount={dismissedAlerts.length}
        onDismissAll={dismissAllAlerts}
        onRestoreAll={restoreAllAlerts}
        onHidePanel={() => setHideAlertsPanel(true)}
      />

      {activeTab === 'active' ? (
        alerts.length > 0 ? (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
            ))}
          </div>
        ) : (
          <AlertsEmpty
            dismissedCount={dismissedAlerts.length}
            onViewDismissed={() => setActiveTab('dismissed')}
          />
        )
      ) : dismissedAlerts.length > 0 ? (
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
          {dismissedAlerts.map(alert => (
            <DismissedAlertCard key={alert.id} alert={alert} onRestore={restoreAlert} />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Nenhum alerta foi marcado como lido recentemente.
        </div>
      )}
    </div>
  );
}
