/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { UseCategoryManagerReturn } from '../../hooks/useCategoryManager';
import { CategoryCard } from './CategoryCard';

export function CategoryManager({
  newCatName,
  setNewCatName,
  editingCatId,
  setEditingCatId,
  editingCatName,
  setEditingCatName,
  newSubName,
  setNewSubName,
  selectedParentCatId,
  setSelectedParentCatId,
  subgroupFormName,
  setSubgroupFormName,
  editingSubgroup,
  setEditingSubgroup,
  editingSubgroupValue,
  setEditingSubgroupValue,
  fixedCategories,
  activeCategories,
  handleAddCategory,
  handleSaveEditCategory,
  handleToggleCategoryActive,
  handleAddSubcategory,
  handleAddSubgroupWithParent,
  handleSaveEditSubgroup,
  handleRemoveSubcategory,
  deleteFixedCategory,
}: UseCategoryManagerReturn) {
  return (
    <div
      id="category-manager-section"
      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-6"
    >
      <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3">
        <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">
          Configuração de Categorias - Contas Fixas
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Crie, edite, exclua ou inative categorias de despesas fixas de forma autônoma.
        </p>
      </div>

      {/* Formulários de Cadastro de Grupos e Subgrupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800">
        {/* 1. Criar Grupo (Categoria Principal) */}
        <form onSubmit={handleAddCategory} className="space-y-2">
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
            1. Criar Novo Grupo (Categoria Principal)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Ex: Moradia, Assinaturas..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-medium"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Grupo
            </button>
          </div>
        </form>

        {/* 2. Criar Subgrupo vinculado a um Grupo Pai */}
        <form onSubmit={handleAddSubgroupWithParent} className="space-y-2">
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
            2. Criar Subgrupo (Vincular ao Grupo Pai)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              required
              value={selectedParentCatId}
              onChange={(e) => setSelectedParentCatId(e.target.value)}
              className="text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="" disabled>
                Selecione o Grupo Pai...
              </option>
              {activeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              placeholder="Ex: Água, Internet..."
              value={subgroupFormName}
              onChange={(e) => setSubgroupFormName(e.target.value)}
              className="flex-1 text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-medium"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Subgrupo
            </button>
          </div>
        </form>
      </div>

      {/* Listagem de Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {fixedCategories.map(cat => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            editingCatId={editingCatId}
            editingCatName={editingCatName}
            setEditingCatId={setEditingCatId}
            setEditingCatName={setEditingCatName}
            onSaveEditCategory={handleSaveEditCategory}
            onToggleCategoryActive={handleToggleCategoryActive}
            onDeleteCategory={deleteFixedCategory}
            editingSubgroup={editingSubgroup}
            editingSubgroupValue={editingSubgroupValue}
            setEditingSubgroup={setEditingSubgroup}
            setEditingSubgroupValue={setEditingSubgroupValue}
            onSaveEditSubgroup={handleSaveEditSubgroup}
            onRemoveSubcategory={handleRemoveSubcategory}
            newSubName={newSubName[cat.id] || ''}
            setNewSubName={(val) => setNewSubName(prev => ({ ...prev, [cat.id]: val }))}
            onAddSubcategory={handleAddSubcategory}
          />
        ))}
      </div>
    </div>
  );
}
