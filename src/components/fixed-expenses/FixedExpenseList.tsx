/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FixedExpense, ExpenseCategory } from '../../types';
import { Filter, Sparkles } from 'lucide-react';
import { FixedExpenseItem } from './FixedExpenseItem';

interface FixedExpenseListProps {
  filteredExpenses: FixedExpense[];
  currentYearMonth: string;
  selectedMonth: number;
  selectedYear: number;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  fixedCategories: ExpenseCategory[];
  onTogglePaid: (id: string, monthYear: string) => void;
  onEdit: (item: FixedExpense) => void;
  onDelete: (id: string) => void;
}

export function FixedExpenseList({
  filteredExpenses,
  currentYearMonth,
  selectedMonth,
  selectedYear,
  filterCategory,
  setFilterCategory,
  fixedCategories,
  onTogglePaid,
  onEdit,
  onDelete,
}: FixedExpenseListProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
      {/* Header & Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Contas Fixas</h3>
          <p className="text-xs text-zinc-500">Acompanhe vencimentos e marque como pagas para este mês.</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            id="filter-fixed-category"
            className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden"
          >
            <option value="">Todas Categorias</option>
            {fixedCategories.map(c => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listagem de contas */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
            <p className="text-xs font-semibold">Nenhuma conta fixa aplicável</p>
            <p className="text-[10px] mt-0.5 font-medium">
              Não há contas ativas de vigência iniciada em {selectedMonth}/{selectedYear}.
            </p>
          </div>
        ) : (
          filteredExpenses.map(item => {
            const isPaid = (item.paidMonths || []).includes(currentYearMonth);
            return (
              <FixedExpenseItem
                key={item.id}
                item={item}
                isPaid={isPaid}
                currentYearMonth={currentYearMonth}
                onTogglePaid={onTogglePaid}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
