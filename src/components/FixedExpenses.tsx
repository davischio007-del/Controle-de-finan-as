/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useFixedExpenseForm } from '../hooks/useFixedExpenseForm';
import { useCategoryManager } from '../hooks/useCategoryManager';
import { SummaryCards } from './fixed-expenses/SummaryCards';
import { CategoryManager } from './fixed-expenses/CategoryManager';
import { FixedExpenseList } from './fixed-expenses/FixedExpenseList';
import { FixedExpenseForm } from './fixed-expenses/FixedExpenseForm';
import { Settings } from 'lucide-react';
import { Button } from './ui/Button';

export default function FixedExpenses() {
  const {
    data,
    selectedYear,
    selectedMonth,
    toggleFixedExpensePaid,
    deleteFixedExpense,
  } = useFinancial();

  const form = useFixedExpenseForm();
  const category = useCategoryManager();
  const [filterCategory, setFilterCategory] = useState('');

  const currentYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Filtragem das Contas Fixas de acordo com a vigência temporal e categoria selecionada
  const filteredExpenses = data.fixedExpenses.filter(f => {
    const startYM = f.startDate.slice(0, 7);
    if (startYM > currentYearMonth) return false;

    if (f.endDate) {
      const endYM = f.endDate.slice(0, 7);
      if (endYM < currentYearMonth) return false;
    }

    if (filterCategory && f.category !== filterCategory) return false;

    return true;
  });

  const totalFixedVal = filteredExpenses.reduce((sum, f) => sum + f.value, 0);
  const totalPaidVal = filteredExpenses
    .filter(f => (f.paidMonths || []).includes(currentYearMonth))
    .reduce((sum, f) => sum + f.value, 0);

  const pendingVal = totalFixedVal - totalPaidVal;

  return (
    <div id="fixed-expenses-panel" className="space-y-6">
      {/* Resumo de Contas Fixas do Mês */}
      <SummaryCards
        totalVal={totalFixedVal}
        paidVal={totalPaidVal}
        pendingVal={pendingVal}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      {/* Botão de abrir/fechar Gerenciador de Categorias */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          icon={Settings}
          onClick={() => category.setShowCatManager(!category.showCatManager)}
          id="btn-toggle-category-manager"
        >
          {category.showCatManager
            ? 'Fechar Configuração de Categorias'
            : 'Gerenciar Categorias & Subcategorias'}
        </Button>
      </div>

      {/* Gerenciador de Categorias */}
      {category.showCatManager && <CategoryManager {...category} />}

      {/* Conteúdo Principal: Listagem + Formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FixedExpenseList
            filteredExpenses={filteredExpenses}
            currentYearMonth={currentYearMonth}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            fixedCategories={data.fixedCategories || []}
            onTogglePaid={toggleFixedExpensePaid}
            onEdit={form.handleStartEdit}
            onDelete={deleteFixedExpense}
          />
        </div>

        <FixedExpenseForm {...form} />
      </div>
    </div>
  );
}
