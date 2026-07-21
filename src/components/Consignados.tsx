/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Consignado } from '../types';
import { Plus, Trash, Edit2, Check, X, Landmark, Percent, Award, ShieldAlert, Sparkles } from 'lucide-react';

export default function Consignados() {
  const { data, addConsignado, updateConsignado, deleteConsignado, selectedYear, selectedMonth } = useFinancial();

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

    const loanData = {
      bank: formBank,
      contractNumber: formContract,
      borrowedAmount: Number(formBorrowed),
      interestRate: Number(formInterest),
      loanDate: formLoanDate,
      firstPaymentDate: formFirstPayDate,
      totalInstallments: Number(formTotalInst),
      installmentValue: Number(formInstValue),
      isPaid: formIsPaid
    };

    if (editingId) {
      updateConsignado(editingId, loanData);
    } else {
      addConsignado(loanData);
    }
    resetForm();
  };

  // Helper de cálculo automático
  const getElapsedMonths = (firstPaymentDate: string, year: number, month: number) => {
    const start = new Date(firstPaymentDate + 'T00:00:00');
    const end = new Date(year, month - 1, 1);
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.min(Math.max(0, diffMonths + 1)); // conta o primeiro mês de pagamento
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
    // 1. Quantidade de parcelas pagas com base na data do filtro ou quitado voluntário
    const monthsElapsed = getElapsedMonths(c.firstPaymentDate, selectedYear, selectedMonth);
    const paidInstallments = c.isPaid ? c.totalInstallments : Math.min(c.totalInstallments, monthsElapsed);
    
    // 2. Valores financeiros calculados
    const initialContractValue = c.installmentValue * c.totalInstallments;
    const valorFinanciado = c.borrowedAmount;
    const valorTotalPago = paidInstallments * c.installmentValue;
    const saldoRestante = c.isPaid ? 0 : Math.max(0, initialContractValue - valorTotalPago);
    const jurosPagosProporcional = c.isPaid 
      ? (initialContractValue - c.borrowedAmount)
      : (paidInstallments / c.totalInstallments) * (initialContractValue - c.borrowedAmount);

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
      paidInstallments,
      valorFinanciado,
      valorTotalPago,
      saldoRestante,
      jurosPagosProporcional,
      initialContractValue
    };
  });

  const totalGeneralBankDashboard = Object.values(bankDashboard).reduce((sum, v) => sum + v, 0);

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
            <p className="text-[9px] text-zinc-400 mt-0.5">Saldo devedor restante</p>
          </div>
        </div>

        <div id="card-caixa-con" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Caixa Econômica</span>
          <div className="mt-2">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Caixa'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 mt-0.5">Saldo devedor restante</p>
          </div>
        </div>

        <div id="card-sicoob-con" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sicoob</span>
          <div className="mt-2">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Sicoob'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 mt-0.5">Saldo devedor restante</p>
          </div>
        </div>

        <div id="card-total-con" className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total Geral</span>
          <div className="mt-2">
            <h4 className="text-sm font-black text-indigo-700 dark:text-indigo-400">
              R$ {totalRemainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-indigo-500 mt-0.5">Total de empréstimos em aberto</p>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Lista de Consignados com Indicadores Matemáticos Auto-calculados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Contratos de Empréstimos Consignados</h3>
            <p className="text-xs text-zinc-500 mb-4">Detalhamento dos contratos ativos, juros amortizados e saldo residual.</p>

            <div className="space-y-4">
              {consignadosCalculated.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-semibold">Nenhum empréstimo consignado</p>
                  <p className="text-[10px] mt-0.5">Não há empréstimos cadastrados. Use o painel ao lado para registrar um.</p>
                </div>
              ) : (
                consignadosCalculated.map(item => {
                  const percentPaid = (item.valorTotalPago / item.initialContractValue) * 100;
                  return (
                    <div
                      key={item.id}
                      className={`p-5 border rounded-2xl transition-all ${
                        item.isPaid
                          ? 'bg-emerald-50/10 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30'
                          : 'bg-zinc-50/20 border-zinc-150 dark:bg-zinc-900/10'
                      }`}
                    >
                      {/* Header do Contrato */}
                      <div className="flex justify-between items-start gap-4 border-b border-zinc-100 dark:border-zinc-850 pb-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">{item.bank}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono rounded">
                              Contrato: {item.contractNumber}
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-400 mt-1">Primeiro pagamento em: {new Date(item.firstPaymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(item)}
                            id={`btn-con-edit-${item.id}`}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteConsignado(item.id)}
                            id={`btn-con-delete-${item.id}`}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-rose-600"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Métricas auto calculadas */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Valor Financiado</span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">R$ {item.valorFinanciado.toLocaleString('pt-BR')}</span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Valor Total Pago</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">R$ {item.valorTotalPago.toLocaleString('pt-BR')}</span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Juros Pagos (Est.)</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">R$ {item.jurosPagosProporcional.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Saldo Restante</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">R$ {item.saldoRestante.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Progresso de quitação do contrato */}
                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                          <span>Quitação das Parcelas ({item.paidInstallments} de {item.totalInstallments} pagas)</span>
                          <span className="font-bold">{percentPaid.toFixed(0)}% pago</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentPaid}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-400 mt-1">
                          <span>Parcela mensal: R$ {item.installmentValue.toLocaleString('pt-BR')}</span>
                          <span>Taxa: {item.interestRate}% a.m.</span>
                        </div>
                      </div>
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
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-md"
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
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
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
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
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
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
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
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Quantidade Parcelas</label>
                <input
                  required
                  type="number"
                  placeholder="Ex: 48"
                  value={formTotalInst}
                  onChange={(e) => setFormTotalInst(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-con-totalinst"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor da Parcela (R$)</label>
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
              <label htmlFor="checkbox-con-paid" className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold select-none cursor-pointer">
                Contrato Quitado / Pago Integralmente
              </label>
            </div>

            <button
              type="submit"
              id="btn-con-save"
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
