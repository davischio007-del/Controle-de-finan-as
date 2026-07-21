/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Consignado } from '../types';
import { 
  Plus, Trash, Edit2, Check, X, Landmark, Percent, Award, 
  ShieldAlert, Sparkles, ChevronDown, ChevronUp, CheckCircle, Clock, CalendarDays
} from 'lucide-react';

// Helper de vencimento de parcelas (1-indexado)
const calculateInstallmentDueDate = (firstPaymentDateStr: string, instIndex: number): string => {
  if (!firstPaymentDateStr) return '';
  const firstDate = new Date(firstPaymentDateStr + 'T00:00:00');
  const year = firstDate.getFullYear();
  const month = firstDate.getMonth(); // 0-11
  const day = firstDate.getDate();

  const targetDate = new Date(year, month + (instIndex - 1), day);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  const finalDate = new Date(targetYear, targetMonth, clampedDay);
  return finalDate.toISOString().split('T')[0];
};

export default function Consignados() {
  const { data, addConsignado, updateConsignado, deleteConsignado, selectedYear, selectedMonth } = useFinancial();

  // Estado para expandir extrato de parcelas do consignado
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Estados de formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formBank, setFormBank] = useState('Banco do Brasil');
  const [formContract, setFormContract] = useState('');
  const [formBorrowed, setFormBorrowed] = useState<number | ''>('');
  const [formInterest, setFormInterest] = useState<number | ''>('');
  const [formLoanDate, setFormLoanDate] = useState('');
  const [formFirstPayDate, setFormFirstPayDate] = useState('');
  const [formTotalInst, setFormTotalInst] = useState<number | ''>('');
  const [formInstValue, setFormInstValue] = useState<number | ''>('');
  const [formIsPaid, setFormIsPaid] = useState(false);

  const resetForm = () => {
    setFormBank('Banco do Brasil');
    setFormContract('');
    setFormBorrowed('');
    setFormInterest('');
    setFormLoanDate('');
    setFormFirstPayDate('');
    setFormTotalInst('');
    setFormInstValue('');
    setFormIsPaid(false);
    setEditingId(null);
  };

  const handleStartEdit = (c: Consignado) => {
    setEditingId(c.id);
    setFormBank(c.bank);
    setFormContract(c.contractNumber);
    setFormBorrowed(c.borrowedAmount);
    setFormInterest(c.interestRate);
    setFormLoanDate(c.loanDate);
    setFormFirstPayDate(c.firstPaymentDate);
    setFormTotalInst(c.totalInstallments);
    setFormInstValue(c.installmentValue);
    setFormIsPaid(c.isPaid);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBank || !formContract || !formBorrowed || !formInterest || !formLoanDate || !formFirstPayDate || !formTotalInst || !formInstValue) return;

    // Se estiver criando novo, preencher paidInstallmentsList como vazio por padrão
    const loanData = {
      bank: formBank,
      contractNumber: formContract,
      borrowedAmount: Number(formBorrowed),
      interestRate: Number(formInterest),
      loanDate: formLoanDate,
      firstPaymentDate: formFirstPayDate,
      totalInstallments: Number(formTotalInst),
      installmentValue: Number(formInstValue),
      isPaid: formIsPaid,
      paidInstallmentsList: editingId 
        ? data.consignados.find(c => c.id === editingId)?.paidInstallmentsList || []
        : [],
      paymentConfirmationDates: editingId
        ? data.consignados.find(c => c.id === editingId)?.paymentConfirmationDates || {}
        : {}
    };

    if (editingId) {
      updateConsignado(editingId, loanData);
    } else {
      addConsignado(loanData);
    }
    resetForm();
  };

  // Toggles de parcelas individuais no extrato analítico
  const handleToggleInstallmentPaid = (c: Consignado, instNum: number) => {
    const paidList = c.paidInstallmentsList || [];
    const isCurrentlyPaid = paidList.includes(instNum);
    
    let nextPaidList: number[];
    if (isCurrentlyPaid) {
      nextPaidList = paidList.filter(n => n !== instNum);
    } else {
      nextPaidList = [...paidList, instNum];
    }

    // Se preencheu todas as parcelas, marca o consignado todo como pago (quitado)
    const isNowFullyPaid = nextPaidList.length >= c.totalInstallments;

    // Registrar ou remover data de confirmação
    const currentDates = c.paymentConfirmationDates || {};
    const nextDates = { ...currentDates };
    if (!isCurrentlyPaid) {
      nextDates[instNum] = new Date().toISOString().split('T')[0]; // data de hoje
    } else {
      delete nextDates[instNum];
    }

    updateConsignado(c.id, {
      paidInstallmentsList: nextPaidList,
      isPaid: isNowFullyPaid,
      paymentConfirmationDates: nextDates
    });
  };

  // --- CÁLCULOS TOTAIS CONSIGNADOS ---
  let totalBorrowed = 0;
  let totalPaidAccumulated = 0;
  let totalRemainingBalance = 0;

  // Bancos exigidos no dashboard
  const bankDashboard: { [key: string]: number } = {
    'Banco do Brasil': 0,
    'Caixa': 0,
    'Sicoob': 0
  };

  const consignadosCalculated = data.consignados.map(c => {
    const paidList = c.paidInstallmentsList || [];
    const paidInstallmentsCount = c.isPaid ? c.totalInstallments : paidList.length;
    
    // Contrato total original
    const initialContractValue = c.installmentValue * c.totalInstallments;
    const valorFinanciado = c.borrowedAmount;
    
    // Total pago real correspondente às parcelas selecionadas
    const valorTotalPago = paidInstallmentsCount * c.installmentValue;
    const saldoRestante = c.isPaid ? 0 : Math.max(0, initialContractValue - valorTotalPago);
    const jurosPagosProporcional = c.isPaid 
      ? (initialContractValue - c.borrowedAmount)
      : (paidInstallmentsCount / c.totalInstallments) * (initialContractValue - c.borrowedAmount);

    totalBorrowed += valorFinanciado;
    totalPaidAccumulated += valorTotalPago;
    totalRemainingBalance += saldoRestante;

    // Agrupa para o painel de bancos
    let bankKey = '';
    const nameLower = c.bank.toLowerCase();
    if (nameLower.includes('brasil') || nameLower.includes('bb')) {
      bankKey = 'Banco do Brasil';
    } else if (nameLower.includes('caixa') || nameLower.includes('cef')) {
      bankKey = 'Caixa';
    } else if (nameLower.includes('sicoob')) {
      bankKey = 'Sicoob';
    }

    if (bankKey) {
      bankDashboard[bankKey] += saldoRestante;
    }

    return {
      ...c,
      paidInstallmentsCount,
      valorFinanciado,
      valorTotalPago,
      saldoRestante,
      jurosPagosProporcional,
      initialContractValue
    };
  });

  return (
    <div id="consignados-manager-panel" className="space-y-6">
      {/* Cards do Dashboard Consignados por Banco */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div id="card-bb-con" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Banco do Brasil</span>
          <div className="mt-2">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Banco do Brasil'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 mt-0.5 font-medium">Saldo devedor restante</p>
          </div>
        </div>

        <div id="card-caixa-con" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Caixa Econômica</span>
          <div className="mt-2">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Caixa'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 mt-0.5 font-medium">Saldo devedor restante</p>
          </div>
        </div>

        <div id="card-sicoob-con" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sicoob</span>
          <div className="mt-2">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Sicoob'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 mt-0.5 font-medium">Saldo devedor restante</p>
          </div>
        </div>

        <div id="card-total-con" className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total Geral</span>
          <div className="mt-2">
            <h4 className="text-sm font-black text-indigo-700 dark:text-indigo-400">
              R$ {totalRemainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-indigo-500 mt-0.5 font-semibold">Total de consignados em aberto</p>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Lista de Consignados com Extrato de Parcelas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Contratos de Empréstimos Consignados</h3>
            <p className="text-xs text-zinc-500 mb-4 font-medium">Controle de saldo residual, estimativa de juros amortizados e extrato individualizado.</p>

            <div className="space-y-4">
              {consignadosCalculated.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-semibold">Nenhum empréstimo consignado</p>
                  <p className="text-[10px] mt-0.5">Não há empréstimos cadastrados. Use o formulário para lançar um novo contrato.</p>
                </div>
              ) : (
                consignadosCalculated.map(item => {
                  const percentPaid = (item.valorTotalPago / item.initialContractValue) * 100;
                  const isExpanded = expandedLoanId === item.id;
                  const paidList = item.paidInstallmentsList || [];

                  return (
                    <div
                      key={item.id}
                      className={`p-5 border rounded-2xl transition-all space-y-4 ${
                        item.isPaid
                          ? 'bg-emerald-50/10 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30'
                          : 'bg-zinc-50/20 border-zinc-150 dark:bg-zinc-900/10'
                      }`}
                    >
                      {/* Header do Contrato */}
                      <div className="flex justify-between items-start gap-4 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-black text-zinc-850 dark:text-zinc-100">{item.bank}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-bold rounded">
                              Contrato: {item.contractNumber}
                            </span>
                            {item.isPaid && (
                              <span className="text-[8px] px-1.5 bg-emerald-100 text-emerald-850 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold uppercase tracking-wider rounded">
                                Quitado
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 font-semibold mt-1">
                            Lançado em {new Date(item.loanDate + 'T00:00:00').toLocaleDateString('pt-BR')} • Primeira parcela em: {new Date(item.firstPaymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleStartEdit(item)}
                            id={`btn-con-edit-${item.id}`}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteConsignado(item.id)}
                            id={`btn-con-delete-${item.id}`}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Métricas auto calculadas */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Valor Financiado</span>
                          <span className="font-black text-zinc-700 dark:text-zinc-300">R$ {item.valorFinanciado.toLocaleString('pt-BR')}</span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Total Pago (Acumulado)</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {item.valorTotalPago.toLocaleString('pt-BR')}</span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Juros Pagos (Proporc.)</span>
                          <span className="font-black text-amber-600 dark:text-amber-400">R$ {item.jurosPagosProporcional.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Saldo residual</span>
                          <span className="font-black text-rose-600 dark:text-rose-400">R$ {item.saldoRestante.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Barra de progresso */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span className="font-semibold">Progresso do Contrato ({item.paidInstallmentsCount} de {item.totalInstallments} parcelas)</span>
                          <span className="font-black">{percentPaid.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${percentPaid}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                          <span>Prestação: R$ {item.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span>Taxa contratada: {item.interestRate}% a.m.</span>
                        </div>
                      </div>

                      {/* Botão de Expandir Extrato Analítico */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 flex justify-between items-center">
                        <button
                          onClick={() => setExpandedLoanId(isExpanded ? null : item.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4.5 h-4.5" />
                              Ocultar Extrato de Parcelas
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4.5 h-4.5" />
                              Visualizar Extrato de Parcelas (Amortização)
                            </>
                          )}
                        </button>
                        
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                          Restam {item.totalInstallments - item.paidInstallmentsCount} parcelas
                        </span>
                      </div>

                      {/* Painel do Extrato Analítico de Parcelas */}
                      {isExpanded && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl p-4 mt-2 space-y-3">
                          <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                            <CalendarDays className="w-3.5 h-3.5" /> Extrato Analítico - Pagamento de Prestações
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-72 overflow-y-auto pr-1">
                            {Array.from({ length: item.totalInstallments }).map((_, i) => {
                              const instNum = i + 1;
                              const dueDate = calculateInstallmentDueDate(item.firstPaymentDate, instNum);
                              const isPaid = paidList.includes(instNum);
                              const confDate = item.paymentConfirmationDates?.[instNum];

                              return (
                                <div 
                                  key={instNum}
                                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                                    isPaid 
                                      ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-950' 
                                      : 'bg-zinc-50/50 border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-850'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5 font-bold">
                                      <span className={isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}>
                                        Parcela {instNum}/{item.totalInstallments}
                                      </span>
                                      {isPaid ? (
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Clock className="w-3 h-3 text-zinc-400" />
                                      )}
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                      Vence: {dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                                    </p>
                                    {isPaid && confDate && (
                                      <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-wide mt-0.5">
                                        Pago em: {new Date(confDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleToggleInstallmentPaid(item, instNum)}
                                    className={`px-2.5 py-1 rounded text-[10px] font-extrabold cursor-pointer transition-colors ${
                                      isPaid
                                        ? 'bg-zinc-100 hover:bg-rose-100 dark:bg-zinc-800 text-zinc-600 hover:text-rose-600'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                                  >
                                    {isPaid ? 'Desfazer' : 'Pagar'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Cadastro */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {editingId ? 'Editar Contrato' : 'Cadastrar Empréstimo'}
            </h3>
            {editingId && (
              <button
                onClick={resetForm}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Instituição Credora</label>
              <select
                value={formBank}
                onChange={(e) => setFormBank(e.target.value)}
                id="select-con-bank"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
              >
                <option value="Banco do Brasil">Banco do Brasil</option>
                <option value="Caixa Econômica">Caixa Econômica</option>
                <option value="Sicoob">Sicoob</option>
                <option value="Itaú Unibanco">Itaú Unibanco</option>
                <option value="Banco Bradesco">Banco Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Outro Banco">Outro Banco</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Número do Contrato</label>
              <input
                required
                type="text"
                placeholder="Ex: BB-98745-A"
                value={formContract}
                onChange={(e) => setFormContract(e.target.value)}
                id="input-con-contract"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Emprestado (R$)</label>
                <input
                  required
                  type="number"
                  placeholder="0.00"
                  value={formBorrowed}
                  onChange={(e) => setFormBorrowed(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-con-borrowed"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Taxa de Juros (% a.m.)</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="Ex: 1.85"
                  value={formInterest}
                  onChange={(e) => setFormInterest(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-con-interest"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Empréstimo</label>
                <input
                  required
                  type="date"
                  value={formLoanDate}
                  onChange={(e) => setFormLoanDate(e.target.value)}
                  id="input-con-loandate"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Primeiro Pagamento</label>
                <input
                  required
                  type="date"
                  value={formFirstPayDate}
                  onChange={(e) => setFormFirstPayDate(e.target.value)}
                  id="input-con-firstpaydate"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Qtde Parcelas</label>
                <input
                  required
                  type="number"
                  placeholder="Ex: 48"
                  value={formTotalInst}
                  onChange={(e) => setFormTotalInst(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-con-totalinst"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Parcela (R$)</label>
                <input
                  required
                  type="number"
                  placeholder="0.00"
                  value={formInstValue}
                  onChange={(e) => setFormInstValue(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-con-instvalue"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={formIsPaid}
                onChange={(e) => setFormIsPaid(e.target.checked)}
                id="checkbox-con-paid"
                className="rounded-sm text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer"
              />
              <label htmlFor="checkbox-con-paid" className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold select-none cursor-pointer text-ellipsis overflow-hidden">
                Contrato Quitado Integralmente
              </label>
            </div>

            <button
              type="submit"
              id="btn-con-save"
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
                  Cadastrar Contrato
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
