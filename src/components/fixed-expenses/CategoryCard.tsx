/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExpenseCategory } from '../../types';
import { Tag, Check, X, Power, Edit2, Trash, PlusCircle } from 'lucide-react';
import { SubcategoryChip } from './SubcategoryChip';

export interface CategoryCardProps {
  key?: React.Key;
  cat: ExpenseCategory;
  editingCatId: string | null;
  editingCatName: string;
  setEditingCatId: (id: string | null) => void;
  setEditingCatName: (name: string) => void;
  onSaveEditCategory: (id: string) => void;
  onToggleCategoryActive: (cat: ExpenseCategory) => void;
  onDeleteCategory: (id: string) => void;
  editingSubgroup: { catId: string; subName: string } | null;
  editingSubgroupValue: string;
  setEditingSubgroup: (sub: { catId: string; subName: string } | null) => void;
  setEditingSubgroupValue: (val: string) => void;
  onSaveEditSubgroup: (catId: string, oldSubName: string) => void;
  onRemoveSubcategory: (catId: string, subName: string) => void;
  newSubName: string;
  setNewSubName: (val: string) => void;
  onAddSubcategory: (catId: string) => void;
}

export function CategoryCard({
  cat,
  editingCatId,
  editingCatName,
  setEditingCatId,
  setEditingCatName,
  onSaveEditCategory,
  onToggleCategoryActive,
  onDeleteCategory,
  editingSubgroup,
  editingSubgroupValue,
  setEditingSubgroup,
  setEditingSubgroupValue,
  onSaveEditSubgroup,
  onRemoveSubcategory,
  newSubName,
  setNewSubName,
  onAddSubcategory,
}: CategoryCardProps) {
  const isEditingThisCat = editingCatId === cat.id;

  return (
    <div
      className={`p-4 border rounded-xl space-y-3 transition-colors ${
        cat.isActive
          ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/20'
          : 'border-zinc-100 dark:border-zinc-900 bg-zinc-100/10 opacity-75'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {isEditingThisCat ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="text"
              value={editingCatName}
              onChange={(e) => setEditingCatName(e.target.value)}
              className="text-xs p-1 px-2 border rounded-md border-indigo-300 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 flex-1 outline-hidden"
            />
            <button
              onClick={() => onSaveEditCategory(cat.id)}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingCatId(null)}
              className="p-1 text-zinc-400 hover:bg-zinc-50 rounded-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Tag className={`w-3.5 h-3.5 ${cat.isActive ? 'text-indigo-500' : 'text-zinc-400'}`} />
            <span
              className={`text-xs font-black ${
                cat.isActive ? 'text-zinc-800 dark:text-zinc-100' : 'line-through text-zinc-400'
              }`}
            >
              {cat.name}
            </span>
            <span
              className={`text-[8px] px-1 rounded-xs font-bold uppercase ${
                cat.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {cat.isActive ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleCategoryActive(cat)}
            title={cat.isActive ? 'Inativar Categoria' : 'Ativar Categoria'}
            className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
              cat.isActive ? 'text-emerald-600' : 'text-zinc-400'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setEditingCatId(cat.id);
              setEditingCatName(cat.name);
            }}
            className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDeleteCategory(cat.id)}
            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subcategorias vinculadas */}
      <div className="border-t border-zinc-100 dark:border-zinc-850 pt-2.5 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Subgrupos Vinculados
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {cat.subcategories.length} subgrupo(s)
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {cat.subcategories.length === 0 ? (
            <span className="text-[10px] text-zinc-400 italic font-medium">
              Nenhum subgrupo cadastrado
            </span>
          ) : (
            cat.subcategories.map(sub => {
              const isEditingThisSub =
                editingSubgroup?.catId === cat.id && editingSubgroup?.subName === sub;

              return (
                <SubcategoryChip
                  key={sub}
                  catId={cat.id}
                  subName={sub}
                  isEditing={isEditingThisSub}
                  editingValue={editingSubgroupValue}
                  setEditingValue={setEditingSubgroupValue}
                  onStartEdit={() => {
                    setEditingSubgroup({ catId: cat.id, subName: sub });
                    setEditingSubgroupValue(sub);
                  }}
                  onCancelEdit={() => setEditingSubgroup(null)}
                  onSaveEdit={() => onSaveEditSubgroup(cat.id, sub)}
                  onRemove={() => onRemoveSubcategory(cat.id, sub)}
                />
              );
            })
          )}
        </div>

        {/* Adicionar Subcategoria Rápido */}
        <div className="flex gap-1 pt-1">
          <input
            type="text"
            placeholder="Adicionar subgrupo aqui..."
            value={newSubName || ''}
            onChange={(e) => setNewSubName(e.target.value)}
            className="text-[10px] p-1 px-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-md flex-1 outline-hidden"
          />
          <button
            type="button"
            onClick={() => onAddSubcategory(cat.id)}
            className="p-1 bg-zinc-100 hover:bg-indigo-50 dark:bg-zinc-900 text-indigo-600 rounded-md cursor-pointer"
            title="Adicionar Subgrupo"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
