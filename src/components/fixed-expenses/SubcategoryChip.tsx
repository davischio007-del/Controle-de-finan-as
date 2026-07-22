/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit2, X, Check } from 'lucide-react';

export interface SubcategoryChipProps {
  key?: React.Key;
  catId: string;
  subName: string;
  isEditing: boolean;
  editingValue: string;
  setEditingValue: (val: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
}

export function SubcategoryChip({
  subName,
  isEditing,
  editingValue,
  setEditingValue,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: SubcategoryChipProps) {
  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1 p-0.5 px-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
        <input
          type="text"
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          className="text-[10px] p-0.5 bg-white dark:bg-zinc-900 border rounded-sm text-zinc-800 dark:text-zinc-100 w-24 outline-hidden font-medium"
        />
        <button
          type="button"
          onClick={onSaveEdit}
          className="p-0.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-sm cursor-pointer"
          title="Salvar"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="p-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm cursor-pointer"
          title="Cancelar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-800">
      <span>{subName}</span>
      <div className="flex items-center gap-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-1">
        <button
          type="button"
          onClick={onStartEdit}
          className="p-0.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-sm focus:outline-hidden cursor-pointer"
          title="Editar subgrupo"
        >
          <Edit2 className="w-2.5 h-2.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-zinc-400 hover:text-rose-500 rounded-sm focus:outline-hidden cursor-pointer"
          title="Excluir subgrupo"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    </span>
  );
}
