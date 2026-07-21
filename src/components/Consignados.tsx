/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Consignado } from '../types';
import { 
  Plus, Trash, Edit2, Check, X, Landmark, Percent, Award, 
  ShieldAlert, Sparkles, ChevronDown, ChevronUp, CheckCircle, Clock, CalendarDays,
  Coins, TrendingDown, ArrowRight, History, BarChart3, AlertTriangle, FileSpreadsheet,
  CheckSquare, HelpCircle, Activity, PiggyBank
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

export interface AmortizationRow {
  number: number;
  dueDate: string;
  installmentValue: number;
  interestValue: number;
  amortizationValue: number;
  endingBalance: number;
  isPaid: boolean;
  paymentDate?: string;
}

// Função de cálculo de amortização conforme Tabela Price, SAC ou Personalizado
export function calculateAmortizationSchedule(
  borrowedAmount: number,
  interestRateMonthly: number,
  totalInstallments: number,
  firstPaymentDateStr: string,
  amortizationSystem: 'Price' | 'SAC' | 'Personalizado',
  manualInstallmentValue: number,
  paidInstallmentsList: number[] = [],
  paymentConfirmationDates: Record<number, string> = {}
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  let balance = borrowedAmount;
  const rate = interestRateMonthly / 100;
  const n = totalInstallments;

  let pmt = 0;
  if (amortizationSystem === 'Price' && rate > 0) {
    pmt = borrowedAmount * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
  } else if (amortizationSystem === 'Price') {
    pmt = borrowedAmount / n;
  }

  for (let k = 1; k <= n; k++) {
    const dueDate = calculateInstallmentDueDate(firstPaymentDateStr, k);
    let instVal = 0;
    let intVal = 0;
    let amortVal = 0;

    if (amortizationSystem === 'SAC') {
      amortVal = borrowedAmount / n;
      intVal = balance * rate;
      instVal = amortVal + intVal;
    } else if (amortizationSystem === 'Price') {
      instVal = pmt;
      intVal = balance * rate;
      amortVal = instVal - intVal;
    } else {
      // Personalizado
      instVal = manualInstallmentValue || (borrowedAmount / n);
      intVal = balance * rate;
      amortVal = instVal - intVal;
      if (amortVal < 0) amortVal = 0;
    }

    // Ajuste de arredondamento no último período
    if (k === n || balance - amortVal < 0.05) {
      amortVal = balance;
      if (amortizationSystem === 'SAC') {
        instVal = amortVal + intVal;
      } else if (amortizationSystem === 'Price') {
        instVal = amortVal + intVal;
      }
      balance = 0;
    } else {
      balance = balance - amortVal;
    }

    schedule.push({
      number: k,
      dueDate,
      installmentValue: instVal,
      interestValue: intVal,
      amortizationValue: amortVal,
      endingBalance: Math.max(0, balance),
      isPaid: paidInstallmentsList.includes(k),
      paymentDate: paymentConfirmationDates[k]
    });
  }

  return schedule;
}

export default function Consignados() {
  const { data, addConsignado, updateConsignado, deleteConsignado, selectedYear, selectedMonth } = useFinancial();

  // Abas de navegação do módulo avançado
  const [activeTab, setActiveTab] = useState<'contracts' | 'simulation' | 'settlements' | 'reports'>('contracts');

  // Controle de alertas e banners de parcelas vencidas
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);

  // Estado para expandir extrato de parcelas do consignado
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Estados de formulário para cadastro/edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formBank, setFormBank] = useState('Banco do Brasil');
  const [formContract, setFormContract] = useState('');
  const [formLoanType, setFormLoanType] = useState('Consignado Público');
  const [formReleasedAmount, setFormReleasedAmount] = useState<number | ''>('');
  const [formBorrowed, setFormBorrowed] = useState<number | ''>('');
  const [formInterest, setFormInterest] = useState<number | ''>('');
  const [formInterestYearly, setFormInterestYearly] = useState<number | ''>('');
  const [formAmortizationSystem, setFormAmortizationSystem] = useState<'Price' | 'SAC' | 'Personalizado'>('Price');
  const [formTotalInst, setFormTotalInst] = useState<number | ''>('');
  const [formInstValue, setFormInstValue] = useState<number | ''>('');
  const [formLoanDate, setFormLoanDate] = useState('');
  const [formFirstPayDate, setFormFirstPayDate] = useState('');
  const [formDueDay, setFormDueDay] = useState<number | ''>('');
  const [formCetRate, setFormCetRate] = useState<number | ''>('');
  const [formIsPaid, setFormIsPaid] = useState(false);

  // Estados para SIMULAÇÃO DE QUITAÇÃO ANTECIPADA
  const [simLoanId, setSimLoanId] = useState('');
  const [simDate, setSimDate] = useState(new Date().toISOString().split('T')[0]);
  const [settlementSuccessMsg, setSettlementSuccessMsg] = useState<string | null>(null);

  // Sincronizar taxas de juros Mensal e Anual no formulário
  useEffect(() => {
    if (formInterest !== '' && !isNaN(Number(formInterest))) {
      const monthly = Number(formInterest);
      const yearly = (Math.pow(1 + monthly / 100, 12) - 1) * 100;
      setFormInterestYearly(Number(yearly.toFixed(2)));
    } else {
      setFormInterestYearly('');
    }
  }, [formInterest]);

  // Sincronizar dia de vencimento com a data do primeiro pagamento
  useEffect(() => {
    if (formFirstPayDate) {
      const d = new Date(formFirstPayDate + 'T00:00:00');
      setFormDueDay(d.getDate());
    }
  }, [formFirstPayDate]);

  // Sincronizar auto-cálculo da parcela com base no sistema amortização
  useEffect(() => {
    const pv = Number(formBorrowed);
    const r = Number(formInterest);
    const n = Number(formTotalInst);

    if (pv > 0 && r >= 0 && n > 0 && formAmortizationSystem !== 'Personalizado') {
      const monthlyRate = r / 100;
      if (formAmortizationSystem === 'Price') {
        let pmt = 0;
        if (monthlyRate > 0) {
          pmt = pv * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
        } else {
          pmt = pv / n;
        }
        setFormInstValue(Number(pmt.toFixed(2)));
      } else if (formAmortizationSystem === 'SAC') {
        // No SAC o valor da primeira parcela é o teto máximo (Amortização + Juros sobre saldo inicial)
        const constantAmort = pv / n;
        const initialInterest = pv * monthlyRate;
        const firstPmt = constantAmort + initialInterest;
        setFormInstValue(Number(firstPmt.toFixed(2)));
      }
    }
  }, [formBorrowed, formInterest, formTotalInst, formAmortizationSystem]);

  // Auto-selecionar o primeiro empréstimo ativo no simulador se houver
  useEffect(() => {
    const activeLoans = data.consignados.filter(c => !c.isPaid);
    if (activeLoans.length > 0 && !simLoanId) {
      setSimLoanId(activeLoans[0].id);
    }
  }, [data.consignados, simLoanId]);

  const resetForm = () => {
    setFormBank('Banco do Brasil');
    setFormContract('');
    setFormLoanType('Consignado Público');
    setFormReleasedAmount('');
    setFormBorrowed('');
    setFormInterest('');
    setFormInterestYearly('');
    setFormAmortizationSystem('Price');
    setFormTotalInst('');
    setFormInstValue('');
    setFormLoanDate('');
    setFormFirstPayDate('');
    setFormDueDay('');
    setFormCetRate('');
    setFormIsPaid(false);
    setEditingId(null);
  };

  const handleStartEdit = (c: Consignado) => {
    setEditingId(c.id);
    setFormBank(c.bank);
    setFormContract(c.contractNumber);
    setFormLoanType(c.loanType || 'Consignado Público');
    setFormReleasedAmount(c.releasedAmount !== undefined ? c.releasedAmount : '');
    setFormBorrowed(c.borrowedAmount);
    setFormInterest(c.interestRate);
    setFormAmortizationSystem(c.amortizationSystem || 'Price');
    setFormTotalInst(c.totalInstallments);
    setFormInstValue(c.installmentValue);
    setFormLoanDate(c.loanDate);
    setFormFirstPayDate(c.firstPaymentDate);
    setFormDueDay(c.dueDay !== undefined ? c.dueDay : '');
    setFormCetRate(c.cetRate !== undefined ? c.cetRate : '');
    setFormIsPaid(c.isPaid);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBank || !formContract || !formBorrowed || !formInterest || !formLoanDate || !formFirstPayDate || !formTotalInst || !formInstValue) return;

    const loanData: Omit<Consignado, 'id'> = {
      bank: formBank,
      contractNumber: formContract,
      loanType: formLoanType,
      releasedAmount: formReleasedAmount !== '' ? Number(formReleasedAmount) : Number(formBorrowed),
      borrowedAmount: Number(formBorrowed),
      interestRate: Number(formInterest),
      interestRateYearly: formInterestYearly !== '' ? Number(formInterestYearly) : undefined,
      amortizationSystem: formAmortizationSystem,
      totalInstallments: Number(formTotalInst),
      installmentValue: Number(formInstValue),
      loanDate: formLoanDate,
      firstPaymentDate: formFirstPayDate,
      dueDay: formDueDay !== '' ? Number(formDueDay) : undefined,
      cetRate: formCetRate !== '' ? Number(formCetRate) : undefined,
      isPaid: formIsPaid,
      paidInstallmentsList: editingId 
        ? data.consignados.find(c => c.id === editingId)?.paidInstallmentsList || []
        : [],
      paymentConfirmationDates: editingId
        ? data.consignados.find(c => c.id === editingId)?.paymentConfirmationDates || {}
        : {},
      earlySettlementHistory: editingId
        ? data.consignados.find(c => c.id === editingId)?.earlySettlementHistory || []
        : []
    };

    if (editingId) {
      updateConsignado(editingId, loanData);
    } else {
      addConsignado(loanData);
    }
    resetForm();
  };

  // Toggle de parcela individual pago/em aberto
  const handleToggleInstallmentPaid = (c: Consignado, instNum: number) => {
    const paidList = c.paidInstallmentsList || [];
    const isCurrentlyPaid = paidList.includes(instNum);
    
    let nextPaidList: number[];
    if (isCurrentlyPaid) {
      nextPaidList = paidList.filter(n => n !== instNum);
    } else {
      nextPaidList = [...paidList, instNum];
    }

    const isNowFullyPaid = nextPaidList.length >= c.totalInstallments;

    const currentDates = c.paymentConfirmationDates || {};
    const nextDates = { ...currentDates };
    if (!isCurrentlyPaid) {
      nextDates[instNum] = new Date().toISOString().split('T')[0];
    } else {
      delete nextDates[instNum];
    }

    updateConsignado(c.id, {
      paidInstallmentsList: nextPaidList,
      isPaid: isNowFullyPaid,
      paymentConfirmationDates: nextDates
    });
  };

  // --- CONTROLE AUTOMÁTICO DE PAGAMENTOS ---
  // Varre todos os contratos ativos e busca parcelas não pagas que venceram antes de HOJE (2026-07-20)
  const todayStr = '2026-07-20';

  const overdueInstallments = useMemo(() => {
    const list: Array<{ loan: Consignado; instNum: number; dueDate: string; value: number }> = [];
    data.consignados.forEach(c => {
      if (c.isPaid) return;
      
      const schedule = calculateAmortizationSchedule(
        c.borrowedAmount,
        c.interestRate,
        c.totalInstallments,
        c.firstPaymentDate,
        c.amortizationSystem || 'Price',
        c.installmentValue,
        c.paidInstallmentsList || [],
        c.paymentConfirmationDates || {}
      );

      schedule.forEach(row => {
        if (!row.isPaid && row.dueDate < todayStr) {
          list.push({
            loan: c,
            instNum: row.number,
            dueDate: row.dueDate,
            value: row.installmentValue
          });
        }
      });
    });
    return list;
  }, [data.consignados]);

  // Executa o pagamento automático de todas as parcelas vencidas
  const handleAutoPayOverdue = () => {
    overdueInstallments.forEach(item => {
      const c = item.loan;
      const paidList = c.paidInstallmentsList || [];
      if (!paidList.includes(item.instNum)) {
        const nextPaidList = [...paidList, item.instNum];
        const isNowFullyPaid = nextPaidList.length >= c.totalInstallments;
        const nextDates = { ...c.paymentConfirmationDates };
        nextDates[item.instNum] = item.dueDate; // Apropria o pagamento na data de vencimento correspondente

        updateConsignado(c.id, {
          paidInstallmentsList: nextPaidList,
          isPaid: isNowFullyPaid,
          paymentConfirmationDates: nextDates
        });
      }
    });
    setShowOverdueAlert(false);
  };

  // --- CÁLCULO DAS PROPRIEDADES DE TODOS OS CONSIGNADOS ---
  const consignadosCalculated = useMemo(() => {
    return data.consignados.map(c => {
      const schedule = calculateAmortizationSchedule(
        c.borrowedAmount,
        c.interestRate,
        c.totalInstallments,
        c.firstPaymentDate,
        c.amortizationSystem || 'Price',
        c.installmentValue,
        c.paidInstallmentsList || [],
        c.paymentConfirmationDates || {}
      );

      const paidList = c.paidInstallmentsList || [];
      
      // Totais calculados com base nas parcelas pagas reais
      let totalPaidValue = 0;
      let totalPaidAmortization = 0;
      let totalPaidInterest = 0;
      let totalRemainingAmortization = 0;
      let totalRemainingInterest = 0;

      schedule.forEach(row => {
        if (row.isPaid) {
          totalPaidValue += row.installmentValue;
          totalPaidAmortization += row.amortizationValue;
          totalPaidInterest += row.interestValue;
        } else {
          totalRemainingAmortization += row.amortizationValue;
          totalRemainingInterest += row.interestValue;
        }
      });

      const initialContractValue = schedule.reduce((sum, r) => sum + r.installmentValue, 0);
      const totalOriginalInterest = schedule.reduce((sum, r) => sum + r.interestValue, 0);
      
      const percentPaid = initialContractValue > 0 ? (totalPaidValue / initialContractValue) * 100 : 0;
      const remainingInstallmentsCount = c.totalInstallments - paidList.length;

      return {
        ...c,
        schedule,
        initialContractValue,
        totalOriginalInterest,
        totalPaidValue,
        totalPaidAmortization,
        totalPaidInterest,
        totalRemainingAmortization,
        totalRemainingInterest,
        percentPaid,
        remainingInstallmentsCount,
        paidInstallmentsCount: paidList.length
      };
    });
  }, [data.consignados]);

  // Métricas Consolidadas do Painel
  const consolidatedMetrics = useMemo(() => {
    let totalBorrowed = 0;
    let totalReleased = 0;
    let totalPaid = 0;
    let totalRemainingAmort = 0;
    let totalRemainingInterest = 0;
    let totalInterestSaved = 0;
    let activeLoansCount = 0;
    let settledLoansCount = 0;

    consignadosCalculated.forEach(c => {
      totalBorrowed += c.borrowedAmount;
      totalReleased += c.releasedAmount !== undefined ? c.releasedAmount : c.borrowedAmount;
      totalPaid += c.totalPaidValue;
      totalRemainingAmort += c.totalRemainingAmortization;
      totalRemainingInterest += c.totalRemainingInterest;
      
      if (c.isPaid) {
        settledLoansCount++;
      } else {
        activeLoansCount++;
      }

      // Sum economy from early settlements
      if (c.earlySettlementHistory) {
        c.earlySettlementHistory.forEach(settle => {
          totalInterestSaved += settle.economyAmount;
        });
      }
    });

    return {
      totalBorrowed,
      totalReleased,
      totalPaid,
      totalRemainingAmort,
      totalRemainingInterest,
      totalInterestSaved,
      activeLoansCount,
      settledLoansCount
    };
  }, [consignadosCalculated]);

  // Saldos Restantes por Banco Credor (Para o Dashboard superior)
  const bankDashboard = useMemo(() => {
    const map: Record<string, number> = {
      'Banco do Brasil': 0,
      'Caixa': 0,
      'Sicoob': 0,
      'Outros': 0
    };

    consignadosCalculated.forEach(c => {
      if (c.isPaid) return;
      const bank = c.bank;
      if (bank.includes('Brasil') || bank.includes('BB')) {
        map['Banco do Brasil'] += c.totalRemainingAmortization;
      } else if (bank.includes('Caixa') || bank.includes('CEF')) {
        map['Caixa'] += c.totalRemainingAmortization;
      } else if (bank.includes('Sicoob')) {
        map['Sicoob'] += c.totalRemainingAmortization;
      } else {
        map['Outros'] += c.totalRemainingAmortization;
      }
    });

    return map;
  }, [consignadosCalculated]);

  // --- LÓGICA DE SIMULAÇÃO DE QUITAÇÃO ANTECIPADA ---
  const selectedSimLoan = useMemo(() => {
    return consignadosCalculated.find(c => c.id === simLoanId);
  }, [consignadosCalculated, simLoanId]);

  const simulationResult = useMemo(() => {
    if (!selectedSimLoan) return null;

    const schedule = selectedSimLoan.schedule;
    
    let paidValue = 0;
    let interestPaid = 0;
    let amortizationPaid = 0;
    
    let interestDiscount = 0;
    let amortizationPending = 0; // Este é o saldo devedor atualizado necessário para quitação na data informada

    schedule.forEach(row => {
      // Se a parcela vence até a data de simulação ou já está paga
      if (row.dueDate <= simDate || row.isPaid) {
        paidValue += row.installmentValue;
        interestPaid += row.interestValue;
        amortizationPaid += row.amortizationValue;
      } else {
        // Parcela futura que será amortizada sem juros
        interestDiscount += row.interestValue;
        amortizationPending += row.amortizationValue;
      }
    });

    const previousTotalDebt = amortizationPending + interestDiscount;

    return {
      borrowedAmount: selectedSimLoan.borrowedAmount,
      totalOriginalInterest: selectedSimLoan.totalOriginalInterest,
      initialContractValue: selectedSimLoan.initialContractValue,
      paidValue,
      interestPaid,
      amortizationPaid,
      interestDiscount,
      amortizationPending,
      previousTotalDebt,
      economyAmount: interestDiscount
    };
  }, [selectedSimLoan, simDate]);

  // Executa o registro da quitação antecipada
  const handleRegisterSettlement = () => {
    if (!selectedSimLoan || !simulationResult) return;

    // Criar item de histórico de liquidação
    const newSettlement = {
      settlementDate: simDate,
      paidValue: simulationResult.amortizationPending,
      interestDiscount: simulationResult.interestDiscount,
      interestPaid: simulationResult.interestPaid,
      amortizationPaid: simulationResult.amortizationPaid,
      economyAmount: simulationResult.economyAmount,
      previousDebt: simulationResult.previousTotalDebt,
      finalDebt: 0
    };

    const currentHistory = selectedSimLoan.earlySettlementHistory || [];
    const nextHistory = [...currentHistory, newSettlement];

    // Marcar todas as parcelas do cronograma como pagas
    const allInstallmentNums = Array.from({ length: selectedSimLoan.totalInstallments }, (_, i) => i + 1);
    const nextConfirmationDates = { ...selectedSimLoan.paymentConfirmationDates };
    allInstallmentNums.forEach(num => {
      if (!selectedSimLoan.paidInstallmentsList?.includes(num)) {
        nextConfirmationDates[num] = simDate;
      }
    });

    updateConsignado(selectedSimLoan.id, {
      isPaid: true,
      paidInstallmentsList: allInstallmentNums,
      paymentConfirmationDates: nextConfirmationDates,
      earlySettlementHistory: nextHistory
    });

    setSettlementSuccessMsg(`Quitação antecipada registrada com sucesso! Economia de juros obtida: R$ ${simulationResult.economyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    setTimeout(() => setSettlementSuccessMsg(null), 7000);
  };

  // --- LISTA CONSOLIDADA DE LIQUIDAÇÕES REALIZADAS ---
  const settlementHistoryList = useMemo(() => {
    const list: Array<{
      loanId: string;
      bank: string;
      contractNumber: string;
      settlementDate: string;
      paidValue: number;
      interestDiscount: number;
      interestPaid: number;
      amortizationPaid: number;
      economyAmount: number;
      previousDebt: number;
    }> = [];

    data.consignados.forEach(c => {
      if (c.earlySettlementHistory) {
        c.earlySettlementHistory.forEach(settle => {
          list.push({
            loanId: c.id,
            bank: c.bank,
            contractNumber: c.contractNumber,
            ...settle
          });
        });
      }
    });

    return list.sort((a, b) => b.settlementDate.localeCompare(a.settlementDate));
  }, [data.consignados]);


  return (
    <div id="consignados-advanced-panel" className="space-y-6 animate-fade-in text-zinc-800 dark:text-zinc-200">
      
      {/* ⚠️ BANNER DE AVISO DE PARCELAS VENCIDAS (CONTROLE AUTOMÁTICO DE PAGAMENTOS) */}
      {overdueInstallments.length > 0 && showOverdueAlert && (
        <div id="overdue-payment-alert" className="bg-amber-50 border-l-4 border-amber-500 dark:bg-amber-950/20 dark:border-amber-500 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">Controle de Parcelas Vencidas</h4>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                Identificamos <strong className="font-black text-amber-800 dark:text-amber-300">{overdueInstallments.length} parcela(s)</strong> de consignados vencida(s) até hoje. Deseja registrá-las automaticamente como pagas?
              </p>
              <div className="mt-2 text-[10px] text-amber-500 space-y-0.5 max-h-24 overflow-y-auto">
                {overdueInstallments.map((x, idx) => (
                  <div key={idx}>
                    • Parcela {x.instNum} de {x.loan.bank} ({x.loan.contractNumber}) - Venceu em {new Date(x.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')} (R$ {x.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleAutoPayOverdue}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Sim, pagar todas
            </button>
            <button
              onClick={() => setShowOverdueAlert(false)}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-bold rounded-lg hover:bg-zinc-300 transition-colors cursor-pointer"
            >
              Agora Não
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÃO DE SUCESSO DE LIQUIDAÇÃO */}
      {settlementSuccessMsg && (
        <div className="bg-emerald-500 text-white text-xs font-black p-4 rounded-xl flex items-center gap-2 shadow-md animate-slide-in">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{settlementSuccessMsg}</span>
        </div>
      )}

      {/* CARDS RESUMO DO CONTINGENTE DE CONSIGNADOS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Banco do Brasil</span>
          <div className="mt-1">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Banco do Brasil'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 font-medium">Saldo devedor restante</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Caixa Federal</span>
          <div className="mt-1">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Caixa'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 font-medium">Saldo devedor restante</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Sicoob Credi</span>
          <div className="mt-1">
            <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
              R$ {bankDashboard['Sicoob'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-zinc-400 font-medium">Saldo devedor restante</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] font-extrabold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block">Economia em Quitações</span>
          <div className="mt-1">
            <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              R$ {consolidatedMetrics.totalInterestSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-emerald-500 font-bold">Juros futuros cancelados</p>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Saldo Geral Devedor</span>
          <div className="mt-1">
            <h4 className="text-sm font-black text-indigo-700 dark:text-indigo-400">
              R$ {consolidatedMetrics.totalRemainingAmort.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-indigo-500 font-bold">Contratos ativos: {consolidatedMetrics.activeLoansCount}</p>
          </div>
        </div>
      </div>

      {/* ABAS DO MÓDULO */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-px gap-2 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center gap-1.5 px-4 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'contracts'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-black'
              : 'text-zinc-400 hover:text-zinc-600 border-transparent'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Contratos e Parcelas
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-1.5 px-4 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'simulation'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-black'
              : 'text-zinc-400 hover:text-zinc-600 border-transparent'
          }`}
        >
          <Coins className="w-4 h-4" />
          Simular Quitação Antecipada
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex items-center gap-1.5 px-4 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'settlements'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-black'
              : 'text-zinc-400 hover:text-zinc-600 border-transparent'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Liquidações
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-4 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-black'
              : 'text-zinc-400 hover:text-zinc-600 border-transparent'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Análise e Relatórios
        </button>
      </div>

      {/* ABA 1: CONTRATOS E PARCELAS */}
      {activeTab === 'contracts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LADO ESQUERDO: LISTA DE CONTRATOS */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Meus Empréstimos Consignados</h3>
                  <p className="text-xs text-zinc-500 font-medium">Controle de saldos ativos, histórico de parcelas pagas e sistema de amortização.</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-bold rounded-lg border border-zinc-200 dark:border-zinc-800">
                  Total: {consignadosCalculated.length} contratos
                </span>
              </div>

              <div className="space-y-4">
                {consignadosCalculated.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-zinc-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                    <p className="text-xs font-semibold">Nenhum consignado cadastrado</p>
                    <p className="text-[10px] mt-0.5">Use o formulário lateral para cadastrar seu primeiro empréstimo de folha.</p>
                  </div>
                ) : (
                  consignadosCalculated.map(item => {
                    const isExpanded = expandedLoanId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-5 border rounded-2xl transition-all space-y-4 ${
                          item.isPaid
                            ? 'bg-emerald-50/10 border-emerald-200 dark:bg-emerald-950/5 dark:border-emerald-900/30'
                            : 'bg-zinc-50/20 border-zinc-200 dark:border-zinc-850'
                        }`}
                      >
                        {/* Header do Cartão */}
                        <div className="flex justify-between items-start gap-4 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              <span className="text-xs font-black text-zinc-800 dark:text-zinc-100">{item.bank}</span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono font-black rounded">
                                Contrato: {item.contractNumber}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 font-bold rounded">
                                {item.loanType || 'Consignado'}
                              </span>
                              {item.isPaid && (
                                <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-850 dark:bg-emerald-950/50 dark:text-emerald-400 font-extrabold uppercase tracking-wider rounded-md">
                                  Quitado
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-semibold mt-1.5">
                              Contratado em {new Date(item.loanDate + 'T00:00:00').toLocaleDateString('pt-BR')} • Amortização: {item.amortizationSystem || 'Price'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-600 cursor-pointer transition-colors"
                              title="Editar contrato"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteConsignado(item.id)}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-600 cursor-pointer transition-colors"
                              title="Excluir contrato"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Demonstrativo Contábil */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Valor Financiado</span>
                            <span className="font-black text-zinc-700 dark:text-zinc-300">R$ {item.borrowedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            {item.releasedAmount !== undefined && item.releasedAmount !== item.borrowedAmount && (
                              <span className="text-[9px] text-zinc-400 block font-bold">Líquido: R$ {item.releasedAmount.toLocaleString('pt-BR')}</span>
                            )}
                          </div>

                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Total Pago</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {item.totalPaidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[9px] text-emerald-500 block font-bold">Amortizado: R$ {item.totalPaidAmortization.toLocaleString('pt-BR')}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Juros Pagos</span>
                            <span className="font-black text-amber-600 dark:text-amber-500">R$ {item.totalPaidInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[9px] text-zinc-400 block font-medium">Restante: R$ {item.totalRemainingInterest.toLocaleString('pt-BR')}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Saldo Devedor Residual</span>
                            <span className="font-black text-rose-600 dark:text-rose-400">R$ {item.totalRemainingAmortization.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[9px] text-zinc-400 block font-medium">Contrato original: R$ {item.initialContractValue.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>

                        {/* Barra de Progresso e Parcelas */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
                            <span>Progresso Geral ({item.paidInstallmentsCount} de {item.totalInstallments} parcelas)</span>
                            <span>{item.percentPaid.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all" 
                              style={{ width: `${item.percentPaid}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[9px] text-zinc-400 font-bold">
                            <span>Prestação média: R$ {item.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span>Taxa contratada: {item.interestRate}% a.m. {item.interestRateYearly ? `(${item.interestRateYearly}% a.a.)` : ''}</span>
                          </div>
                        </div>

                        {/* Botão para Expandir Detalhes / Amortização */}
                        <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-850 flex justify-between items-center">
                          <button
                            onClick={() => setExpandedLoanId(isExpanded ? null : item.id)}
                            className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Ocultar Tabela de Parcelas
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Visualizar Tabela de Parcelas (Amortização)
                              </>
                            )}
                          </button>
                          
                          {item.cetRate !== undefined && (
                            <span className="text-[10px] text-zinc-400 font-extrabold uppercase">
                              CET: {item.cetRate}% a.a.
                            </span>
                          )}
                        </div>

                        {/* TABELA ANALÍTICA DE PARCELAS */}
                        {isExpanded && (
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mt-2 space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                              <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" /> Cronograma de Amortização de Prestações
                              </p>
                              <span className="text-[9px] text-zinc-400 font-bold">SAC / Price recalcula saldo após amortizações</span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-black uppercase text-[9px] tracking-wider">
                                    <th className="py-1.5 px-2">Nº</th>
                                    <th className="py-1.5 px-2">Vencimento</th>
                                    <th className="py-1.5 px-2 text-right">Valor Parcela</th>
                                    <th className="py-1.5 px-2 text-right">Juros</th>
                                    <th className="py-1.5 px-2 text-right">Amortização</th>
                                    <th className="py-1.5 px-2 text-right">Saldo Devedor</th>
                                    <th className="py-1.5 px-2 text-center">Status</th>
                                    <th className="py-1.5 px-2 text-center">Ação</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.schedule.map(row => (
                                    <tr 
                                      key={row.number}
                                      className={`border-b border-zinc-50 dark:border-zinc-850/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 ${
                                        row.isPaid ? 'text-zinc-400' : ''
                                      }`}
                                    >
                                      <td className="py-2 px-2 font-black">{row.number}</td>
                                      <td className="py-2 px-2 font-medium">{new Date(row.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                      <td className="py-2 px-2 text-right font-bold text-zinc-700 dark:text-zinc-300">R$ {row.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-500 font-medium">R$ {row.interestValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-500 font-medium">R$ {row.amortizationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2 px-2 text-right font-bold">R$ {row.endingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2 px-2 text-center">
                                        {row.isPaid ? (
                                          <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold rounded">PAGO</span>
                                        ) : row.dueDate < todayStr ? (
                                          <span className="text-[8px] px-1.5 py-0.5 bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-400 font-bold rounded">ATRASADO</span>
                                        ) : (
                                          <span className="text-[8px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold rounded">ABERTO</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-1 text-center">
                                        <button
                                          onClick={() => handleToggleInstallmentPaid(item, row.number)}
                                          className={`p-1 px-2.5 text-[9px] font-black rounded-lg cursor-pointer transition-colors ${
                                            row.isPaid
                                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-rose-100 hover:text-rose-600'
                                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                          }`}
                                        >
                                          {row.isPaid ? 'Desfazer' : 'Pagar'}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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

          {/* LADO DIREITO: FORMULÁRIO DE CADASTRO */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-3">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Landmark className="w-4 h-4 text-indigo-600" />
                {editingId ? 'Editar Contrato' : 'Novo Contrato Consignado'}
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

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Instituição Credora</label>
                <select
                  value={formBank}
                  onChange={(e) => setFormBank(e.target.value)}
                  id="select-con-bank"
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Nº do Contrato</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: BB-12345"
                    value={formContract}
                    onChange={(e) => setFormContract(e.target.value)}
                    id="input-con-contract"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Tipo do Empréstimo</label>
                  <select
                    value={formLoanType}
                    onChange={(e) => setFormLoanType(e.target.value)}
                    id="select-con-loantype"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                  >
                    <option value="Consignado Público">Consignado Público</option>
                    <option value="Consignado INSS">Consignado INSS</option>
                    <option value="Consignado Privado">Consignado Privado</option>
                    <option value="Consignado Militar">Consignado Militar</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Valor Financiado (PV)</label>
                  <input
                    required
                    type="number"
                    placeholder="0.00"
                    value={formBorrowed}
                    onChange={(e) => setFormBorrowed(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-con-borrowed"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Valor Liberado (Líquido)</label>
                  <input
                    type="number"
                    placeholder="Opcional (Líquido)"
                    value={formReleasedAmount}
                    onChange={(e) => setFormReleasedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-con-released"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Juros ao Mês (% a.m.)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1.8"
                    value={formInterest}
                    onChange={(e) => setFormInterest(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-con-interest"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Juros ao Ano (% a.a.)</label>
                  <input
                    disabled
                    type="number"
                    placeholder="Sincronizado"
                    value={formInterestYearly}
                    id="input-con-interest-yearly"
                    className="w-full p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Amortização</label>
                  <select
                    value={formAmortizationSystem}
                    onChange={(e) => setFormAmortizationSystem(e.target.value as any)}
                    id="select-con-amort"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                  >
                    <option value="Price">Tabela Price</option>
                    <option value="SAC">SAC</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Custo Efetivo (CET %)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 24.50"
                    value={formCetRate}
                    onChange={(e) => setFormCetRate(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-con-cet"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Parcelas</label>
                  <input
                    required
                    type="number"
                    placeholder="Ex: 48"
                    value={formTotalInst}
                    onChange={(e) => setFormTotalInst(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-con-totalinst"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Valor da Parcela (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="Calculado"
                    value={formInstValue}
                    onChange={(e) => setFormInstValue(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-con-instvalue"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-black text-rose-600 dark:text-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Data Contratação</label>
                  <input
                    required
                    type="date"
                    value={formLoanDate}
                    onChange={(e) => setFormLoanDate(e.target.value)}
                    id="input-con-loandate"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Primeiro Vencimento</label>
                  <input
                    required
                    type="date"
                    value={formFirstPayDate}
                    onChange={(e) => setFormFirstPayDate(e.target.value)}
                    id="input-con-firstpay"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Dia do Vencimento</label>
                  <input
                    disabled
                    type="number"
                    placeholder="Sincronizado"
                    value={formDueDay}
                    id="input-con-dueday"
                    className="w-full p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 focus:outline-hidden font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    checked={formIsPaid}
                    onChange={(e) => setFormIsPaid(e.target.checked)}
                    id="checkbox-con-paid"
                    className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer"
                  />
                  <label htmlFor="checkbox-con-paid" className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold select-none cursor-pointer">
                    Quitado Integralmente
                  </label>
                </div>
              </div>

              <button
                type="submit"
                id="btn-con-save"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer mt-2"
              >
                {editingId ? (
                  <>
                    <Check className="w-4 h-4" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Cadastrar Empréstimo
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ABA 2: SIMULAÇÃO E REGISTRO DE QUITAÇÃO ANTECIPADA */}
      {activeTab === 'simulation' && (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-500" />
              Simulador Contábil de Quitação Antecipada
            </h3>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Selecione o contrato e a data em que pretende simular a liquidação antecipada do saldo residual. O sistema remove os juros não transcorridos e calcula o valor real de liquidação e a sua economia líquida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 text-xs font-semibold">
            <div>
              <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5">Escolha o Empréstimo Ativo</label>
              <select
                value={simLoanId}
                onChange={(e) => setSimLoanId(e.target.value)}
                id="select-sim-loan"
                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden"
              >
                <option value="">-- Selecione o Empréstimo --</option>
                {consignadosCalculated
                  .filter(c => !c.isPaid)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.bank} - Contrato: {c.contractNumber} (Saldo: R$ {c.totalRemainingAmortization.toLocaleString('pt-BR')})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5">Data Desejada para Liquidação</label>
              <input
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                id="input-sim-date"
                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden font-bold"
              />
            </div>

            <div className="flex items-end">
              <div className="w-full flex items-center gap-1.5 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Nas quitações, as parcelas pós-quitação têm seus juros cancelados, pagando-se apenas a amortização pendente.</span>
              </div>
            </div>
          </div>

          {!selectedSimLoan ? (
            <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 font-medium">
              <Landmark className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
              <p className="text-xs">Por favor, selecione um empréstimo em aberto para simular.</p>
            </div>
          ) : simulationResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* TABELA COMPARATIVA DE CÁLCULO DE LIQUIDAÇÃO */}
              <div className="lg:col-span-2 space-y-4">
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-zinc-950">
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Demonstrativo e Comparativo de Quitação</h4>
                  </div>
                  
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-850 text-xs font-semibold">
                    <div className="flex justify-between p-3">
                      <span className="text-zinc-500">Valor originalmente financiado (PV)</span>
                      <span className="font-black text-zinc-800 dark:text-zinc-200">R$ {simulationResult.borrowedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between p-3">
                      <span className="text-zinc-500">Juros contratados originais</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">R$ {simulationResult.totalOriginalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between p-3 bg-zinc-50/30 dark:bg-zinc-900/10">
                      <span className="text-zinc-500">Juros já pagos até a data selecionada</span>
                      <span className="font-bold text-amber-600 dark:text-amber-500">R$ {simulationResult.interestPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between p-3 bg-emerald-50/20 dark:bg-emerald-950/5">
                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                        Juros futuros cancelados (Economia Obtida)
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {simulationResult.interestDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between p-3">
                      <span className="text-zinc-500">Amortização já realizada</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">R$ {simulationResult.amortizationPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between p-3">
                      <span className="text-zinc-500">Dívida bruta restante antes do recálculo</span>
                      <span className="font-bold text-zinc-500 line-through">R$ {simulationResult.previousTotalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between p-4 bg-indigo-50/10 dark:bg-indigo-950/5 border-t-2 border-indigo-500">
                      <span className="text-indigo-800 dark:text-indigo-300 font-black text-sm">VALOR LÍQUIDO PARA QUITAÇÃO NESTA DATA</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">R$ {simulationResult.amortizationPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAINEL DE INFORMAÇÕES ADICIONAIS & BOTÃO DE EFETIVAÇÃO */}
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/40 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black mb-2">
                      <PiggyBank className="w-5 h-5 text-emerald-500" />
                      <span>Excelente Oportunidade de Economia!</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold leading-relaxed">
                      Ao efetuar a liquidação antecipada do contrato na data de <strong className="font-black">{new Date(simDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>, você economizará o valor de <strong className="font-black text-emerald-800 dark:text-emerald-300">R$ {simulationResult.economyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> correspondente aos juros de parcelas futuras que deixarão de existir.
                    </p>
                  </div>

                  <div className="mt-6 border-t border-emerald-200 dark:border-emerald-900/40 pt-4 space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Custo Contratado original:</span>
                      <span>R$ {simulationResult.initialContractValue.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                      <span>Custo final com quitação hoje:</span>
                      <span>R$ {(simulationResult.paidValue + simulationResult.amortizationPending).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/35 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Liquidar e Quitar Contrato
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-semibold leading-normal">
                    Se você já efetuou o pagamento do saldo líquido de quitação junto ao banco, clique no botão abaixo para dar baixa definitiva neste empréstimo consignado no sistema.
                  </p>

                  <button
                    onClick={handleRegisterSettlement}
                    id="btn-register-settlement"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-4.5 h-4.5" />
                    Quitar Empréstimo Definitivamente
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ABA 3: HISTÓRICO DE LIQUIDAÇÕES */}
      {activeTab === 'settlements' && (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Histórico de Liquidações Antecipadas
            </h3>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Registro cronológico de todas as quitações integrais antecipadas realizadas nos seus empréstimos, com demonstrativo de economia líquida e juros mitigados.
            </p>
          </div>

          <div className="overflow-x-auto">
            {settlementHistoryList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl text-zinc-400 font-medium">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="text-xs">Nenhum registro de quitação antecipada foi encontrado.</p>
                <p className="text-[10px] text-zinc-400 mt-1">Simule e quite contratos na aba ao lado para gerar este histórico.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Data Quitação</th>
                    <th className="py-2.5 px-3">Banco / Contrato</th>
                    <th className="py-2.5 px-3 text-right">Amortização Anterior</th>
                    <th className="py-2.5 px-3 text-right">Valor Líquido Pago</th>
                    <th className="py-2.5 px-3 text-right">Juros Mitigados (Economia)</th>
                    <th className="py-2.5 px-3 text-right">Juros Pagos</th>
                    <th className="py-2.5 px-3 text-center font-bold">Situação Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                  {settlementHistoryList.map((settle, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20">
                      <td className="py-3 px-3 font-bold text-zinc-700 dark:text-zinc-200">
                        {new Date(settle.settlementDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-black text-zinc-800 dark:text-zinc-100">{settle.bank}</div>
                        <span className="text-[10px] text-zinc-400">Contrato: {settle.contractNumber}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-500">
                        R$ {settle.previousDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                        R$ {settle.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-black">
                        R$ {settle.economyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-600">
                        R$ {settle.interestPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-black uppercase tracking-wide rounded-full">
                          CONTRATO ENCERRADO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: RELATÓRIOS E ANÁLISE */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Análise e Indicadores de Juros e Amortização
              </h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                Acompanhe o balanço geral entre amortização e custos financeiros. Veja a economia consolidada obtida por meio de liquidações antecipadas de contratos de folha.
              </p>
            </div>

            {/* BENTO GRID DE RELATÓRIO FINANCEIRO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              
              {/* STAT CARD 1: CUSTO TOTAL VS EFETIVO */}
              <div className="border border-zinc-150 dark:border-zinc-850 p-4 rounded-xl space-y-3 bg-zinc-50/20 dark:bg-zinc-900/10">
                <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Eficiência de Pagamento</h4>
                
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total originalmente contratado:</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      R$ {consignadosCalculated.reduce((sum, c) => sum + c.initialContractValue, 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total pago de juros:</span>
                    <span className="font-bold text-amber-600">
                      R$ {consolidatedMetrics.totalPaid}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 font-bold">
                    <span className="text-zinc-500">Economia real obtida:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      R$ {consolidatedMetrics.totalInterestSaved.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* STAT CARD 2: CUMULATIVE AMORTIZATION */}
              <div className="border border-zinc-150 dark:border-zinc-850 p-4 rounded-xl space-y-3 bg-zinc-50/20 dark:bg-zinc-900/10">
                <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Amortização Acumulada</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-zinc-400">Total amortizado:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      R$ {consignadosCalculated.reduce((sum, c) => sum + c.totalPaidAmortization, 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Empréstimo original (Principal):</span>
                    <span className="font-bold">R$ {consolidatedMetrics.totalBorrowed.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ 
                        width: `${consolidatedMetrics.totalBorrowed > 0 
                          ? (consignadosCalculated.reduce((sum, c) => sum + c.totalPaidAmortization, 0) / consolidatedMetrics.totalBorrowed) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* STAT CARD 3: RATIO ACTIVE VS SETTLED */}
              <div className="border border-zinc-150 dark:border-zinc-850 p-4 rounded-xl space-y-3 bg-zinc-50/20 dark:bg-zinc-900/10 flex flex-col justify-between">
                <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Situação dos Contratos</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="text-left">
                    <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Ativos em aberto</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{consolidatedMetrics.activeLoansCount}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Liquidados</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{consolidatedMetrics.settledLoansCount}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* GRÁFICOS VISUAIS CUSTOMIZADOS USANDO ELEMENTOS SVG RESPONSIVOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              
              {/* GRÁFICO 1: COMPARATIVO VALOR CONTRATADO VS VALOR EFETIVAMENTE PAGO */}
              <div className="border border-zinc-150 dark:border-zinc-850 p-5 rounded-xl bg-white dark:bg-zinc-950/50 space-y-3">
                <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Comparativo: Custo Contratado original vs Efetivo Pago + Líquido</h4>
                <p className="text-[10px] text-zinc-400 font-medium">Demonstração visual do valor que seria pago na integralidade original do contrato vs. o valor pago em virtude de quitações e pagamentos proporcionais.</p>
                
                {consignadosCalculated.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">Sem dados para exibição do gráfico</div>
                ) : (
                  <div className="w-full flex justify-center py-2">
                    <svg viewBox="0 0 450 180" className="w-full max-w-md">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="430" y2="20" stroke="#f1f5f9" className="dark:stroke-zinc-800/40" strokeDasharray="3,3" />
                      <line x1="40" y1="70" x2="430" y2="70" stroke="#f1f5f9" className="dark:stroke-zinc-800/40" strokeDasharray="3,3" />
                      <line x1="40" y1="120" x2="430" y2="120" stroke="#f1f5f9" className="dark:stroke-zinc-800/40" strokeDasharray="3,3" />
                      <line x1="40" y1="140" x2="430" y2="140" stroke="#e2e8f0" className="dark:stroke-zinc-800" />

                      {/* Bar 1: Contratado original (R$ 100% size) */}
                      <rect x="100" y="30" width="60" height="110" rx="4" fill="#6366f1" className="opacity-80" />
                      {/* Label Bar 1 */}
                      <text x="130" y="155" textAnchor="middle" className="text-[10px] font-bold fill-zinc-400">Original</text>
                      <text x="130" y="25" textAnchor="middle" className="text-[9px] font-black fill-indigo-600 dark:fill-indigo-400">
                        R$ {consignadosCalculated.reduce((sum, c) => sum + c.initialContractValue, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </text>

                      {/* Bar 2: Pago Efetivo + Líquido de Quitação (Menor tamanho caso haja desconto) */}
                      {(() => {
                        const original = consignadosCalculated.reduce((sum, c) => sum + c.initialContractValue, 0);
                        const economy = consolidatedMetrics.totalInterestSaved;
                        const effective = Math.max(0, original - economy);
                        const height = original > 0 ? (effective / original) * 110 : 0;
                        const y = 140 - height;

                        return (
                          <>
                            <rect x="290" y={y} width="60" height={height} rx="4" fill="#10b981" className="opacity-80" />
                            <text x="320" y="155" textAnchor="middle" className="text-[10px] font-bold fill-zinc-400">Pago Efetivo</text>
                            <text x="320" y={y - 5} textAnchor="middle" className="text-[9px] font-black fill-emerald-600 dark:fill-emerald-400">
                              R$ {effective.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </text>
                            {economy > 0 && (
                              <text x="320" y="80" textAnchor="middle" className="text-[9px] font-black fill-white bg-black p-1 rounded">
                                Pou Pou R$ {economy.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}!
                              </text>
                            )}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>

              {/* GRÁFICO 2: EVOLUÇÃO E DECAIMENTO DO SALDO DEVEDOR */}
              <div className="border border-zinc-150 dark:border-zinc-850 p-5 rounded-xl bg-white dark:bg-zinc-950/50 space-y-3">
                <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Previsão: Curva de Decaimento de Dívida Consolidada</h4>
                <p className="text-[10px] text-zinc-400 font-medium">Projeção visual do declínio do saldo devedor consolidado na medida em que as amortizações das parcelas ocorrem ao longo do tempo.</p>
                
                {consignadosCalculated.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">Sem dados para exibição do gráfico</div>
                ) : (
                  <div className="w-full flex justify-center py-2">
                    <svg viewBox="0 0 450 180" className="w-full max-w-md">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="430" y2="20" stroke="#f1f5f9" className="dark:stroke-zinc-800/20" strokeDasharray="3,3" />
                      <line x1="40" y1="60" x2="430" y2="60" stroke="#f1f5f9" className="dark:stroke-zinc-800/20" strokeDasharray="3,3" />
                      <line x1="40" y1="100" x2="430" y2="100" stroke="#f1f5f9" className="dark:stroke-zinc-800/20" strokeDasharray="3,3" />
                      <line x1="40" y1="140" x2="430" y2="140" stroke="#e2e8f0" className="dark:stroke-zinc-800" />

                      {/* Area Curve representing debt reduction over 5 mock timeline steps */}
                      <path
                        d={`M 60 40 L 140 60 L 220 85 L 300 115 L 380 140 L 380 140 L 60 140 Z`}
                        fill="#6366f1"
                        className="opacity-15"
                      />
                      <path
                        d={`M 60 40 L 140 60 L 220 85 L 300 115 L 380 140`}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                      />

                      {/* Dots on Curve */}
                      <circle cx="60" cy="40" r="4" fill="#4f46e5" />
                      <circle cx="140" cy="60" r="4" fill="#4f46e5" />
                      <circle cx="220" cy="85" r="4" fill="#4f46e5" />
                      <circle cx="300" cy="115" r="4" fill="#4f46e5" />
                      <circle cx="380" cy="140" r="4" fill="#4f46e5" />

                      {/* Labels X Axis */}
                      <text x="60" y="155" textAnchor="middle" className="text-[8px] font-bold fill-zinc-400">Atual</text>
                      <text x="140" y="155" textAnchor="middle" className="text-[8px] font-bold fill-zinc-400">Step 1</text>
                      <text x="220" y="155" textAnchor="middle" className="text-[8px] font-bold fill-zinc-400">Step 2</text>
                      <text x="300" y="155" textAnchor="middle" className="text-[8px] font-bold fill-zinc-400">Step 3</text>
                      <text x="380" y="155" textAnchor="middle" className="text-[8px] font-bold fill-zinc-400">Fim</text>

                      {/* Balance indicators */}
                      <text x="65" y="32" className="text-[8px] font-black fill-zinc-500">
                        R$ {consolidatedMetrics.totalRemainingAmort.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </text>
                    </svg>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
