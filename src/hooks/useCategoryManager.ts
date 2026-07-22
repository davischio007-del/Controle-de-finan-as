/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { ExpenseCategory } from '../types';

export function useCategoryManager() {
  const {
    data,
    addFixedCategory,
    updateFixedCategory,
    deleteFixedCategory,
  } = useFinancial();

  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newSubName, setNewSubName] = useState<{ [catId: string]: string }>({});

  const [selectedParentCatId, setSelectedParentCatId] = useState<string>('');
  const [subgroupFormName, setSubgroupFormName] = useState('');
  const [editingSubgroup, setEditingSubgroup] = useState<{ catId: string; subName: string } | null>(null);
  const [editingSubgroupValue, setEditingSubgroupValue] = useState('');

  const fixedCategories = data.fixedCategories || [];
  const activeCategories = fixedCategories.filter(c => c.isActive);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addFixedCategory({
      name: newCatName.trim(),
      isActive: true,
      subcategories: [],
    });
    setNewCatName('');
  };

  const handleSaveEditCategory = (id: string) => {
    if (!editingCatName.trim()) return;
    updateFixedCategory(id, { name: editingCatName.trim() });
    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleToggleCategoryActive = (cat: ExpenseCategory) => {
    updateFixedCategory(cat.id, { isActive: !cat.isActive });
  };

  const handleAddSubcategory = (catId: string) => {
    const subName = newSubName[catId];
    if (!subName || !subName.trim()) return;
    const cat = fixedCategories.find(c => c.id === catId);
    if (!cat) return;

    if (!cat.subcategories.includes(subName.trim())) {
      const updatedSubs = [...cat.subcategories, subName.trim()];
      updateFixedCategory(catId, { subcategories: updatedSubs });
    }
    setNewSubName(prev => ({ ...prev, [catId]: '' }));
  };

  const handleAddSubgroupWithParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCatId || !subgroupFormName.trim()) return;
    const cat = fixedCategories.find(c => c.id === selectedParentCatId);
    if (!cat) return;

    if (!cat.subcategories.includes(subgroupFormName.trim())) {
      const updatedSubs = [...cat.subcategories, subgroupFormName.trim()];
      updateFixedCategory(selectedParentCatId, { subcategories: updatedSubs });
    }
    setSubgroupFormName('');
  };

  const handleSaveEditSubgroup = (catId: string, oldSubName: string) => {
    if (!editingSubgroupValue.trim()) return;
    const cat = fixedCategories.find(c => c.id === catId);
    if (!cat) return;

    const updatedSubs = cat.subcategories.map(s => (s === oldSubName ? editingSubgroupValue.trim() : s));
    updateFixedCategory(catId, { subcategories: updatedSubs });
    setEditingSubgroup(null);
    setEditingSubgroupValue('');
  };

  const handleRemoveSubcategory = (catId: string, subNameToRemove: string) => {
    const cat = fixedCategories.find(c => c.id === catId);
    if (!cat) return;

    const updatedSubs = cat.subcategories.filter(s => s !== subNameToRemove);
    updateFixedCategory(catId, { subcategories: updatedSubs });
  };

  return {
    showCatManager,
    setShowCatManager,
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
  };
}

export type UseCategoryManagerReturn = ReturnType<typeof useCategoryManager>;
