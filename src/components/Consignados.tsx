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
  CheckSquare, HelpCircle, Activity, PiggyBank, Search, Maximize2, Download, Printer, Eye,
  SlidersHorizontal, CheckCheck
} from 'lucide-react';

// Formatação segura de datas sem gerar exceções Invalid Date
export const safeFormatDate = (dateStr?: string, fallback = '—'): string => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return fallback;
  try {
    const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr || fallback;
  }
};

// Helper de vencimento de parcelas (1-indexado)
const calculateInstallmentDueDate = (firstPaymentDateStr: string, instIndex: number): string => {
  if (!firstPaymentDateStr || typeof firstPaymentDateStr !== 'string') return '';
  try {
    const cleanStr = firstPaymentDateStr.includes('T') ? firstPaymentDateStr : `${firstPaymentDateStr}T00:00:00`;
    const firstDate = new Date(cleanStr);
    if (isNaN(firstDate.getTime())) return '';
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
  } catch {
    return '';
  }
};

export interface AmortizationRow {
  number: number;
  dueDate: string;
  installmentValue: number;
  interestValue: number;
  amortizationValue: number;
  endingBalance: number;
  totalPaid: number; // Valor acumulado de prestações pagas até a parcela k
  isPaid: boolean;
  paymentDate?: string;
}

// Função de cálculo de amortização conforme Tabela Price, SAC ou Personalizado
export function calculateAmortizationSchedule(
  borrowedAmount: number,
  interestRateMonthly: number,
  totalInstallments: number,
  firstPaymentDateStr: string,
  amortizationSystem: 'Price' | 'SAC' | 'Personalizado' = 'Price',
  manualInstallmentValue: number = 0,
  paidInstallmentsList: number[] = [],
  paymentConfirmationDates: Record<number, string> = {}
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  const borrowed = Number(borrowedAmount) || 0;
  const n = Number(totalInstallments) || 0;
  const rate = (Number(interestRateMonthly) || 0) / 100;

  if (borrowed <= 0 || n <= 0) {
    return schedule;
  }

  let balance = borrowed;

  let pmt = 0;
  if (amortizationSystem === 'Price') {
    if (manualInstallmentValue && manualInstallmentValue > 0) {
      pmt = manualInstallmentValue;
    } else if (rate > 0) {
      pmt = borrowed * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    } else {
      pmt = borrowed / n;
    }
  }

  let cumulativePaid = 0;

  for (let k = 1; k <= n; k++) {
    const dueDate = calculateInstallmentDueDate(firstPaymentDateStr, k);
    let instVal = 0;
    let intVal = 0;
    let amortVal = 0;

    if (amortizationSystem === 'SAC') {
      amortVal = borrowed / n;
      intVal = balance * rate;
      instVal = amortVal + intVal;
    } else if (amortizationSystem === 'Price') {
      instVal = pmt;
      intVal = balance * rate;
      amortVal = instVal - intVal;
      if (amortVal < 0) amortVal = 0;
    } else {
      // Personalizado
      instVal = (manualInstallmentValue && manualInstallmentValue > 0) ? manualInstallmentValue : (borrowed / n);
      intVal = balance * rate;
      amortVal = instVal - intVal;
      if (amortVal < 0) amortVal = 0;
    }

    // Ajuste no último período ou quando o saldo restante for irrelevante
    if (k === n || (balance - amortVal) < 0.05) {
      amortVal = balance;
      instVal = amortVal + intVal;
      balance = 0;
    } else {
      balance = balance - amortVal;
    }

    cumulativePaid += instVal;

    schedule.push({
      number: k,
      dueDate,
      installmentValue: instVal,
      interestValue: intVal,
      amortizationValue: amortVal,
      endingBalance: Math.max(0, balance),
      totalPaid: cumulativePaid,
      isPaid: paidInstallmentsList.includes(k),
      paymentDate: paymentConfirmationDates[k]
    });
  }

  return schedule;
}

interface ConsignadosProps {
  targetBankFilter?: string;
}

export default function Consignados({ targetBankFilter }: ConsignadosProps = {}) {
  const { data, addConsignado, updateConsignado, deleteConsignado, selectedYear, selectedMonth } = useFinancial();

  // Abas de navegação do módulo avançado
  const [activeTab, setActiveTab] = useState<'contracts' | 'simulation' | 'settlements' | 'reports'>('contracts');

  // Controle de alertas e banners de parcelas vencidas
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);

  // Controle de expansão de tabelas de parcelas
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [expandAllTables, setExpandAllTables] = useState(false);

  // Modal para visualização em tela cheia da Tabela de Amortização
  const [scheduleModalLoan, setScheduleModalLoan] = useState<(Consignado & { schedule: AmortizationRow[] }) | null>(null);

  // Filtros de busca de contratos e da tabela de parcelas
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'paid' | 'open' | 'overdue'>('all');

  // Preview em tempo real da tabela de amortização no formulário de cadastro/edição
  const [showFormPreview, setShowFormPreview] = useState(false);

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

  // Data atual para comparações de vencimento (Formato AAAA-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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
      try {
        const d = new Date(formFirstPayDate + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          setFormDueDay(d.getDate());
        }
      } catch {
        // Silencioso
      }
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
    setShowFormPreview(false);
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
    setExpandedLoanId(c.id);
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
      setExpandedLoanId(editingId);
    } else {
      addConsignado(loanData);
      // Auto-expandir o novo contrato
      setTimeout(() => {
        const newlyAdded = data.consignados[data.consignados.length - 1];
        if (newlyAdded) setExpandedLoanId(newlyAdded.id);
      }, 100);
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

  // Marcar todas as parcelas de um empréstimo como pagas
  const handleMarkAllPaid = (c: Consignado) => {
    const allNumbers = Array.from({ length: c.totalInstallments }, (_, i) => i + 1);
    const nextDates: Record<number, string> = {};
    const today = new Date().toISOString().split('T')[0];
    allNumbers.forEach(num => {
      nextDates[num] = c.paymentConfirmationDates?.[num] || today;
    });

    updateConsignado(c.id, {
      paidInstallmentsList: allNumbers,
      isPaid: true,
      paymentConfirmationDates: nextDates
    });
  };

  // --- CONTROLE AUTOMÁTICO DE PAGAMENTOS ---
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
        if (!row.isPaid && row.dueDate && row.dueDate < todayStr) {
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
  }, [data.consignados, todayStr]);

  // Executa o pagamento automático de todas as parcelas vencidas
  const handleAutoPayOverdue = () => {
    overdueInstallments.forEach(item => {
      const c = item.loan;
      const paidList = c.paidInstallmentsList || [];
      if (!paidList.includes(item.instNum)) {
        const nextPaidList = [...paidList, item.instNum];
        const isNowFullyPaid = nextPaidList.length >= c.totalInstallments;
        const nextDates = { ...c.paymentConfirmationDates };
        nextDates[item.instNum] = item.dueDate || todayStr;

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

  // Sincronizar scheduleModalLoan com consignadosCalculated quando dados forem atualizados
  useEffect(() => {
    if (scheduleModalLoan) {
      const updated = consignadosCalculated.find(c => c.id === scheduleModalLoan.id);
      if (updated) {
        setScheduleModalLoan(updated);
      }
    }
  }, [consignadosCalculated]);

  // Efeito ao receber filtro de banco de navegação externa (ex: Dashboard)
  useEffect(() => {
    if (targetBankFilter) {
      const q = targetBankFilter.toLowerCase().trim();
      setContractSearchQuery(targetBankFilter);
      const matching = consignadosCalculated.find(c =>
        c.bank.toLowerCase().includes(q) ||
        c.contractNumber.toLowerCase().includes(q)
      );
      if (matching) {
        setExpandedLoanId(matching.id);
        setScheduleModalLoan(matching);
      }
    }
  }, [targetBankFilter, consignadosCalculated]);

  // Cálculo da tabela de preview para o formulário
  const formPreviewSchedule = useMemo(() => {
    const pv = Number(formBorrowed);
    const r = Number(formInterest);
    const n = Number(formTotalInst);
    const instVal = Number(formInstValue);

    if (pv > 0 && n > 0) {
      return calculateAmortizationSchedule(
        pv,
        r,
        n,
        formFirstPayDate || new Date().toISOString().split('T')[0],
        formAmortizationSystem,
        instVal
      );
    }
    return [];
  }, [formBorrowed, formInterest, formTotalInst, formFirstPayDate, formAmortizationSystem, formInstValue]);

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

  // Distribuição de saldos devedores por Banco
  const bankDashboardList = useMemo(() => {
    const map: Record<string, { remaining: number; total: number; activeCount: number }> = {};

    consignadosCalculated.forEach(c => {
      const bankName = c.bank?.trim() || 'Outros Bancos';
      if (!map[bankName]) {
        map[bankName] = { remaining: 0, total: 0, activeCount: 0 };
      }
      map[bankName].total += c.borrowedAmount;
      if (!c.isPaid) {
        map[bankName].remaining += c.totalRemainingAmortization;
        map[bankName].activeCount += 1;
      }
    });

    return Object.entries(map).map(([bank, stats]) => ({
      bank,
      remaining: stats.remaining,
      total: stats.total,
      activeCount: stats.activeCount
    }));
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
    let amortizationPending = 0;

    schedule.forEach(row => {
      if ((row.dueDate && row.dueDate <= simDate) || row.isPaid) {
        paidValue += row.installmentValue;
        interestPaid += row.interestValue;
        amortizationPaid += row.amortizationValue;
      } else {
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

    setSettlementSuccessMsg(`Quitação do contrato ${selectedSimLoan.contractNumber} (${selectedSimLoan.bank}) registrada com sucesso! Economia de R$ ${simulationResult.economyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    setTimeout(() => setSettlementSuccessMsg(null), 8000);
  };

  // Histórico Consolidado de Quitações
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

  // Função para exportar/imprimir a Tabela de Amortização
  const handleExportScheduleText = (loan: Consignado & { schedule: AmortizationRow[] }) => {
    let text = `CRONOGRAMA DE AMORTIZAÇÃO DE FINANCIAMENTO\n`;
    text += `Instituição: ${loan.bank} | Contrato: ${loan.contractNumber} | Tipo: ${loan.loanType || 'Consignado'}\n`;
    text += `Sistema: ${loan.amortizationSystem || 'Price'} | Valor Financiado: R$ ${loan.borrowedAmount.toFixed(2)} | Taxa: ${loan.interestRate}% a.m.\n`;
    text += `----------------------------------------------------------------------------------------------------------------\n`;
    text += `Nº\tVencimento\tPrestação\tAmortização\tJuros\t\tSaldo Devedor\tTotal Pago\tStatus\n`;
    text += `----------------------------------------------------------------------------------------------------------------\n`;

    loan.schedule.forEach(row => {
      const dateStr = safeFormatDate(row.dueDate);
      const status = row.isPaid ? 'PAGO' : (row.dueDate < todayStr ? 'ATRASADO' : 'EM ABERTO');
      text += `${row.number}\t${dateStr}\tR$ ${row.installmentValue.toFixed(2)}\tR$ ${row.amortizationValue.toFixed(2)}\tR$ ${row.interestValue.toFixed(2)}\tR$ ${row.endingBalance.toFixed(2)}\tR$ ${row.totalPaid.toFixed(2)}\t${status}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tabela_amortizacao_${loan.bank.replace(/\s+/g, '_')}_${loan.contractNumber}.txt`;
    link.click();
  };

  return (
    <div id="consignados-advanced-panel" className="space-y-6 animate-fade-in text-zinc-800 dark:text-zinc-200">
      
      {/* BANNER DE PARCELAS VENCIDAS */}
      {overdueInstallments.length > 0 && showOverdueAlert && (
        <div id="overdue-payment-alert" className="bg-amber-50 border-l-4 border-amber-500 dark:bg-amber-950/20 dark:border-amber-500 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
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
                    • Parcela {x.instNum} de {x.loan.bank} ({x.loan.contractNumber}) - Venceu em {safeFormatDate(x.dueDate)} (R$ {x.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleAutoPayOverdue}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
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
        {bankDashboardList.map(b => (
          <div
            key={b.bank}
            onClick={() => {
              setContractSearchQuery(b.bank);
              const matching = consignadosCalculated.find(c => c.bank.toLowerCase().includes(b.bank.toLowerCase()));
              if (matching) {
                setExpandedLoanId(matching.id);
                setScheduleModalLoan(matching);
              }
            }}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col justify-between min-h-[90px] hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group"
            title={`Clique para ver o Cronograma Completo de Amortização de ${b.bank}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 uppercase tracking-wider block truncate">{b.bank}</span>
              <CalendarDays className="w-3.5 h-3.5 text-zinc-300 group-hover:text-indigo-500 shrink-0" />
            </div>
            <div className="mt-1">
              <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                R$ {b.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[9px] text-zinc-400 font-medium">
                {b.activeCount > 0 ? `${b.activeCount} contrato(s) ativo(s)` : 'Quitado'}
              </p>
            </div>
          </div>
        ))}

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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-850">
                <div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Meus Empréstimos Consignados</h3>
                  <p className="text-xs text-zinc-500 font-medium">Controle de saldos ativos, histórico de parcelas pagas e cronograma de amortização.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                  {/* Busca por Banco ou Contrato */}
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filtrar por banco/contrato..."
                      value={contractSearchQuery}
                      onChange={(e) => setContractSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-semibold focus:outline-hidden"
                    />
                    {contractSearchQuery && (
                      <button
                        onClick={() => setContractSearchQuery('')}
                        className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {consignadosCalculated.length > 0 && (
                    <button
                      onClick={() => setExpandAllTables(!expandAllTables)}
                      className="text-[10px] px-2.5 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold rounded-lg border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {expandAllTables ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {expandAllTables ? 'Recolher Todas' : 'Expandir Tabelas'}
                    </button>
                  )}
                  <span className="text-[10px] px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-bold rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0">
                    Total: {consignadosCalculated.length}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {consignadosCalculated.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-zinc-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                    <p className="text-xs font-semibold">Nenhum consignado cadastrado</p>
                    <p className="text-[10px] mt-0.5">Use o formulário lateral para cadastrar seu primeiro empréstimo de folha.</p>
                  </div>
                ) : (
                  consignadosCalculated
                    .filter(item => {
                      if (!contractSearchQuery.trim()) return true;
                      const q = contractSearchQuery.toLowerCase().trim();
                      return (
                        item.bank.toLowerCase().includes(q) ||
                        item.contractNumber.toLowerCase().includes(q) ||
                        (item.loanType && item.loanType.toLowerCase().includes(q))
                      );
                    })
                    .map(item => {
                      const isExpanded = expandAllTables || expandedLoanId === item.id;
                      
                      // Aplicar filtros internos da tabela de amortização
                      const filteredSchedule = item.schedule.filter(row => {
                        // Filtro de status
                        if (tableStatusFilter === 'paid' && !row.isPaid) return false;
                        if (tableStatusFilter === 'open' && (row.isPaid || (row.dueDate && row.dueDate < todayStr))) return false;
                        if (tableStatusFilter === 'overdue' && (row.isPaid || !row.dueDate || row.dueDate >= todayStr)) return false;

                        // Filtro de busca por texto (número da parcela ou data)
                        if (tableSearchQuery.trim()) {
                          const q = tableSearchQuery.toLowerCase().trim();
                          const numMatch = row.number.toString().includes(q);
                          const dateFormatted = safeFormatDate(row.dueDate).toLowerCase();
                          const dateMatch = dateFormatted.includes(q) || row.dueDate.includes(q);
                          const valMatch = row.installmentValue.toString().includes(q);
                          if (!numMatch && !dateMatch && !valMatch) return false;
                        }

                        return true;
                      });

                      // Totais do rodapé da tabela
                      const sumInstallments = item.schedule.reduce((acc, r) => acc + r.installmentValue, 0);
                      const sumAmortization = item.schedule.reduce((acc, r) => acc + r.amortizationValue, 0);
                      const sumInterest = item.schedule.reduce((acc, r) => acc + r.interestValue, 0);

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
                                <span 
                                  onClick={() => setScheduleModalLoan(item)}
                                  className="text-xs font-black text-zinc-800 dark:text-zinc-100 hover:text-indigo-600 cursor-pointer underline decoration-indigo-300"
                                  title="Clique para abrir o Cronograma Completo"
                                >
                                  {item.bank}
                                </span>
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
                                Contratado em {safeFormatDate(item.loanDate)} • Sistema: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{item.amortizationSystem || 'Price'}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setScheduleModalLoan(item)}
                                className="px-2.5 py-1 text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer flex items-center gap-1"
                                title="Abrir Cronograma Completo em Tela Cheia"
                              >
                                <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Cronograma Completo</span>
                              </button>
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
                              <span className="text-[9px] text-zinc-400 block font-bold">Líquido: R$ {item.releasedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            )}
                          </div>

                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Total Pago</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {item.totalPaidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[9px] text-emerald-500 block font-bold">Amortizado: R$ {item.totalPaidAmortization.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Juros Pagos</span>
                            <span className="font-black text-amber-600 dark:text-amber-500">R$ {item.totalPaidInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[9px] text-zinc-400 block font-medium">Restante: R$ {item.totalRemainingInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Valor Presente</span>
                            <span className="font-black text-rose-600 dark:text-rose-400">R$ {item.totalRemainingAmortization.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[9px] text-zinc-400 block font-medium">Contrato original: R$ {item.initialContractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                            <span>Prestação: R$ {item.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span>Taxa contratada: {item.interestRate}% a.m. {item.interestRateYearly ? `(${item.interestRateYearly}% a.a.)` : ''}</span>
                          </div>
                        </div>

                        {/* Botão para Acessar Tabela / Amortização */}
                        <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-850 flex justify-between items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setScheduleModalLoan(item)}
                              className="flex items-center gap-1.5 text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 cursor-pointer bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                              title="Abrir Tabela de Amortização em Tela Cheia / Exportar / Imprimir"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              Cronograma Completo (Tela Cheia)
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {item.paidInstallmentsCount < item.totalInstallments && (
                              <button
                                onClick={() => handleMarkAllPaid(item)}
                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <CheckCheck className="w-3.5 h-3.5" /> Quitar Todas
                              </button>
                            )}
                            {item.cetRate !== undefined && (
                              <span className="text-[10px] text-zinc-400 font-extrabold uppercase">
                                CET: {item.cetRate}% a.a.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* TABELA ANALÍTICA DE PARCELAS */}
                        {isExpanded && (
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mt-2 space-y-3 shadow-xs">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                              <div>
                                <p className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <CalendarDays className="w-4 h-4" /> Cronograma Completo de Amortização de Prestações
                                </p>
                                <p className="text-[10px] text-zinc-400 font-medium">Sistema {item.amortizationSystem || 'Price'}: Cálculo automático de amortização, juros, saldo devedor e acumulado pago.</p>
                              </div>

                              {/* Filtros da Tabela */}
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-36">
                                  <Search className="w-3 h-3 absolute left-2 top-2.5 text-zinc-400" />
                                  <input
                                    type="text"
                                    placeholder="Buscar nº/data..."
                                    value={tableSearchQuery}
                                    onChange={(e) => setTableSearchQuery(e.target.value)}
                                    className="w-full pl-6 pr-2 py-1 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-semibold focus:outline-hidden"
                                  />
                                </div>
                                <select
                                  value={tableStatusFilter}
                                  onChange={(e) => setTableStatusFilter(e.target.value as any)}
                                  className="text-[10px] p-1 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold focus:outline-hidden"
                                >
                                  <option value="all">Todas ({item.totalInstallments})</option>
                                  <option value="open">Em Aberto</option>
                                  <option value="paid">Pagas ({item.paidInstallmentsCount})</option>
                                  <option value="overdue">Atrasadas</option>
                                </select>
                              </div>
                            </div>

                            <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800/90 backdrop-blur-xs z-10">
                                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300 font-black uppercase text-[9px] tracking-wider">
                                    <th className="py-2 px-2 text-center">Nº</th>
                                    <th className="py-2 px-2">Vencimento</th>
                                    <th className="py-2 px-2 text-right">Valor Prestação</th>
                                    <th className="py-2 px-2 text-right">Amortização</th>
                                    <th className="py-2 px-2 text-right">Juros</th>
                                    <th className="py-2 px-2 text-right">Saldo Devedor</th>
                                    <th className="py-2 px-2 text-right text-indigo-600 dark:text-indigo-400">Total Pago</th>
                                    <th className="py-2 px-2 text-center">Status</th>
                                    <th className="py-2 px-2 text-center">Ação</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                                  {filteredSchedule.length === 0 ? (
                                    <tr>
                                      <td colSpan={9} className="py-6 text-center text-zinc-400 font-medium">
                                        Nenhuma parcela encontrada com os filtros selecionados.
                                      </td>
                                    </tr>
                                  ) : (
                                    filteredSchedule.map(row => (
                                      <tr 
                                        key={row.number}
                                        className={`border-b border-zinc-50 dark:border-zinc-850/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 ${
                                          row.isPaid ? 'bg-emerald-50/20 dark:bg-emerald-950/10 text-zinc-400' : ''
                                        }`}
                                      >
                                        <td className="py-2 px-2 text-center font-black">{row.number}</td>
                                        <td className="py-2 px-2 font-medium">{safeFormatDate(row.dueDate)}</td>
                                        <td className="py-2 px-2 text-right font-bold text-zinc-700 dark:text-zinc-300">
                                          R$ {row.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-500 font-medium">
                                          R$ {row.amortizationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-500 font-medium">
                                          R$ {row.interestValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-2 text-right font-bold">
                                          R$ {row.endingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                          R$ {row.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                          {row.isPaid ? (
                                            <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400 font-black rounded">PAGO</span>
                                          ) : (row.dueDate && row.dueDate < todayStr) ? (
                                            <span className="text-[8px] px-1.5 py-0.5 bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-400 font-black rounded">ATRASADO</span>
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
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                            }`}
                                          >
                                            {row.isPaid ? 'Desfazer' : 'Pagar'}
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                                <tfoot className="sticky bottom-0 bg-zinc-100 dark:bg-zinc-850 border-t-2 border-zinc-200 dark:border-zinc-700 font-black text-[10px]">
                                  <tr>
                                    <td colSpan={2} className="py-2 px-2 uppercase text-zinc-500">Totais do Financiamento:</td>
                                    <td className="py-2 px-2 text-right text-zinc-800 dark:text-zinc-200">
                                      R$ {sumInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">
                                      R$ {sumAmortization.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-500">
                                      R$ {sumInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2 px-2 text-right text-zinc-400">—</td>
                                    <td className="py-2 px-2 text-right text-indigo-600 dark:text-indigo-400">
                                      R$ {sumInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan={2} className="py-2 px-2 text-center text-zinc-400 font-normal">
                                      {item.paidInstallmentsCount}/{item.totalInstallments} pagas
                                    </td>
                                  </tr>
                                </tfoot>
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

          {/* LADO DIREITO: FORMULÁRIO DE CADASTRO E PRÉ-VISUALIZAÇÃO */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-3">
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

            <form onSubmit={handleSave} className="space-y-3.5 text-xs font-semibold">
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
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
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
                  <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">Sistema Amortização</label>
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

              {/* Botão de Pré-visualização da Tabela */}
              {formPreviewSchedule.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFormPreview(!showFormPreview)}
                  className="w-full text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showFormPreview ? 'Ocultar Prévia da Tabela' : `Ver Tabela Prévia (${formPreviewSchedule.length} parcelas)`}
                </button>
              )}

              {/* Prévia da Tabela no Formulário */}
              {showFormPreview && formPreviewSchedule.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-[10px]">
                  <div className="flex justify-between items-center font-black text-indigo-700 dark:text-indigo-400">
                    <span>Simulação do Cronograma ({formAmortizationSystem})</span>
                    <span className="text-[9px] text-zinc-400 font-normal">Total: R$ {formPreviewSchedule.reduce((a, b) => a + b.installmentValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-500">
                        <tr>
                          <th className="p-1">Nº</th>
                          <th className="p-1">Vencimento</th>
                          <th className="p-1 text-right">Prestação</th>
                          <th className="p-1 text-right">Amort.</th>
                          <th className="p-1 text-right">Juros</th>
                          <th className="p-1 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-mono text-[9px]">
                        {formPreviewSchedule.map(row => (
                          <tr key={row.number} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                            <td className="p-1 font-black">{row.number}</td>
                            <td className="p-1 font-sans">{safeFormatDate(row.dueDate)}</td>
                            <td className="p-1 text-right font-bold">R$ {row.installmentValue.toFixed(2)}</td>
                            <td className="p-1 text-right text-emerald-600">R$ {row.amortizationValue.toFixed(2)}</td>
                            <td className="p-1 text-right text-amber-600">R$ {row.interestValue.toFixed(2)}</td>
                            <td className="p-1 text-right">R$ {row.endingBalance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
              Selecione o contrato e a data em que pretende simular a liquidação antecipada do valor presente (saldo devedor). O sistema remove os juros não transcorridos e calcula o valor real de liquidação e a sua economia líquida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 text-xs font-semibold">
            <div>
              <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5">Escolha o Empréstimo Ativo</label>
              <select
                value={simLoanId}
                onChange={(e) => setSimLoanId(e.target.value)}
                id="select-sim-loan"
                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-hidden font-bold"
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
                      Ao efetuar a liquidação antecipada do contrato na data de <strong className="font-black">{safeFormatDate(simDate)}</strong>, você economizará o valor de <strong className="font-black text-emerald-800 dark:text-emerald-300">R$ {simulationResult.economyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> correspondente aos juros de parcelas futuras que deixarão de existir.
                    </p>
                  </div>

                  <div className="mt-6 border-t border-emerald-200 dark:border-emerald-900/40 pt-4 space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Custo Contratado original:</span>
                      <span>R$ {simulationResult.initialContractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                      <span>Custo final com quitação hoje:</span>
                      <span>R$ {(simulationResult.paidValue + simulationResult.amortizationPending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                        {safeFormatDate(settle.settlementDate)}
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
                      R$ {consignadosCalculated.reduce((sum, c) => sum + c.initialContractValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total pago de juros:</span>
                    <span className="font-bold text-amber-600">
                      R$ {consignadosCalculated.reduce((sum, c) => sum + c.totalPaidInterest, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 font-bold">
                    <span className="text-zinc-500">Economia real obtida:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      R$ {consolidatedMetrics.totalInterestSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      R$ {consignadosCalculated.reduce((sum, c) => sum + c.totalPaidAmortization, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Empréstimo original (Principal):</span>
                    <span className="font-bold">R$ {consolidatedMetrics.totalBorrowed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO COMPLETA / TELA CHEIA DA TABELA DE AMORTIZAÇÃO */}
      {scheduleModalLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
              <div>
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-zinc-800 dark:text-zinc-100">{scheduleModalLoan.bank}</h3>
                  <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded">
                    Contrato: {scheduleModalLoan.contractNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded">
                    Sistema: {scheduleModalLoan.amortizationSystem || 'Price'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Demonstrativo Analítico Completo do Cronograma de Amortização ({scheduleModalLoan.totalInstallments} parcelas)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportScheduleText(scheduleModalLoan)}
                  className="px-3 py-1.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Exportar TXT
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button
                  onClick={() => setScheduleModalLoan(null)}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo Tabela Modal */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-extrabold block">Valor Financiado</span>
                  <span className="font-black text-zinc-800 dark:text-zinc-200">R$ {scheduleModalLoan.borrowedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-extrabold block">Taxa de Juros</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{scheduleModalLoan.interestRate}% a.m.</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-extrabold block">Primeiro Vencimento</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{safeFormatDate(scheduleModalLoan.firstPaymentDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-extrabold block">Prestação Base</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">R$ {scheduleModalLoan.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 font-black uppercase text-[10px] tracking-wider text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-3 text-center">Nº</th>
                      <th className="py-2.5 px-3">Vencimento</th>
                      <th className="py-2.5 px-3 text-right">Valor Prestação</th>
                      <th className="py-2.5 px-3 text-right">Amortização</th>
                      <th className="py-2.5 px-3 text-right">Juros</th>
                      <th className="py-2.5 px-3 text-right">Saldo Devedor</th>
                      <th className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400">Total Pago</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    {scheduleModalLoan.schedule.map(row => (
                      <tr key={row.number} className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/40 ${row.isPaid ? 'bg-emerald-50/20 dark:bg-emerald-950/10 text-zinc-400' : ''}`}>
                        <td className="py-2 px-3 text-center font-black">{row.number}</td>
                        <td className="py-2 px-3 font-semibold">{safeFormatDate(row.dueDate)}</td>
                        <td className="py-2 px-3 text-right font-bold text-zinc-700 dark:text-zinc-300">R$ {row.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-medium">R$ {row.amortizationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right text-amber-600 font-medium">R$ {row.interestValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-bold">R$ {row.endingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">R$ {row.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-center">
                          {row.isPaid ? (
                            <span className="text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-black rounded">PAGO</span>
                          ) : (row.dueDate && row.dueDate < todayStr) ? (
                            <span className="text-[9px] px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 font-black rounded">ATRASADO</span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold rounded">ABERTO</span>
                          )}
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={() => handleToggleInstallmentPaid(scheduleModalLoan, row.number)}
                            className={`p-1 px-2.5 text-[9px] font-black rounded-lg cursor-pointer ${
                              row.isPaid ? 'bg-zinc-100 text-zinc-400 hover:bg-rose-100 hover:text-rose-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
          </div>
        </div>
      )}

    </div>
  );
}
