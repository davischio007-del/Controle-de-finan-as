/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, CheckSquare, AlertCircle } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';

interface SummaryCardsProps {
  totalVal: number;
  paidVal: number;
  pendingVal: number;
  selectedMonth: number;
  selectedYear: number;
}

export function SummaryCards({
  totalVal,
  paidVal,
  pendingVal,
  selectedMonth,
  selectedYear,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        id="metric-fixed-total"
        title="Total de Contas Fixas"
        value={totalVal}
        icon={Calendar}
        color="blue"
        subtitle={`Obrigações vigentes em ${selectedMonth}/${selectedYear}`}
      />

      <MetricCard
        id="metric-fixed-paid"
        title="Total Pago"
        value={paidVal}
        icon={CheckSquare}
        color="green"
        subtitle="Contas marcadas como pagas"
      />

      <MetricCard
        id="metric-fixed-pending"
        title="Total em Aberto"
        value={pendingVal}
        icon={AlertCircle}
        color="red"
        subtitle="Aguardando liquidação"
      />
    </div>
  );
}
