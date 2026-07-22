/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type MetricColor = 'blue' | 'green' | 'red' | 'amber' | 'indigo' | 'emerald' | 'purple';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: MetricColor;
  subtitle?: string;
  formattedValue?: string;
  className?: string;
  id?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'indigo',
  subtitle,
  formattedValue,
  className = '',
  id,
}: MetricCardProps) {
  const colorMap: Record<MetricColor, { bg: string; text: string; border: string }> = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-900/30',
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/30',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/30',
    },
    red: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-100 dark:border-rose-900/30',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/30',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-900/30',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-900/30',
    },
  };

  const currentScheme = colorMap[color] || colorMap.indigo;

  const displayValue =
    typeof value === 'number'
      ? formattedValue ||
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : value;

  return (
    <div
      id={id}
      className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3 ${className}`}
    >
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          {title}
        </p>
        <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
          {displayValue}
        </p>
        {subtitle && (
          <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{subtitle}</p>
        )}
      </div>
      <div className={`p-2.5 rounded-xl border ${currentScheme.bg} ${currentScheme.text} ${currentScheme.border} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}
