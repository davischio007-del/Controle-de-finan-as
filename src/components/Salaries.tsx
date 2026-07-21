/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Salary, SalaryDiscount } from '../types';
import { 
  Plus, Trash, Edit2, Check, X, TrendingUp, Filter, 
  Calendar, Landmark, Sparkles, AlertCircle, Percent, PlusCircle, MinusCircle, Award
} from 'lucide-react';

export default function Salaries() {
  const { data, addSalary, updateSalary, deleteSalary, selectedYear, selectedMonth } = useFinancial();

  // Estados de formulário
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formDesc, setFormDesc] = useState('');
  const [formPayor, setFormPayor] = useState('');
  const [formValue, setFormValue] = useState<number | ''>('');
  const [formDate, setFormDate] = useState('2026-07-20');
  const [formObs, setFormObs] = useState('');

  // Descontos Padrão (Standard)
  const [irValue, setIrValue] = useState<number | ''>('');
  const [inssValue, setInssValue] = useState<number | ''>('');
  const [sindicalValue, setSindicalValue] = useState<number | ''>('');
  const [saudeValue, setSaudeValue] = useState<number | ''>('');
  const [pensaoValue, setPensaoValue] = useState<number | ''>('');
  const [outrosValue, setOutrosValue] = useState<number | ''>('');

  // Descontos Personalizados (Custom)
  const [customDiscounts, setCustomDiscounts] = useState<Omit<SalaryDiscount, 'type'>[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomVal, setNewCustomVal] = useState<number | ''>('');

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

    // Resetar descontos padrão
    let ir: number | '' = '';
    let inss: number | '' = '';
    let sind: number | '' = '';
    let saude: number | '' = '';
    let pens: number | '' = '';
    let outros: number | '' = '';
    const customs: Omit<SalaryDiscount, 'type'>[] = [];

    if (s.discounts) {
      s.discounts.forEach(d => {
        if (d.type === 'standard') {
          if (d.name === 'Imposto de Renda (IR)') ir = d.value;
          else if (d.name === 'Previdência (INSS/IPERON)') inss = d.value;
          else if (d.name === 'Contribuição Sindical') sind = d.value;
          else if (d.name === 'Plano de Saúde') saude = d.value;
          else if (d.name === 'Pensão') pens = d.value;
          else if (d.name === 'Outros Descontos') outros = d.value;
          else {
            customs.push({ id: d.id, name: d.name, value: d.value });
          }
        } else {
          customs.push({ id: d.id, name: d.name, value: d.value });
        }
      });
    }

    setIrValue(ir);
    setInssValue(inss);
    setSindicalValue(sind);
    setSaudeValue(saude);
    setPensaoValue(pens);
    setOutrosValue(outros);
    setCustomDiscounts(customs);
  };

  // Limpar formulário
  const resetForm = () => {
    setFormDesc('');
    setFormPayor('');
    setFormValue('');
    setFormDate('2026-07-20');
    setFormObs('');
    setIrValue('');
    setInssValue('');
    setSindicalValue('');
    setSaudeValue('');
    setPensaoValue('');
    setOutrosValue('');
    setCustomDiscounts([]);
    setNewCustomName('');
    setNewCustomVal('');
    setIsAdding(false);
    setEditingId(null);
  };

  // Adicionar desconto personalizado temporário ao form
  const handleAddCustomDiscount = () => {
    if (!newCustomName.trim() || !newCustomVal) return;
    const item = {
      id: `disc-custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newCustomName.trim(),
      value: Number(newCustomVal)
    };
    setCustomDiscounts(prev => [...prev, item]);
    setNewCustomName('');
    setNewCustomVal('');
  };

  const handleRemoveCustomDiscount = (id: string) => {
    setCustomDiscounts(prev => prev.filter(d => d.id !== id));
  };

  // Salvar adição ou edição
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formPayor || !formValue || !formDate) return;

    const dateObj = new Date(formDate + 'T00:00:00');
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;

    // Compilar descontos
    const discountsList: SalaryDiscount[] = [];

    if (irValue && irValue > 0) {
      discountsList.push({ id: 'std-ir', name: 'Imposto de Renda (IR)', value: Number(irValue), type: 'standard' });
    }
    if (inssValue && inssValue > 0) {
      discountsList.push({ id: 'std-inss', name: 'Previdência (INSS/IPERON)', value: Number(inssValue), type: 'standard' });
    }
    if (sindicalValue && sindicalValue > 0) {
      discountsList.push({ id: 'std-sind', name: 'Contribuição Sindical', value: Number(sindicalValue), type: 'standard' });
    }
    if (saudeValue && saudeValue > 0) {
      discountsList.push({ id: 'std-saude', name: 'Plano de Saúde', value: Number(saudeValue), type: 'standard' });
    }
    if (pensaoValue && pensaoValue > 0) {
      discountsList.push({ id: 'std-pens', name: 'Pensão', value: Number(pensaoValue), type: 'standard' });
    }
    if (outrosValue && outrosValue > 0) {
      discountsList.push({ id: 'std-outros', name: 'Outros Descontos', value: Number(outrosValue), type: 'standard' });
    }

    customDiscounts.forEach(d => {
      discountsList.push({
        id: d.id,
        name: d.name,
        value: d.value,
        type: 'custom'
      });
    });

    const salaryData = {
      description: formDesc,
      payor: formPayor,
      value: Number(formValue), // Salário Bruto
      date: formDate,
      year,
      month,
      observation: formObs,
      discounts: discountsList
    };

    if (editingId) {
      updateSalary(editingId, salaryData);
    } else {
      addSalary(salaryData);
    }
    resetForm();
  };

  // Helper para somar descontos de um salário
  const getSalaryDiscountsSum = (s: Salary) => {
    if (!s.discounts) return 0;
    return s.discounts.reduce((sum, d) => sum + d.value, 0);
  };

  // Filtragem dos Salários cadastrados para o mês/ano selecionado
  const filteredSalaries = data.salaries.filter(s => {
    const matchesYear = s.year === selectedYear;
    const matchesMonth = s.month === selectedMonth;
    const matchesSource = filterSource ? s.payor.toLowerCase().includes(filterSource.toLowerCase()) : true;
    return matchesYear && matchesMonth && matchesSource;
  });

  // Métricas do Mês Selecionado (Bruto, Descontos, Líquido)
  const totalGrossThisMonth = filteredSalaries.reduce((sum, s) => sum + s.value, 0);
  const totalDiscountsThisMonth = filteredSalaries.reduce((sum, s) => sum + getSalaryDiscountsSum(s), 0);
  const totalNetThisMonth = totalGrossThisMonth - totalDiscountsThisMonth;

  // Métricas do Ano Selecionado
  const yearlySalaries = data.salaries.filter(s => s.year === selectedYear);
  const totalGrossThisYear = yearlySalaries.reduce((sum, s) => sum + s.value, 0);
  const totalDiscountsThisYear = yearlySalaries.reduce((sum, s) => sum + getSalaryDiscountsSum(s), 0);
  const totalNetThisYear = totalGrossThisYear - totalDiscountsThisYear;

  // Fontes únicas para autocompletar
  const uniquePayors = Array.from(new Set(data.salaries.map(s => s.payor)));

  // Cálculos em tempo real para o formulário
  const currentGross = formValue ? Number(formValue) : 0;
  const currentStandardDiscountsSum = 
    Number(irValue || 0) + 
    Number(inssValue || 0) + 
    Number(sindicalValue || 0) + 
    Number(saudeValue || 0) + 
    Number(pensaoValue || 0) + 
    Number(outrosValue || 0);
  const currentCustomDiscountsSum = customDiscounts.reduce((sum, d) => sum + d.value, 0);
  const currentTotalDiscounts = currentStandardDiscountsSum + currentCustomDiscountsSum;
  const currentNetValue = currentGross - currentTotalDiscounts;

  // Histórico consolidado por mês para o ano selecionado
  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const monthlyHistory = monthsNames.map((name, idx) => {
    const monthNum = idx + 1;
    const monthSals = data.salaries.filter(s => s.year === selectedYear && s.month === monthNum);
    const gross = monthSals.reduce((sum, s) => sum + s.value, 0);
    const discounts = monthSals.reduce((sum, s) => sum + getSalaryDiscountsSum(s), 0);
    const net = gross - discounts;

    return {
      monthNum,
      name,
      gross,
      discounts,
      net,
      count: monthSals.length
    };
  });

  return (
    <div id="salaries-manager-panel" className="space-y-6">
      {/* Resumo Consolidado de Receitas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div id="salary-metric-gross" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 rounded-xl shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Bruto Recebido (Mês)</p>
            <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-1">
              R$ {totalGrossThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Sem os descontos aplicados</p>
          </div>
        </div>

        <div id="salary-metric-discounts" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/20 rounded-xl shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Descontado (Mês)</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              R$ {totalDiscountsThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Sindicato, IR, Previdência e outros</p>
          </div>
        </div>

        <div id="salary-metric-net" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 rounded-xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Líquido Recebido (Mês)</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {totalNetThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Saldo real disponível para uso</p>
          </div>
        </div>
      </div>

      {/* Grid de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Listagem e Histórico Consolidado */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Aba de Rendimentos Registrados */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Rendimentos Registrados no Mês</h3>
                <p className="text-xs text-zinc-500">Fontes salariais com demonstrativo de descontos detalhado</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filtrar por fonte..."
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500 w-44 font-semibold"
                />
              </div>
            </div>

            {/* Listagem */}
            <div className="space-y-4">
              {filteredSalaries.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="text-xs font-semibold">Nenhum salário cadastrado para o mês</p>
                  <p className="text-[10px] mt-0.5 font-medium">Use o formulário para lançar seu salário bruto e respectivos descontos.</p>
                </div>
              ) : (
                filteredSalaries.map(salary => {
                  const discountsSum = getSalaryDiscountsSum(salary);
                  const netValue = salary.value - discountsSum;
                  return (
                    <div
                      key={salary.id}
                      className="p-4 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0"></span>
                          <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate">{salary.description}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wide">
                            {salary.payor}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          Recebimento em: {new Date(salary.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          {salary.observation && ` • ${salary.observation}`}
                        </p>

                        {/* Listagem de Descontos efetuados */}
                        {salary.discounts && salary.discounts.length > 0 && (
                          <div className="bg-white dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-850 text-[10px] text-zinc-500 space-y-1">
                            <p className="font-bold text-zinc-400 uppercase text-[8px] tracking-wider">Descontos Efetuados:</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {salary.discounts.map(disc => (
                                <div key={disc.id} className="flex justify-between items-center py-0.5 border-b border-dashed border-zinc-100 dark:border-zinc-850">
                                  <span className="font-medium">{disc.name}</span>
                                  <span className="font-bold text-rose-600">- R$ {disc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-850 pt-3 md:pt-0">
                        <div className="text-right space-y-0.5">
                          <p className="text-[10px] text-zinc-400 font-semibold">Bruto: <span className="text-zinc-600 dark:text-zinc-300 font-bold">R$ {salary.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                          {discountsSum > 0 && (
                            <p className="text-[10px] text-zinc-400 font-semibold">Descontos: <span className="text-rose-600 font-bold">- R$ {discountsSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                          )}
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            Líquido: R$ {netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                          <button
                            onClick={() => handleStartEdit(salary)}
                            id={`btn-salary-edit-${salary.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSalary(salary.id)}
                            id={`btn-salary-delete-${salary.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
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

          {/* Histórico Consolidado por Ano */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3 mb-4">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                Histórico Consolidado de Recebimentos em {selectedYear}
              </h3>
              <p className="text-xs text-zinc-500">Consolidação anual mensalizada de receitas brutas, descontos totais e líquido creditado.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 rounded-l-lg">Mês</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Rendimentos</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-rose-500">Descontos</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-emerald-500 rounded-r-lg">Líquido Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-semibold">
                  {monthlyHistory.map(row => (
                    <tr 
                      key={row.monthNum} 
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 ${
                        row.monthNum === selectedMonth ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 flex items-center gap-1.5">
                        <span className="text-zinc-800 dark:text-zinc-200">{row.name}</span>
                        {row.count > 0 && (
                          <span className="text-[8px] px-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded font-bold">
                            {row.count} {row.count === 1 ? 'lanç.' : 'lanç.'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300 font-mono">
                        {row.gross > 0 ? `R$ ${row.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-mono">
                        {row.discounts > 0 ? `- R$ ${row.discounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                        {row.gross > 0 ? `R$ ${row.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-100/50 dark:bg-zinc-900/60 font-black text-zinc-800 dark:text-zinc-100 border-t border-zinc-200">
                    <td className="px-4 py-3 rounded-l-lg">Acumulado {selectedYear}</td>
                    <td className="px-4 py-3 text-right font-mono">R$ {totalGrossThisYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-mono">- R$ {totalDiscountsThisYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 rounded-r-lg font-mono">R$ {totalNetThisYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário com Demonstrativo Detalhado de Deduções */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {editingId ? 'Editar Rendimento' : 'Lançar Rendimento Detalhado'}
            </h3>
            {(editingId || isAdding) && (
              <button
                onClick={resetForm}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Demonstrativo em tempo real */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-3 border border-zinc-150 dark:border-zinc-850">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
              <Award className="w-3.5 h-3.5" /> Demonstrativo de Pagamento Real-Time
            </div>
            
            <div className="space-y-2 text-xs font-semibold">
              <div className="flex justify-between text-zinc-500">
                <span>Salário Bruto:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-100">R$ {currentGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {currentTotalDiscounts > 0 && (
                <div className="flex justify-between text-zinc-400 text-[11px] border-b border-zinc-150 dark:border-zinc-800 pb-1">
                  <span>Deduções Totais:</span>
                  <span className="font-mono text-rose-600">- R$ {currentTotalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-800 dark:text-zinc-100 pt-1 text-sm font-black">
                <span>Salário Líquido:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">R$ {currentNetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
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
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
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
                list="salary-payors-list"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
              />
              <datalist id="salary-payors-list">
                {uniquePayors.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Salário Bruto (R$)</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-black text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Recebimento</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* SEÇÃO DE DEDUÇÕES PADRÃO */}
            <div className="border-t border-zinc-100 dark:border-zinc-850 pt-4 space-y-3">
              <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <MinusCircle className="w-3.5 h-3.5" /> Descontos e Deduções Padrão
              </p>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Imposto de Renda (IR)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={irValue}
                    onChange={(e) => setIrValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 font-bold focus:border-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Previdência (INSS/etc)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={inssValue}
                    onChange={(e) => setInssValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 font-bold focus:border-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Contribuição Sindical</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={sindicalValue}
                    onChange={(e) => setSindicalValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 font-bold focus:border-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Plano de Saúde</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={saudeValue}
                    onChange={(e) => setSaudeValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 font-bold focus:border-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Pensão Alimentícia</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={pensaoValue}
                    onChange={(e) => setPensaoValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 font-bold focus:border-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Outros Descontos</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={outrosValue}
                    onChange={(e) => setOutrosValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 font-bold focus:border-rose-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO DE DESCONTOS PERSONALIZADOS */}
            <div className="border-t border-zinc-100 dark:border-zinc-850 pt-4 space-y-3">
              <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> Descontos Personalizados
              </p>

              {customDiscounts.length > 0 && (
                <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-900/40 p-2 rounded-lg border border-zinc-150 dark:border-zinc-850 max-h-32 overflow-y-auto">
                  {customDiscounts.map(disc => (
                    <div key={disc.id} className="flex items-center justify-between text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                      <span className="truncate">{disc.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-600 font-mono">- R$ {disc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDiscount(disc.id)}
                          className="text-zinc-400 hover:text-rose-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário para adicionar desconto customizado */}
              <div className="flex gap-1.5 text-xs">
                <input
                  type="text"
                  placeholder="Nome do desconto (ex: Seguro de Vida)"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="flex-1 p-1.5 text-[11px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Valor"
                  value={newCustomVal}
                  onChange={(e) => setNewCustomVal(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-16 p-1.5 text-[11px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 font-bold focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDiscount}
                  className="px-2 py-1 bg-zinc-100 hover:bg-indigo-50 dark:bg-zinc-900 text-indigo-600 rounded-md font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observação</label>
              <textarea
                placeholder="Detalhes adicionais..."
                rows={2}
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              id="btn-salary-save"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
            >
              {editingId ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Rendimento Detalhado
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
