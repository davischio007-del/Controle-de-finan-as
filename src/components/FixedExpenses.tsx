/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { FixedExpense } from '../types';
import { Plus, Trash, Edit2, Check, X, Calendar, CheckSquare, Square, DollarSign, Filter, Sparkles, AlertCircle } from 'lucide-react';

export default function FixedExpenses() {
  const { data, addFixedExpense, updateFixedExpense, toggleFixedExpensePaid, deleteFixedExpense, selectedYear, selectedMonth } = useFinancial();

  // Estados de formulário
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Internet');
  const [formValue, setFormValue] = useState<number | ''>('');
  const [formDueDay, setFormDueDay] = useState<number | ''>('');
  const [formIsRecur, setFormIsRecur] = useState(true);
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Pix');

  // Filtros locais
  const [filterCategory, setFilterCategory] = useState('');

  const currentYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const categories = [
    'Internet', 'Energia', 'Água', 'Escola', 'Academia', 'Financiamento', 'Aluguel', 'Condomínio', 'Streaming', 'Telefone', 'Outros'
  ];

  const paymentMethods = [
    'Pix', 'Boleto Bancário', 'Débito Automático', 'Cartão de Crédito', 'Débito em Conta', 'Dinheiro'
  ];

  const handleStartEdit = (f: FixedExpense) => {
    setEditingId(f.id);
    setFormName(f.name);
    setFormCategory(f.category);
    setFormValue(f.value);
    setFormDueDay(f.dueDay);
    setFormIsRecur(f.isRecurring);
    setFormStart(f.startDate);
    setFormEnd(f.endDate || '');
    setFormPayMethod(f.paymentMethod);
    setIsAdding(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('Internet');
    setFormValue('');
    setFormDueDay('');
    setFormIsRecur(true);
    setFormStart('');
    setFormEnd('');
    setFormPayMethod('Pix');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCategory || !formValue || !formDueDay || !formStart) return;

    const expenseData = {
      name: formName,
      category: formCategory,
      value: Number(formValue),
      dueDay: Number(formDueDay),
      isRecurring: formIsRecur,
      startDate: formStart,
      endDate: formEnd || undefined,
      paymentMethod: formPayMethod,
      isPaid: false
    };

    if (editingId) {
      updateFixedExpense(editingId, expenseData);
    } else {
      addFixedExpense(expenseData);
    }
    resetForm();
  };

  // Filtragem
  const filteredExpenses = data.fixedExpenses.filter(f => {
    // 1. Filtro de vigência temporal
    const startYM = f.startDate.slice(0, 7);
    if (startYM > currentYearMonth) return false; // Ainda não começou

    if (f.endDate) {
      const endYM = f.endDate.slice(0, 7);
      if (endYM < currentYearMonth) return false; // Já terminou
    }

    // 2. Filtro de Categoria
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div id="metric-fixed-total" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/20 rounded-xl shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Contas Fixas</p>
            <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-1">
              R$ {totalFixedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Obrigações recorrentes de {selectedMonth}/{selectedYear}</p>
          </div>
        </div>

        <div id="metric-fixed-paid" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 rounded-xl shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Pago</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {totalPaidVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Contas quitadas neste mês</p>
          </div>
        </div>

        <div id="metric-fixed-pending" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/20 rounded-xl shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total em Aberto</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              R$ {pendingVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Aguardando pagamento</p>
          </div>
        </div>
      </div>

      {/* Grid de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Lista de Contas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Contas Fixas</h3>
                <p className="text-xs text-zinc-500">Acompanhe as datas de vencimento e marque como pagas para este mês.</p>
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
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Listagem */}
            <div className="space-y-3">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-semibold">Nenhuma conta fixa aplicável</p>
                  <p className="text-[10px] mt-0.5 font-medium">Não há contas ativas de vigência iniciada em {selectedMonth}/{selectedYear}.</p>
                </div>
              ) : (
                filteredExpenses.map(item => {
                  const isPaid = (item.paidMonths || []).includes(currentYearMonth);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition-all ${
                        isPaid
                          ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30 text-zinc-400'
                          : 'bg-zinc-50/30 dark:bg-zinc-900/10 border-zinc-150 dark:border-zinc-850'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Caixa de seleção rápida de pagamento */}
                        <button
                          onClick={() => toggleFixedExpensePaid(item.id, currentYearMonth)}
                          id={`btn-fixed-toggle-paid-${item.id}`}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isPaid
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-600'
                          }`}
                        >
                          {isPaid ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate">{item.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold uppercase tracking-wider">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                            Vence dia: <strong className="text-zinc-700 dark:text-zinc-300">{item.dueDay}</strong> • {item.paymentMethod}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
                        <div className="text-right">
                          <p className={`text-xs font-black ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-850 dark:text-zinc-100'}`}>
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-wide mt-1 ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                          <button
                            onClick={() => handleStartEdit(item)}
                            id={`btn-fixed-edit-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteFixedExpense(item.id)}
                            id={`btn-fixed-delete-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {editingId ? 'Editar Conta Recorrente' : 'Cadastrar Conta Fixa'}
            </h3>
            {(editingId || isAdding) && (
              <button
                onClick={resetForm}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nome do Vencimento</label>
              <input
                required
                type="text"
                placeholder="Ex: Aluguel, Internet Fibra"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                id="input-fixed-name"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Categoria</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  id="select-fixed-category"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Forma Pagamento</label>
                <select
                  value={formPayMethod}
                  onChange={(e) => setFormPayMethod(e.target.value)}
                  id="select-fixed-pay-method"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                >
                  {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Mensal (R$)</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-fixed-value"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Dia do Vencimento</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  placeholder="15"
                  value={formDueDay}
                  onChange={(e) => setFormDueDay(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-fixed-due-day"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Início</label>
                <input
                  required
                  type="date"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  id="input-fixed-start"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Fim (Opcional)</label>
                <input
                  type="date"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  id="input-fixed-end"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={formIsRecur}
                onChange={(e) => setFormIsRecur(e.target.checked)}
                id="checkbox-fixed-recur"
                className="rounded-sm text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer"
              />
              <label htmlFor="checkbox-fixed-recur" className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold select-none cursor-pointer">
                Recorrente mensal automático
              </label>
            </div>

            <button
              type="submit"
              id="btn-fixed-save"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
            >
              {editingId ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Conta Fixa
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
