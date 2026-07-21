/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Salary } from '../types';
import { Plus, Trash, Edit2, Check, X, TrendingUp, Filter, Calendar, Landmark, Sparkles } from 'lucide-react';

export default function Salaries() {
  const { data, addSalary, updateSalary, deleteSalary, selectedYear, selectedMonth } = useFinancial();

  // Estados de formulário
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formDesc, setFormDesc] = useState('');
  const [formPayor, setFormPayor] = useState('');
  const [formValue, setFormValue] = useState<number | ''>('');
  const [formDate, setFormDate] = useState('');
  const [formObs, setFormObs] = useState('');

  // Estados de filtros
  const [filterSource, setFilterSource] = useState('');

  // Preencher formulário para edição
  const handleStartEdit = (s: Salary) => {
    setEditingId(s.id);
    setFormDesc(s.description);
    setFormPayor(s.payor);
    setFormValue(s.value);
    setFormDate(s.date);
    setFormObs(s.observation || '');
    setIsAdding(false);
  };

  // Limpar formulário
  const resetForm = () => {
    setFormDesc('');
    setFormPayor('');
    setFormValue('');
    setFormDate('');
    setFormObs('');
    setIsAdding(false);
    setEditingId(null);
  };

  // Salvar adição ou edição
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formPayor || !formValue || !formDate) return;

    const dateObj = new Date(formDate + 'T00:00:00');
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;

    const salaryData = {
      description: formDesc,
      payor: formPayor,
      value: Number(formValue),
      date: formDate,
      year,
      month,
      observation: formObs
    };

    if (editingId) {
      updateSalary(editingId, salaryData);
    } else {
      addSalary(salaryData);
    }
    resetForm();
  };

  // Filtragem dos Salários cadastrados
  const filteredSalaries = data.salaries.filter(s => {
    const matchesYear = s.year === selectedYear;
    const matchesMonth = s.month === selectedMonth;
    const matchesSource = filterSource ? s.payor.toLowerCase().includes(filterSource.toLowerCase()) : true;
    return matchesYear && matchesMonth && matchesSource;
  });

  // Cálculos de totais
  const totalReceivedThisMonth = filteredSalaries.reduce((sum, s) => sum + s.value, 0);
  
  const totalReceivedThisYear = data.salaries
    .filter(s => s.year === selectedYear && (filterSource ? s.payor.toLowerCase().includes(filterSource.toLowerCase()) : true))
    .reduce((sum, s) => sum + s.value, 0);

  // Fontes únicas para preenchimento de ajuda ou listagem
  const uniquePayors = Array.from(new Set(data.salaries.map(s => s.payor)));

  return (
    <div id="salaries-manager-panel" className="space-y-6">
      {/* Resumo de Receitas no Ano / Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div id="salary-metric-month" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 rounded-xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Recebido no Mês</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {totalReceivedThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Ano: {selectedYear} • Mês: {selectedMonth}</p>
          </div>
        </div>

        <div id="salary-metric-year" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-violet-50 text-violet-600 dark:bg-violet-950/20 rounded-xl shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Recebido no Ano</p>
            <h3 className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1">
              R$ {totalReceivedThisYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Total acumulado de receitas em {selectedYear}</p>
          </div>
        </div>
      </div>

      {/* Seção Principal: Lista de Salários e Formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Listagem e Filtros */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Rendimento Registrados</h3>
                <p className="text-xs text-zinc-500">Listagem de fontes salariais e rendimentos mensais</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filtrar por fonte..."
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  id="filter-salary-source"
                  className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500 w-44"
                />
              </div>
            </div>

            {/* Listagem real */}
            <div className="space-y-3">
              {filteredSalaries.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-semibold">Nenhum salário encontrado</p>
                  <p className="text-[10px] mt-0.5">Não há salários ou receitas registradas para os filtros selecionados.</p>
                </div>
              ) : (
                filteredSalaries.map(salary => (
                  <div
                    key={salary.id}
                    className="p-4 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 rounded-xl flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></span>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{salary.description}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Fonte: <strong className="text-zinc-700 dark:text-zinc-300">{salary.payor}</strong></p>
                      {salary.observation && (
                        <p className="text-[9px] text-zinc-400 mt-1 italic truncate">Obs: {salary.observation}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">R$ {salary.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-zinc-400 mt-0.5 font-mono">{new Date(salary.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(salary)}
                          id={`btn-salary-edit-${salary.id}`}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSalary(salary.id)}
                          id={`btn-salary-delete-${salary.id}`}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {editingId ? 'Editar Rendimento' : 'Cadastrar Salário/Receita'}
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
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Descrição</label>
              <input
                required
                type="text"
                placeholder="Ex: Salário Mensal Estado"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                id="input-salary-desc"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Fonte Pagadora</label>
              <input
                required
                type="text"
                placeholder="Ex: Estado, Aluguel, Extra"
                value={formPayor}
                onChange={(e) => setFormPayor(e.target.value)}
                id="input-salary-payor"
                list="salary-payors-list"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
              />
              <datalist id="salary-payors-list">
                {uniquePayors.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor (R$)</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-salary-value"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data de Recebimento</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  id="input-salary-date"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observação</label>
              <textarea
                placeholder="Detalhes adicionais..."
                rows={2}
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                id="input-salary-obs"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              id="btn-salary-save"
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
                  Cadastrar Rendimento
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
