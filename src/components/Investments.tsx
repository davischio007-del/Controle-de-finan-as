/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Investment, PatrimonyItem } from '../types';
import { Plus, Trash, Edit2, Check, X, Shield, PiggyBank, Briefcase, Landmark, Target, Award, Sparkles } from 'lucide-react';

export default function Investments() {
  const {
    data,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addPatrimonyItem,
    updatePatrimonyItem,
    deletePatrimonyItem,
    updateEmergencyFund,
    setSavingsGoal,
    selectedYear,
    selectedMonth
  } = useFinancial();

  // Estados de formulários
  const [activeTab, setActiveTab] = useState<'investment' | 'patrimony'>('investment');
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editingPatId, setEditingPatId] = useState<string | null>(null);

  // Campos de Reserva & Metas
  const [reserveTarget, setReserveTarget] = useState(data.emergencyFund.targetValue);
  const [reserveCurrent, setReserveCurrent] = useState(data.emergencyFund.currentValue);
  const [formGoalVal, setFormGoalVal] = useState<number | ''>('');
  const [formGoalNotes, setFormGoalNotes] = useState('');

  // Campos de Investimento
  const [formInvType, setFormInvType] = useState<'CDB' | 'Tesouro' | 'Ações' | 'FIIs' | 'Poupança' | 'Outros'>('CDB');
  const [formInvName, setFormInvName] = useState('');
  const [formInvValue, setFormInvValue] = useState<number | ''>('');
  const [formInvYield, setFormInvYield] = useState('');
  const [formInvDate, setFormInvDate] = useState('');

  // Campos de Patrimônio (Bens)
  const [formPatType, setFormPatType] = useState<'Imóvel' | 'Veículo' | 'Outro Bem'>('Imóvel');
  const [formPatName, setFormPatName] = useState('');
  const [formPatValue, setFormPatValue] = useState<number | ''>('');
  const [formPatDesc, setFormPatDesc] = useState('');

  const currentYM = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Salvar Reserva de Emergência
  const handleSaveReserve = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmergencyFund({
      targetValue: Number(reserveTarget),
      currentValue: Number(reserveCurrent)
    });
    alert('Reserva de Emergência atualizada com sucesso!');
  };

  // Salvar Meta de Economia
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGoalVal) return;
    setSavingsGoal(currentYM, Number(formGoalVal), formGoalNotes);
    setFormGoalVal('');
    setFormGoalNotes('');
    alert('Meta de Economia definida com sucesso para este mês!');
  };

  // Salvar Investimento
  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvName || !formInvValue || !formInvDate) return;

    const invData = {
      type: formInvType,
      name: formInvName,
      value: Number(formInvValue),
      yieldRate: formInvYield || undefined,
      date: formInvDate
    };

    if (editingInvId) {
      updateInvestment(editingInvId, invData);
    } else {
      addInvestment(invData);
    }
    resetInvForm();
  };

  // Salvar Patrimônio
  const handleSavePatrimony = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatName || !formPatValue) return;

    const patData = {
      type: formPatType,
      name: formPatName,
      value: Number(formPatValue),
      description: formPatDesc || undefined
    };

    if (editingPatId) {
      updatePatrimonyItem(editingPatId, patData);
    } else {
      addPatrimonyItem(patData);
    }
    resetPatForm();
  };

  const resetInvForm = () => {
    setFormInvType('CDB');
    setFormInvName('');
    setFormInvValue('');
    setFormInvYield('');
    setFormInvDate('');
    setEditingInvId(null);
  };

  const resetPatForm = () => {
    setFormPatType('Imóvel');
    setFormPatName('');
    setFormPatValue('');
    setFormPatDesc('');
    setEditingPatId(null);
  };

  const handleStartEdit = (i: Investment) => {
    setEditingInvId(i.id);
    setFormInvType(i.type);
    setFormInvName(i.name);
    setFormInvValue(i.value);
    setFormInvYield(i.yieldRate || '');
    setFormInvDate(i.date);
  };

  // Totais calculados
  const totalInvestments = data.investments.reduce((sum, i) => sum + i.value, 0);
  const totalPatrimony = data.patrimonyItems.reduce((sum, p) => sum + p.value, 0);
  const totalAssets = totalInvestments + totalPatrimony + data.emergencyFund.currentValue;

  return (
    <div id="investments-manager-panel" className="space-y-6">
      {/* Cards de Resumo Geral do Patrimônio (Ativos) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div id="metric-assets-total" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 rounded-xl shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Ativos Brutos</p>
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              R$ {totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Soma de bens + aplicações + reservas</p>
          </div>
        </div>

        <div id="metric-assets-invest" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 rounded-xl shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total em Investimentos</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {totalInvestments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">{data.investments.length} aplicações financeiras ativas</p>
          </div>
        </div>

        <div id="metric-assets-bens" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/20 rounded-xl shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Controle de Bens (Patrimônio)</p>
            <h3 className="text-xl font-black text-zinc-850 dark:text-zinc-100 mt-1">
              R$ {totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Imóveis, veículos e outros bens</p>
          </div>
        </div>

        <div id="metric-assets-reserve" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/20 rounded-xl shrink-0">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sua Reserva de Emergência</p>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              R$ {data.emergencyFund.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Segurança financeira imediata</p>
          </div>
        </div>
      </div>

      {/* Seção Superior: Ajuste de Reserva e Meta de Economia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Painel Ajustar Reserva */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Gerenciar Reserva de Emergência</h3>
          </div>

          <form onSubmit={handleSaveReserve} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Alvo Ideal (R$)</label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={reserveTarget}
                  onChange={(e) => setReserveTarget(Number(e.target.value))}
                  id="input-reserve-target"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Atual Salvo (R$)</label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={reserveCurrent}
                  onChange={(e) => setReserveCurrent(Number(e.target.value))}
                  id="input-reserve-current"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden font-bold text-amber-600"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-save-reserve"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Salvar Reserva
            </button>
          </form>
        </div>

        {/* Painel Ajustar Meta de Economia */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Definir Meta de Economia Mensal</h3>
          </div>

          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Meta de Poupança (R$)</label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={formGoalVal}
                  onChange={(e) => setFormGoalVal(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-goal-value"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Mês de Aplicação</label>
                <input
                  disabled
                  type="text"
                  value={`${selectedMonth}/${selectedYear}`}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Notas / Propósito</label>
              <input
                type="text"
                placeholder="Ex: Guardar para viagem, dar entrada no carro..."
                value={formGoalNotes}
                onChange={(e) => setFormGoalNotes(e.target.value)}
                id="input-goal-notes"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              id="btn-save-goal"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Aplicar Meta para {selectedMonth}/{selectedYear}
            </button>
          </form>
        </div>
      </div>

      {/* Seção Inferior: Grid de Investimentos e Patrimônios (Bens) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Listagem agrupada */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Seletor de visualização */}
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('investment')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'investment'
                      ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Investimentos Financeiros
                </button>
                <button
                  onClick={() => setActiveTab('patrimony')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'patrimony'
                      ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Patrimônio & Bens
                </button>
              </div>

              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md font-mono text-zinc-500 font-bold">
                R$ {(activeTab === 'investment' ? totalInvestments : totalPatrimony).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Listagem Real */}
            <div className="space-y-3">
              {activeTab === 'investment' ? (
                data.investments.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                    <p className="text-xs font-semibold">Nenhum investimento registrado</p>
                    <p className="text-[10px] mt-0.5">Comece a construir sua carteira cadastrando suas aplicações financeiras ao lado.</p>
                  </div>
                ) : (
                  data.investments.map(item => (
                    <div
                      key={item.id}
                      className="p-4 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 rounded-xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></span>
                          <p className="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate">{item.name}</p>
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold uppercase rounded">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                          Rendimento: <strong className="text-zinc-700 dark:text-zinc-300">{item.yieldRate || 'Não especificado'}</strong> • Data aporte: {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                          <button
                            onClick={() => handleStartEdit(item)}
                            id={`btn-inv-edit-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteInvestment(item.id)}
                            id={`btn-inv-delete-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-600 transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                data.patrimonyItems.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                    <p className="text-xs font-semibold">Nenhum bem patrimonial</p>
                    <p className="text-[10px] mt-0.5">Cadastre seus imóveis, veículos ou outros bens importantes para ter controle total do seu patrimônio bruto.</p>
                  </div>
                ) : (
                  data.patrimonyItems.map(item => (
                    <div
                      key={item.id}
                      className="p-4 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 rounded-xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
                          <p className="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate">{item.name}</p>
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-bold uppercase rounded">
                            {item.type}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[10px] text-zinc-500 mt-1 italic truncate">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                          <button
                            onClick={() => {
                              setEditingPatId(item.id);
                              setFormPatType(item.type);
                              setFormPatName(item.name);
                              setFormPatValue(item.value);
                              setFormPatDesc(item.description || '');
                              setActiveTab('patrimony');
                            }}
                            id={`btn-pat-edit-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePatrimonyItem(item.id)}
                            id={`btn-pat-delete-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-600 transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário ativo */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit">
          {activeTab === 'investment' ? (
            <>
              <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {editingInvId ? 'Editar Investimento' : 'Novo Investimento'}
                </h3>
                {editingInvId && (
                  <button onClick={resetInvForm} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveInvestment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Tipo de Aplicação</label>
                  <select
                    value={formInvType}
                    onChange={(e: any) => setFormInvType(e.target.value)}
                    id="select-inv-type"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                  >
                    <option value="CDB">CDB (Certificado de Depósito)</option>
                    <option value="Tesouro">Tesouro Direto / Selic</option>
                    <option value="Ações">Ações (Bolsa de Valores)</option>
                    <option value="FIIs">FIIs (Fundos Imobiliários)</option>
                    <option value="Poupança">Caderneta de Poupança</option>
                    <option value="Outros">Outras Aplicações</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nome / Descrição do Ativo</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: CDB Liquidez Diária Banco Inter"
                    value={formInvName}
                    onChange={(e) => setFormInvName(e.target.value)}
                    id="input-inv-name"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Aplicado (R$)</label>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      value={formInvValue}
                      onChange={(e) => setFormInvValue(e.target.value === '' ? '' : Number(e.target.value))}
                      id="input-inv-value"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data do Aporte</label>
                    <input
                      required
                      type="date"
                      value={formInvDate}
                      onChange={(e) => setFormInvDate(e.target.value)}
                      id="input-inv-date"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Rendimento Combinado (Ex: % CDI, % a.a.)</label>
                  <input
                    type="text"
                    placeholder="Ex: 100% CDI, 12.5% a.a., IPCA + 6%"
                    value={formInvYield}
                    onChange={(e) => setFormInvYield(e.target.value)}
                    id="input-inv-yield"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-inv-save"
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {editingInvId ? 'Salvar Investimento' : 'Adicionar Investimento'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {editingPatId ? 'Editar Bem' : 'Novo Bem / Patrimônio'}
                </h3>
                {editingPatId && (
                  <button onClick={resetPatForm} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePatrimony} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Tipo de Bem</label>
                  <select
                    value={formPatType}
                    onChange={(e: any) => setFormPatType(e.target.value)}
                    id="select-pat-type"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                  >
                    <option value="Imóvel">Imóvel (Casa, Terreno, Apartamento)</option>
                    <option value="Veículo">Veículo (Carro, Moto, Caminhão)</option>
                    <option value="Outro Bem">Outros Bens (Equipamentos, Joias, Maquinários)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nome do Bem (Identificação)</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: SUV Toyota Corolla Cross"
                    value={formPatName}
                    onChange={(e) => setFormPatName(e.target.value)}
                    id="input-pat-name"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Avaliado (R$)</label>
                  <input
                    required
                    type="number"
                    placeholder="0.00"
                    value={formPatValue}
                    onChange={(e) => setFormPatValue(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-pat-value"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Breve Descrição / Detalhes</label>
                  <textarea
                    placeholder="Ex: Imóvel quitado próprio comercial..."
                    rows={2}
                    value={formPatDesc}
                    onChange={(e) => setFormPatDesc(e.target.value)}
                    id="input-pat-desc"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  id="btn-pat-save"
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {editingPatId ? 'Salvar Alterações' : 'Adicionar Bem'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
