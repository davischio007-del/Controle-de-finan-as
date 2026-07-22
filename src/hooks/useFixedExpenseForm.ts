/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { FixedExpense } from '../types';

export function useFixedExpenseForm() {
  const {
    data,
    addFixedExpense,
    updateFixedExpense,
  } = useFinancial();

  const fixedCategories = data.fixedCategories || [];
  const activeCategories = fixedCategories.filter(c => c.isActive);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formValue, setFormValue] = useState<number | ''>('');
  const [formDueDay, setFormDueDay] = useState<number | ''>('');
  const [formIsRecur, setFormIsRecur] = useState(true);
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Pix');
  const [formCardId, setFormCardId] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('2026-07-20');

  useEffect(() => {
    if (activeCategories.length > 0 && !formCategory) {
      setFormCategory(activeCategories[0].name);
      if (activeCategories[0].subcategories.length > 0) {
        setFormSubcategory(activeCategories[0].subcategories[0]);
      }
    }
  }, [activeCategories, formCategory]);

  const handleCategoryChange = (catName: string) => {
    setFormCategory(catName);
    const cat = fixedCategories.find(c => c.name === catName);
    if (cat && cat.subcategories.length > 0) {
      setFormSubcategory(cat.subcategories[0]);
    } else {
      setFormSubcategory('');
    }
  };

  const handleStartEdit = (f: FixedExpense) => {
    setEditingId(f.id);
    setFormName(f.name);
    setFormCategory(f.category);
    setFormSubcategory(f.subcategory || '');
    setFormValue(f.value);
    setFormDueDay(f.dueDay);
    setFormIsRecur(f.isRecurring);
    setFormStart(f.startDate);
    setFormEnd(f.endDate || '');
    setFormPayMethod(f.paymentMethod);
    setFormCardId(f.cardId || '');
    setFormPurchaseDate(f.purchaseDate || '2026-07-20');
    setIsAdding(false);
  };

  const resetForm = () => {
    setFormName('');
    const firstCat = activeCategories[0]?.name || '';
    setFormCategory(firstCat);
    const catObj = activeCategories.find(c => c.name === firstCat);
    setFormSubcategory(catObj?.subcategories?.[0] || '');
    setFormValue('');
    setFormDueDay('');
    setFormIsRecur(true);
    setFormStart('');
    setFormEnd('');
    setFormPayMethod('Pix');
    setFormCardId(data.creditCards[0]?.id || '');
    setFormPurchaseDate('2026-07-20');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCategory || !formValue || !formDueDay || !formStart) return;

    const expenseData = {
      name: formName,
      category: formCategory,
      subcategory: formSubcategory || undefined,
      value: Number(formValue),
      dueDay: Number(formDueDay),
      isRecurring: formIsRecur,
      startDate: formStart,
      endDate: formEnd || undefined,
      paymentMethod: formPayMethod,
      isPaid: false,
      cardId: formPayMethod === 'Cartão' ? formCardId : undefined,
      purchaseDate: formPayMethod === 'Cartão' ? formPurchaseDate : undefined,
    };

    if (editingId) {
      updateFixedExpense(editingId, expenseData);
    } else {
      addFixedExpense(expenseData);
    }
    resetForm();
  };

  return {
    formName,
    setFormName,
    formCategory,
    setFormCategory,
    formSubcategory,
    setFormSubcategory,
    formValue,
    setFormValue,
    formDueDay,
    setFormDueDay,
    formIsRecur,
    setFormIsRecur,
    formStart,
    setFormStart,
    formEnd,
    setFormEnd,
    formPayMethod,
    setFormPayMethod,
    formCardId,
    setFormCardId,
    formPurchaseDate,
    setFormPurchaseDate,
    isAdding,
    setIsAdding,
    editingId,
    activeCategories,
    creditCards: data.creditCards,
    handleCategoryChange,
    handleStartEdit,
    resetForm,
    handleSave,
  };
}

export type UseFixedExpenseFormReturn = ReturnType<typeof useFixedExpenseForm>;
