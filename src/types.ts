/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SalaryDiscount {
  id: string;
  name: string;
  value: number;
  type: 'standard' | 'custom';
}

export interface Salary {
  id: string;
  description: string;
  payor: string; // Fonte pagadora
  value: number;
  date: string; // YYYY-MM-DD
  year: number;
  month: number;
  observation: string;
  discounts?: SalaryDiscount[];
}

export interface FixedExpense {
  id: string;
  name: string;
  category: string;
  value: number;
  dueDay: number;
  isRecurring: boolean;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (opcional)
  isPaid: boolean; // default status, or for current month
  paymentMethod: string;
  // Para registrar pagamentos mês a mês de contas recorrentes
  paidMonths?: string[]; // Array de "YYYY-MM" que estão pagos
  subcategory?: string;
  cardId?: string;
  purchaseDate?: string;
  cardPurchaseId?: string;
}

export interface VariableExpense {
  id: string;
  category: string;
  subcategory: string;
  value: number;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: string;
  cardId?: string;
  purchaseDate?: string;
  totalInstallments?: number;
  firstDueDate?: string;
  observation?: string;
  cardPurchaseId?: string;
}

export interface Consignado {
  id: string;
  bank: string;
  contractNumber: string;
  borrowedAmount: number; // Valor emprestado / financiado
  interestRate: number; // Taxa de juros (ao mês)
  loanDate: string; // YYYY-MM-DD
  firstPaymentDate: string; // YYYY-MM-DD
  totalInstallments: number; // Quantidade de parcelas
  installmentValue: number; // Valor da parcela
  isPaid: boolean; // Quitado
  paidInstallmentsList?: number[]; // Lista de parcelas pagas (1-indexado)
  paymentConfirmationDates?: Record<number, string>; // data de confirmação para cada parcela
  
  // Novos campos avançados do Consignado
  loanType?: string; // Tipo de Empréstimo
  releasedAmount?: number; // Valor Liberado (líquido)
  interestRateYearly?: number; // Taxa de juros ao ano (%)
  amortizationSystem?: 'Price' | 'SAC' | 'Personalizado'; // Sistema de Amortização
  dueDay?: number; // Dia de vencimento
  cetRate?: number; // Custo Efetivo Total (%)
  earlySettlementHistory?: Array<{
    settlementDate: string;
    paidValue: number;
    interestDiscount: number;
    interestPaid: number;
    amortizationPaid: number;
    economyAmount: number;
    previousDebt: number;
    finalDebt: number;
  }>;
}

export interface CreditCard {
  id: string;
  bank: string;
  cardName: string;
  limit: number;
  closingDay: number; // Dia de fechamento
  dueDay: number; // Dia de vencimento
  isActive: boolean;
}

export interface CardPurchase {
  id: string;
  cardId: string;
  description: string;
  category: string;
  totalValue: number;
  totalInstallments: number; // Parcelas (ex: 12)
  purchaseDate: string; // YYYY-MM-DD
  firstDueDate: string; // YYYY-MM-DD (Primeiro vencimento)
}

export interface SavingsGoal {
  id: string;
  targetAmount: number;
  targetMonth: string; // YYYY-MM
  notes?: string;
}

export interface EmergencyFund {
  targetValue: number;
  currentValue: number;
}

export interface Investment {
  id: string;
  type: 'Tesouro' | 'CDB' | 'Ações' | 'FIIs' | 'Poupança' | 'Outros';
  name: string;
  value: number;
  yieldRate?: string; // Taxa de rendimento (ex: 100% CDI, 12% a.a.)
  date: string; // YYYY-MM-DD
}

export interface PatrimonyItem {
  id: string;
  name: string;
  type: 'Imóvel' | 'Veículo' | 'Outro Bem';
  value: number;
  description?: string;
}

export interface FinancialAlert {
  id: string;
  type: 'vencendo' | 'atrasado' | 'fechamento_cartao' | 'limite_cartao' | 'consignado_proximo' | 'parcelas_terminando';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  dueDate?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isActive: boolean;
  subcategories: string[];
}

export interface FinancialData {
  salaries: Salary[];
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  consignados: Consignado[];
  creditCards: CreditCard[];
  cardPurchases: CardPurchase[];
  savingsGoals: SavingsGoal[];
  emergencyFund: EmergencyFund;
  investments: Investment[];
  patrimonyItems: PatrimonyItem[];
  fixedCategories?: ExpenseCategory[];
  variableCategories?: ExpenseCategory[];
  updatedAt?: string;
}

export interface User {
  fullName: string;
  username: string;
  password?: string;
  email?: string;
  role: 'admin' | 'user';
  active: boolean; // Situação (Ativo/Inativo)
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: string; // Bloqueio temporário
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
}

export interface AuditLog {
  id: string;
  username: string;
  timestamp: string;
  operation: string;
  module: string;
  details: string;
  ip?: string;
}

