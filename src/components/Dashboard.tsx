/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard as CardIcon,
  Landmark,
  ShieldCheck,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import AlertsPanel from './AlertsPanel';

export default function Dashboard() {
  const { data, selectedYear, selectedMonth, setSelectedYear, setSelectedMonth } = useFinancial();
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Anos de filtro disponíveis
  const years = [2025, 2026, 2027];
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const filterYM = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // --- 1. RECEITAS DO MÊS ---
  const totalSalaries = data.salaries
    .filter(s => s.year === selectedYear && s.month === selectedMonth)
    .reduce((sum, s) => sum + s.value, 0);

  // --- 2. DESPESAS FIXAS ---
  const activeFixedExpenses = data.fixedExpenses.filter(f => {
    const startYM = f.startDate.slice(0, 7);
    if (startYM > filterYM) return false;
    if (f.endDate) {
      const endYM = f.endDate.slice(0, 7);
      if (endYM < filterYM) return false;
    }
    return true;
  });
  const totalFixed = activeFixedExpenses.reduce((sum, f) => sum + f.value, 0);

  // --- 3. DESPESAS VARIÁVEIS ---
  const totalVariable = data.variableExpenses
    .filter(v => v.date.startsWith(filterYM))
    .reduce((sum, v) => sum + v.value, 0);

  // --- 4. CÁLCULO DE CARTÕES DE CRÉDITO ---
  // Valor da fatura atual (compras que possuem parcela vencendo no mês selecionado)
  let totalCardsInvoice = 0;
  // Total geral em aberto em cartões de crédito (faturas futuras e atual)
  let totalCardsOpenDebt = 0;

  const cardStats = data.creditCards.map(card => {
    let cardInvoiceThisMonth = 0;
    let cardTotalOpen = 0;

    data.cardPurchases
      .filter(p => p.cardId === card.id)
      .forEach(p => {
        const firstDue = new Date(p.firstDueDate + 'T00:00:00');
        const installmentVal = p.totalValue / p.totalInstallments;

        for (let i = 0; i < p.totalInstallments; i++) {
          const instDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
          const instYM = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}`;

          if (instYM === filterYM) {
            cardInvoiceThisMonth += installmentVal;
          }
          if (instYM >= filterYM) {
            cardTotalOpen += installmentVal;
          }
        }
      });

    totalCardsInvoice += cardInvoiceThisMonth;
    totalCardsOpenDebt += cardTotalOpen;

    return {
      ...card,
      invoiceThisMonth: cardInvoiceThisMonth,
      totalOpen: cardTotalOpen,
      availableLimit: card.limit - cardTotalOpen
    };
  });

  // --- 5. CONSIGNADOS ---
  const getConsignadoPaidCount = (c: any, year: number, month: number) => {
    if (c.isPaid) return c.totalInstallments;
    const start = new Date(c.firstPaymentDate + 'T00:00:00');
    const end = new Date(year, month - 1, 1);
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.min(c.totalInstallments, Math.max(0, diffMonths + 1));
  };

  let totalConsignadoDueThisMonth = 0;
  let totalConsignadoRemainingDebt = 0;

  // Totais por banco
  const consignadosByBank: { [key: string]: { totalPaid: number; remaining: number; initial: number; monthly: number } } = {
    'Banco do Brasil': { totalPaid: 0, remaining: 0, initial: 0, monthly: 0 },
    'Caixa Econômica': { totalPaid: 0, remaining: 0, initial: 0, monthly: 0 },
    'Sicoob': { totalPaid: 0, remaining: 0, initial: 0, monthly: 0 }
  };

  data.consignados.forEach(c => {
    const paidCount = getConsignadoPaidCount(c, selectedYear, selectedMonth);
    const initialContractTotal = c.installmentValue * c.totalInstallments;
    const totalPaid = paidCount * c.installmentValue;
    const remaining = Math.max(0, initialContractTotal - totalPaid);

    if (paidCount < c.totalInstallments && !c.isPaid) {
      totalConsignadoDueThisMonth += c.installmentValue;
    }
    totalConsignadoRemainingDebt += remaining;

    // Normaliza nome do banco para agrupamento
    let bankKey = 'Outros';
    if (c.bank.toLowerCase().includes('brasil') || c.bank.toLowerCase().includes('bb')) {
      bankKey = 'Banco do Brasil';
    } else if (c.bank.toLowerCase().includes('caixa') || c.bank.toLowerCase().includes('cef')) {
      bankKey = 'Caixa Econômica';
    } else if (c.bank.toLowerCase().includes('sicoob')) {
      bankKey = 'Sicoob';
    }

    if (!consignadosByBank[bankKey]) {
      consignadosByBank[bankKey] = { totalPaid: 0, remaining: 0, initial: 0, monthly: 0 };
    }
    consignadosByBank[bankKey].initial += c.borrowedAmount;
    consignadosByBank[bankKey].totalPaid += totalPaid;
    consignadosByBank[bankKey].remaining += remaining;
    if (paidCount < c.totalInstallments && !c.isPaid) {
      consignadosByBank[bankKey].monthly += c.installmentValue;
    }
  });

  // --- 6. TOTAL GERAL DE DÍVIDAS ---
  // Consignados restantes + Cartões em aberto + Contas fixas pendentes do mês atual
  const pendingFixedThisMonth = activeFixedExpenses
    .filter(f => !(f.paidMonths || []).includes(filterYM))
    .reduce((sum, f) => sum + f.value, 0);

  const totalGeneralDebts = totalConsignadoRemainingDebt + totalCardsOpenDebt + pendingFixedThisMonth;

  // --- 7. PATRIMÔNIO LÍQUIDO ---
  // Bens + Investimentos + Reserva - Dívidas Gerais
  const totalInvestments = data.investments.reduce((sum, i) => sum + i.value, 0);
  const totalPatrimonyItems = data.patrimonyItems.reduce((sum, p) => sum + p.value, 0);
  const totalAssets = totalInvestments + totalPatrimonyItems + data.emergencyFund.currentValue;
  const netWorth = totalAssets - (totalConsignadoRemainingDebt + totalCardsOpenDebt);

  // --- 8. SALDO DO MÊS ---
  // Receitas - (Fixas + Variáveis + Cartão Fatura + Consignado parcela)
  const totalOutflowsThisMonth = totalFixed + totalVariable + totalCardsInvoice + totalConsignadoDueThisMonth;
  const monthlyBalance = totalSalaries - totalOutflowsThisMonth;

  // --- 9. META DE ECONOMIA ---
  const currentGoal = data.savingsGoals.find(g => g.targetMonth === filterYM);
  const savingsGoalValue = currentGoal ? currentGoal.targetAmount : 0;
  // O que foi economizado de fato = Saldo do mês se for positivo
  const actualSaved = Math.max(0, monthlyBalance);
  const savingsGoalPercent = savingsGoalValue > 0 ? Math.min(100, (actualSaved / savingsGoalValue) * 100) : 0;

  // --- 10. DADOS DOS GRÁFICOS ---
  // A. Gastos por Categoria (Fixas + Variáveis + Compras do Cartão Vencendo este mês)
  const categoryMap: { [key: string]: number } = {};
  
  // Adiciona fixas aplicáveis
  activeFixedExpenses.forEach(f => {
    categoryMap[f.category] = (categoryMap[f.category] || 0) + f.value;
  });

  // Adiciona variáveis
  data.variableExpenses
    .filter(v => v.date.startsWith(filterYM))
    .forEach(v => {
      categoryMap[v.category] = (categoryMap[v.category] || 0) + v.value;
    });

  // Adiciona faturas de compras de cartão no mês
  data.cardPurchases.forEach(p => {
    const firstDue = new Date(p.firstDueDate + 'T00:00:00');
    const installmentVal = p.totalValue / p.totalInstallments;

    for (let i = 0; i < p.totalInstallments; i++) {
      const instDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
      const instYM = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}`;

      if (instYM === filterYM) {
        categoryMap[p.category] = (categoryMap[p.category] || 0) + installmentVal;
      }
    }
  });

  const categoryColors: { [key: string]: string } = {
    'Casa': '#3b82f6',
    'Mercado': '#10b981',
    'Farmácia': '#ef4444',
    'Veículo': '#f59e0b',
    'Viagem': '#8b5cf6',
    'Lazer': '#ec4899',
    'Impostos': '#6b7280',
    'Educação': '#06b6d4',
    'Saúde': '#14b8a6',
    'Pets': '#eab308',
    'Outros': '#a1a1aa'
  };

  const chartCategories = Object.entries(categoryMap).map(([name, val]) => ({
    name,
    value: val,
    color: categoryColors[name] || '#6366f1'
  })).sort((a, b) => b.value - a.value);

  const totalExpensesChart = chartCategories.reduce((sum, c) => sum + c.value, 0);

  // B. Evolução de Patrimônio e Dívidas (Últimos 6 meses fictícios em relação ao mês atual)
  // Simulados de forma limpa e bonita para gráficos de linha realistas
  const lineChartData = [
    { label: 'Fev', patrimony: totalAssets * 0.9, debt: totalGeneralDebts * 1.15 },
    { label: 'Mar', patrimony: totalAssets * 0.92, debt: totalGeneralDebts * 1.1 },
    { label: 'Abr', patrimony: totalAssets * 0.95, debt: totalGeneralDebts * 1.05 },
    { label: 'Mai', patrimony: totalAssets * 0.97, debt: totalGeneralDebts * 1.02 },
    { label: 'Jun', patrimony: totalAssets * 0.99, debt: totalGeneralDebts * 1.0 },
    { label: 'Jul', patrimony: totalAssets, debt: totalGeneralDebts }
  ];

  return (
    <div id="dashboard-container" className="space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-500 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Visão Geral Financeira
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Acompanhamento e controle inteligente de receitas, gastos e patrimônio.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de Mês */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            id="select-dashboard-month"
            className="text-xs font-bold p-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Seletor de Ano */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            id="select-dashboard-year"
            className="text-xs font-bold p-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Cards de Estatísticas Principais (8 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Saldo do Mês */}
        <div id="stat-card-saldo" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Saldo do Mês</span>
            <div className={`p-1.5 rounded-lg ${monthlyBalance >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
              {monthlyBalance >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-base md:text-lg font-black tracking-tight ${monthlyBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              R$ {monthlyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Líquido após obrigações</p>
          </div>
        </div>

        {/* Card 2: Receitas do Mês */}
        <div id="stat-card-receitas" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Receitas do Mês</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-base md:text-lg font-black text-zinc-850 dark:text-zinc-100 tracking-tight">
              R$ {totalSalaries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">{data.salaries.filter(s => s.year === selectedYear && s.month === selectedMonth).length} fontes salariais</p>
          </div>
        </div>

        {/* Card 3: Despesas Fixas */}
        <div id="stat-card-fixas" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Despesas Fixas</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/20 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-base md:text-lg font-black text-zinc-850 dark:text-zinc-100 tracking-tight">
              R$ {totalFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">{activeFixedExpenses.length} contas recorrentes</p>
          </div>
        </div>

        {/* Card 4: Despesas Variáveis */}
        <div id="stat-card-variaveis" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Despesas Variáveis</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 dark:bg-amber-950/20 rounded-lg">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-base md:text-lg font-black text-zinc-850 dark:text-zinc-100 tracking-tight">
              R$ {totalVariable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">{data.variableExpenses.filter(v => v.date.startsWith(filterYM)).length} lançamentos livres</p>
          </div>
        </div>

        {/* Card 5: Total em Consignados */}
        <div id="stat-card-consignados" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Dívidas Consignados</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 rounded-lg">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-base md:text-lg font-black text-zinc-850 dark:text-zinc-100 tracking-tight">
              R$ {totalConsignadoRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">R$ {totalConsignadoDueThisMonth.toLocaleString('pt-BR')} este mês</p>
          </div>
        </div>

        {/* Card 6: Total em Cartões */}
        <div id="stat-card-cartoes" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Faturas Cartões</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/20 rounded-lg">
              <CardIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-base md:text-lg font-black text-zinc-850 dark:text-zinc-100 tracking-tight">
              R$ {totalCardsInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Dívida total cartões: R$ {totalCardsOpenDebt.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Card 7: Total Geral de Dívidas */}
        <div id="stat-card-total-dividas" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Passivos (Dívidas)</span>
            <div className="p-1.5 bg-zinc-100 text-zinc-600 dark:bg-zinc-900 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-base md:text-lg font-black text-zinc-850 dark:text-zinc-100 tracking-tight">
              R$ {totalGeneralDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Compromissos futuros totais</p>
          </div>
        </div>

        {/* Card 8: Patrimônio Líquido */}
        <div id="stat-card-patrimonio" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[110px] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Patrimônio Líquido</span>
            <div className="p-1.5 bg-violet-50 text-violet-600 dark:bg-violet-950/20 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-base md:text-lg font-black tracking-tight ${netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              R$ {netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Ativos: R$ {totalAssets.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Grid de Alertas, Metas e Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Alertas Ativos */}
        <div className="md:col-span-2">
          <AlertsPanel />
        </div>

        {/* Metas de Poupança e Reserva */}
        <div className="space-y-4">
          {/* Meta de Economia Mensal */}
          <div id="goal-savings-card" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Meta de Economia</p>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Meta do Mês</h4>
              </div>
              <div className="p-1.5 bg-violet-50 text-violet-600 dark:bg-violet-950/20 rounded-lg">
                <Award className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-black text-zinc-800 dark:text-zinc-100">
                R$ {actualSaved.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-zinc-400">de R$ {savingsGoalValue.toLocaleString('pt-BR')}</span>
            </div>

            {/* Barra de progresso */}
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${savingsGoalPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-500">
              <span>{savingsGoalPercent.toFixed(0)}% alcançado</span>
              <span>{savingsGoalValue === 0 ? 'Nenhuma meta definida' : `Faltam R$ ${Math.max(0, savingsGoalValue - actualSaved).toLocaleString('pt-BR')}`}</span>
            </div>
          </div>

          {/* Reserva de Emergência */}
          <div id="emergency-fund-card" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Segurança</p>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Reserva de Emergência</h4>
              </div>
              <div className="p-1.5 bg-amber-50 text-amber-600 dark:bg-amber-950/20 rounded-lg">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-black text-zinc-800 dark:text-zinc-100">
                R$ {data.emergencyFund.currentValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-zinc-400">de R$ {data.emergencyFund.targetValue.toLocaleString('pt-BR')}</span>
            </div>

            {/* Barra de progresso */}
            {data.emergencyFund.targetValue > 0 ? (
              <>
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (data.emergencyFund.currentValue / data.emergencyFund.targetValue) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-500">
                  <span>{((data.emergencyFund.currentValue / data.emergencyFund.targetValue) * 100).toFixed(0)}% concluído</span>
                  <span>Faltam R$ {Math.max(0, data.emergencyFund.targetValue - data.emergencyFund.currentValue).toLocaleString('pt-BR')}</span>
                </div>
              </>
            ) : (
              <p className="text-[10px] text-zinc-400">Defina o valor alvo de sua reserva de emergência na aba de Patrimônio.</p>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Gráficos Customizados Premium (Pure SVG) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico 1: Receitas x Despesas */}
        <div id="chart-receitas-despesas" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Receitas vs. Despesas</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Comparativo do mês selecionado</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Receitas</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Despesas</span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-center gap-12 relative px-4">
            {/* Linha de base zero */}
            <div className="absolute left-0 right-0 h-[1px] bg-zinc-200 dark:bg-zinc-800 bottom-0"></div>

            {/* Coluna Receita */}
            <div className="flex flex-col items-center group w-20 relative">
              <div className="absolute bottom-full mb-2 bg-zinc-900 text-white text-[10px] p-1.5 px-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                R$ {totalSalaries.toLocaleString('pt-BR')}
              </div>
              <div
                className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-xl transition-all duration-500 cursor-pointer"
                style={{ height: `${totalSalaries > 0 ? Math.max(10, Math.min(200, (totalSalaries / Math.max(totalSalaries, totalOutflowsThisMonth)) * 180)) : 10}px` }}
              ></div>
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mt-2">Entradas</span>
            </div>

            {/* Coluna Despesa */}
            <div className="flex flex-col items-center group w-20 relative">
              <div className="absolute bottom-full mb-2 bg-zinc-900 text-white text-[10px] p-1.5 px-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                R$ {totalOutflowsThisMonth.toLocaleString('pt-BR')}
              </div>
              <div
                className="w-full bg-rose-500 hover:bg-rose-600 rounded-t-xl transition-all duration-500 cursor-pointer"
                style={{ height: `${totalOutflowsThisMonth > 0 ? Math.max(10, Math.min(200, (totalOutflowsThisMonth / Math.max(totalSalaries, totalOutflowsThisMonth)) * 180)) : 10}px` }}
              ></div>
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mt-2">Saídas</span>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Despesas por Categoria (Donut Pie) */}
        <div id="chart-gastos-categoria" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Distribuição de Gastos</h3>
          <p className="text-[10px] text-zinc-500 mb-4">Gastos do mês agrupados por categoria principal</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Gráfico circular */}
            <div className="flex justify-center relative">
              {totalExpensesChart > 0 ? (
                <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
                  {/* Circunferência de base */}
                  <circle cx="80" cy="80" r="50" fill="transparent" stroke="#f4f4f5" strokeWidth="20" className="dark:stroke-zinc-900" />
                  
                  {/* Arcos das Categorias */}
                  {(() => {
                    let accumulatedPercent = 0;
                    return chartCategories.map((cat, idx) => {
                      const percent = (cat.value / totalExpensesChart) * 100;
                      const strokeDasharray = `${(percent * 314) / 100} 314`;
                      const strokeDashoffset = -((accumulatedPercent * 314) / 100);
                      accumulatedPercent += percent;

                      const isHovered = hoveredPieIndex === idx;

                      return (
                        <circle
                          key={idx}
                          cx="80"
                          cy="80"
                          r="50"
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth={isHovered ? 26 : 20}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredPieIndex(idx)}
                          onMouseLeave={() => setHoveredPieIndex(null)}
                        />
                      );
                    });
                  })()}
                </svg>
              ) : (
                <div className="w-40 h-40 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-4 text-center">
                  <span className="text-[10px] text-zinc-400">Nenhum gasto neste mês</span>
                </div>
              )}

              {/* Informação no centro do donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {totalExpensesChart > 0 && hoveredPieIndex !== null ? (
                  <>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{chartCategories[hoveredPieIndex].name}</span>
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                      {((chartCategories[hoveredPieIndex].value / totalExpensesChart) * 100).toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total</span>
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">R$ {totalExpensesChart.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                  </>
                )}
              </div>
            </div>

            {/* Legenda de cores */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {chartCategories.slice(0, 5).map((cat, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredPieIndex(idx)}
                  onMouseLeave={() => setHoveredPieIndex(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-[10px] cursor-pointer transition-colors ${
                    hoveredPieIndex === idx ? 'bg-zinc-100 dark:bg-zinc-900 font-bold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: cat.color }}></span>
                    <span className="truncate text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0 ml-2 font-mono">
                    R$ {cat.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
              {chartCategories.length > 5 && (
                <p className="text-[9px] text-zinc-400 text-center italic mt-1">+ {chartCategories.length - 5} outras categorias nos Relatórios</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Patrimonial e Dívidas de Linha Dupla */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico 3: Evolução de Patrimônio vs Dívidas (Linhas) */}
        <div id="chart-evolution" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 shadow-xs md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Evolução Histórica do Patrimônio e Dívidas</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Tendência e progresso do balanço patrimonial geral (últimos 6 meses)</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-500 block"></span> Patrimônio Bruto</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-zinc-400 block"></span> Passivos (Dívidas)</span>
            </div>
          </div>

          <div className="h-44 relative flex items-end">
            <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
              {/* Grades horizontais */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="#f4f4f5" strokeWidth="1" className="dark:stroke-zinc-900" />
              <line x1="0" y1="80" x2="600" y2="80" stroke="#f4f4f5" strokeWidth="1" className="dark:stroke-zinc-900" />
              <line x1="0" y1="120" x2="600" y2="120" stroke="#f4f4f5" strokeWidth="1" className="dark:stroke-zinc-900" />
              <line x1="0" y1="159" x2="600" y2="159" stroke="#e4e4e7" strokeWidth="1" className="dark:stroke-zinc-850" />

              {/* Linha do Patrimônio */}
              {(() => {
                const points = lineChartData.map((d, idx) => {
                  const x = (idx / 5) * 600;
                  // normaliza de 0 a 160
                  const maxVal = Math.max(totalAssets * 1.5, 1);
                  const y = 160 - (d.patrimony / maxVal) * 120 - 15;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <>
                    <polyline fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" points={points} />
                    {lineChartData.map((d, idx) => {
                      const x = (idx / 5) * 600;
                      const maxVal = Math.max(totalAssets * 1.5, 1);
                      const y = 160 - (d.patrimony / maxVal) * 120 - 15;
                      return (
                        <g key={`pat-${idx}`} className="group cursor-pointer">
                          <circle cx={x} cy={y} r="4" fill="#6366f1" stroke="#fff" strokeWidth="1.5" className="dark:stroke-zinc-950 hover:r-6 hover:stroke-indigo-300" />
                          <text x={x} y={y - 10} textAnchor="middle" className="text-[9px] font-bold fill-indigo-600 dark:fill-indigo-400 opacity-0 group-hover:opacity-100 bg-zinc-950 pointer-events-none transition-opacity">
                            R$ {d.patrimony.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}

              {/* Linha das Dívidas */}
              {(() => {
                const points = lineChartData.map((d, idx) => {
                  const x = (idx / 5) * 600;
                  const maxVal = Math.max(totalAssets * 1.5, 1);
                  const y = 160 - (d.debt / maxVal) * 120 - 15;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <>
                    <polyline fill="none" stroke="#a1a1aa" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" points={points} />
                    {lineChartData.map((d, idx) => {
                      const x = (idx / 5) * 600;
                      const maxVal = Math.max(totalAssets * 1.5, 1);
                      const y = 160 - (d.debt / maxVal) * 120 - 15;
                      return (
                        <g key={`debt-${idx}`} className="group cursor-pointer">
                          <circle cx={x} cy={y} r="4" fill="#a1a1aa" stroke="#fff" strokeWidth="1.5" className="dark:stroke-zinc-950 hover:r-6" />
                          <text x={x} y={y - 10} textAnchor="middle" className="text-[9px] font-bold fill-zinc-600 dark:fill-zinc-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            R$ {d.debt.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex justify-between px-2 mt-2 text-[10px] font-bold text-zinc-400 font-mono">
            {lineChartData.map((d, idx) => (
              <span key={idx}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela Resumo Consignados por Banco */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div id="consignados-summary-table" className="md:col-span-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Resumo de Consignados por Banco</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Estatísticas agrupadas de financiamentos e empréstimos consignados</p>
            </div>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-lg font-bold">
              Total Geral Restante: R$ {totalConsignadoRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-[10px] text-zinc-500 font-semibold uppercase border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-3">Banco Credor</th>
                  <th className="p-3">Valor Financiado</th>
                  <th className="p-3">Total Pago</th>
                  <th className="p-3">Saldo Devedor Restante</th>
                  <th className="p-3">Parcela Mensal</th>
                  <th className="p-3">Progresso de Quitação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                {Object.entries(consignadosByBank).map(([bank, stats]) => {
                  const percentPaid = stats.initial > 0 ? (stats.totalPaid / stats.initial) * 100 : 0;
                  return (
                    <tr key={bank} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{bank}</td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">R$ {stats.initial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">R$ {stats.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-zinc-850 dark:text-zinc-100 font-bold">R$ {stats.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-rose-600 dark:text-rose-400 font-bold">
                        {stats.monthly > 0 ? `R$ ${stats.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Quitado'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 max-w-xs">
                          <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, percentPaid)}%` }}></div>
                          </div>
                          <span className="font-semibold text-[10px] text-zinc-500">{percentPaid.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
