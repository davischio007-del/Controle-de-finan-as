/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FixedExpense } from '../../types';
import { CheckSquare, Square, CreditCard, Edit2, Trash } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export interface FixedExpenseItemProps {
  key?: React.Key;
  item: FixedExpense;
  isPaid: boolean;
  currentYearMonth: string;
  onTogglePaid: (id: string, monthYear: string) => void;
  onEdit: (item: FixedExpense) => void;
  onDelete: (id: string) => void;
}

export function FixedExpenseItem({
  item,
  isPaid,
  currentYearMonth,
  onTogglePaid,
  onEdit,
  onDelete,
}: FixedExpenseItemProps) {
  return (
    <div
      className={`p-4 border rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition-all ${
        isPaid
          ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30 text-zinc-400'
          : 'bg-zinc-50/30 dark:bg-zinc-900/10 border-zinc-150 dark:border-zinc-850'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* Caixa de seleção rápida de pagamento */}
        <button
          onClick={() => onTogglePaid(item.id, currentYearMonth)}
          id={`btn-fixed-toggle-paid-${item.id}`}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
            isPaid
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-600'
          }`}
        >
          {isPaid ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate">
              {item.name}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold uppercase tracking-wider">
              {item.category} {item.subcategory ? `> ${item.subcategory}` : ''}
            </span>
            {item.cardPurchaseId && (
              <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-xs bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 font-bold uppercase tracking-wider">
                <CreditCard className="w-2 h-2" /> Cartão
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
            Vence dia: <strong className="text-zinc-700 dark:text-zinc-300">{item.dueDay}</strong> • {item.paymentMethod}
            {item.purchaseDate &&
              ` (Compra: ${new Date(item.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR')})`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
        <div className="text-right">
          <p
            className={`text-xs font-black ${
              isPaid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-zinc-850 dark:text-zinc-100'
            }`}
          >
            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span
            className={`inline-flex px-1.5 py-0.5 rounded-xs text-[8px] font-bold uppercase tracking-wide mt-1 ${
              isPaid ? 'bg-emerald-100 text-emerald-850' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isPaid ? 'Pago' : 'Pendente'}
          </span>
        </div>

        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
          <IconButton
            icon={Edit2}
            color="primary"
            size="sm"
            onClick={() => onEdit(item)}
            id={`btn-fixed-edit-${item.id}`}
            title="Editar conta"
          />
          <IconButton
            icon={Trash}
            color="danger"
            size="sm"
            onClick={() => onDelete(item.id)}
            id={`btn-fixed-delete-${item.id}`}
            title="Excluir conta"
          />
        </div>
      </div>
    </div>
  );
}
