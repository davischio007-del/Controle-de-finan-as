/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FinancialData } from '../types';

// Data do sistema baseada na data atual de 2026-07-20
export const getInitialData = (): FinancialData => {
  return {
    salaries: [
      {
        id: 'sal-1',
        description: 'Salário Principal - Estado',
        payor: 'Estado',
        value: 8500,
        date: '2026-07-05',
        year: 2026,
        month: 7,
        observation: 'Cargo público estatutário'
      },
      {
        id: 'sal-2',
        description: 'Recebimento de Aluguel',
        payor: 'Aluguel Imóvel Centro',
        value: 1200,
        date: '2026-07-10',
        year: 2026,
        month: 7,
        observation: 'Repassado pela imobiliária'
      },
      {
        id: 'sal-3',
        description: 'Serviço de Consultoria Extra',
        payor: 'Extra - Freelance',
        value: 900,
        date: '2026-07-15',
        year: 2026,
        month: 7,
        observation: 'Projeto de desenvolvimento web'
      }
    ],
    fixedExpenses: [
      {
        id: 'fix-1',
        name: 'Internet Fibra',
        category: 'Internet',
        value: 120,
        dueDay: 10,
        isRecurring: true,
        startDate: '2026-01-01',
        paymentMethod: 'Pix',
        isPaid: true,
        paidMonths: ['2026-07']
      },
      {
        id: 'fix-2',
        name: 'Energia Elétrica',
        category: 'Energia',
        value: 250,
        dueDay: 15,
        isRecurring: true,
        startDate: '2026-01-01',
        paymentMethod: 'Débito Automático',
        isPaid: true,
        paidMonths: ['2026-07']
      },
      {
        id: 'fix-3',
        name: 'Água e Saneamento',
        category: 'Água',
        value: 80,
        dueDay: 15,
        isRecurring: true,
        startDate: '2026-01-01',
        paymentMethod: 'Débito Automático',
        isPaid: true,
        paidMonths: ['2026-07']
      },
      {
        id: 'fix-4',
        name: 'Mensalidade Escolar',
        category: 'Escola',
        value: 1100,
        dueDay: 5,
        isRecurring: true,
        startDate: '2026-01-01',
        paymentMethod: 'Boleto Bancário',
        isPaid: true,
        paidMonths: ['2026-07']
      },
      {
        id: 'fix-5',
        name: 'Mensalidade da Academia',
        category: 'Academia',
        value: 150,
        dueDay: 20,
        isRecurring: true,
        startDate: '2026-02-15',
        paymentMethod: 'Cartão de Crédito',
        isPaid: false,
        paidMonths: []
      },
      {
        id: 'fix-6',
        name: 'Financiamento Habitacional',
        category: 'Financiamento',
        value: 1800,
        dueDay: 28,
        isRecurring: true,
        startDate: '2024-05-10',
        paymentMethod: 'Débito em Conta',
        isPaid: false,
        paidMonths: []
      }
    ],
    variableExpenses: [
      {
        id: 'var-1',
        category: 'Mercado',
        subcategory: 'Alimentação',
        value: 650,
        date: '2026-07-08',
        description: 'Compra mensal de mantimentos',
        paymentMethod: 'Cartão de Débito'
      },
      {
        id: 'var-2',
        category: 'Mercado',
        subcategory: 'Limpeza',
        value: 120,
        date: '2026-07-08',
        description: 'Produtos de limpeza gerais',
        paymentMethod: 'Cartão de Débito'
      },
      {
        id: 'var-3',
        category: 'Veículo',
        subcategory: 'Combustível',
        value: 200,
        date: '2026-07-12',
        description: 'Abastecimento Posto BR',
        paymentMethod: 'Cartão de Crédito'
      },
      {
        id: 'var-4',
        category: 'Farmácia',
        subcategory: 'Saúde',
        value: 95,
        date: '2026-07-14',
        description: 'Medicamentos de rotina',
        paymentMethod: 'Pix'
      },
      {
        id: 'var-5',
        category: 'Lazer',
        subcategory: 'Alimentação',
        value: 180,
        date: '2026-07-18',
        description: 'Jantar em família - Pizzaria',
        paymentMethod: 'Cartão de Crédito'
      },
      {
        id: 'var-6',
        category: 'Veículo',
        subcategory: 'Seguro',
        value: 150,
        date: '2026-07-10',
        description: 'Parcela seguro Porto Seguro',
        paymentMethod: 'Débito Automático'
      },
      {
        id: 'var-7',
        category: 'Pets',
        subcategory: 'Higiene',
        value: 110,
        date: '2026-07-15',
        description: 'Ração e Petiscos para o Pet',
        paymentMethod: 'Pix'
      }
    ],
    consignados: [
      {
        id: 'con-1',
        bank: 'Banco do Brasil',
        contractNumber: 'BB-98745-A',
        borrowedAmount: 25000,
        interestRate: 1.85, // % a.m.
        loanDate: '2025-06-10',
        firstPaymentDate: '2025-07-10',
        totalInstallments: 48,
        installmentValue: 750,
        isPaid: false
      },
      {
        id: 'con-2',
        bank: 'Caixa Econômica',
        contractNumber: 'CEF-12004-X',
        borrowedAmount: 15000,
        interestRate: 1.95, // % a.m.
        loanDate: '2025-10-15',
        firstPaymentDate: '2025-11-15',
        totalInstallments: 36,
        installmentValue: 520,
        isPaid: false
      },
      {
        id: 'con-3',
        bank: 'Sicoob',
        contractNumber: 'SIC-3344-9',
        borrowedAmount: 8000,
        interestRate: 1.65, // % a.m.
        loanDate: '2026-03-01',
        firstPaymentDate: '2026-04-01',
        totalInstallments: 24,
        installmentValue: 410,
        isPaid: false
      }
    ],
    creditCards: [
      {
        id: 'card-1',
        bank: 'Nubank',
        cardName: 'Roxinho Nu',
        category: 'Uso Pessoal',
        limit: 10000,
        closingDay: 15,
        dueDay: 22,
        isActive: true
      },
      {
        id: 'card-2',
        bank: 'Sicredi',
        cardName: 'Sicredi Mastercard Gold',
        category: 'Corporativo',
        limit: 8000,
        closingDay: 8,
        dueDay: 18,
        isActive: true
      }
    ],
    cardPurchases: [
      {
        id: 'pur-1',
        cardId: 'card-1',
        description: 'TV Samsung 55 Polegadas 4K',
        category: 'Casa',
        totalValue: 5400,
        totalInstallments: 12,
        purchaseDate: '2026-01-10',
        firstDueDate: '2026-02-22'
      },
      {
        id: 'pur-2',
        cardId: 'card-1',
        description: 'Cafeteira Nespresso',
        category: 'Casa',
        totalValue: 600,
        totalInstallments: 3,
        purchaseDate: '2026-06-12',
        firstDueDate: '2026-07-22'
      },
      {
        id: 'pur-3',
        cardId: 'card-2',
        description: 'Tênis de Corrida Nike',
        category: 'Lazer',
        totalValue: 480,
        totalInstallments: 4,
        purchaseDate: '2026-05-02',
        firstDueDate: '2026-06-18'
      }
    ],
    savingsGoals: [
      {
        id: 'goal-1',
        targetAmount: 2000,
        targetMonth: '2026-07',
        notes: 'Meta para reforçar investimentos de longo prazo'
      }
    ],
    emergencyFund: {
      targetValue: 30000,
      currentValue: 18500
    },
    investments: [
      {
        id: 'inv-1',
        type: 'CDB',
        name: 'CDB Banco liquidez diária',
        value: 12500,
        yieldRate: '100% CDI',
        date: '2025-12-01'
      },
      {
        id: 'inv-2',
        type: 'Tesouro',
        name: 'Tesouro Selic 2029',
        value: 6000,
        yieldRate: 'Selic + 0.15% a.a.',
        date: '2026-02-10'
      }
    ],
    patrimonyItems: [
      {
        id: 'pat-1',
        name: 'Apartamento de 2 Quartos',
        type: 'Imóvel',
        value: 350000,
        description: 'Imóvel residencial próprio quitado'
      },
      {
        id: 'pat-2',
        name: 'SUV Toyota Corolla Cross',
        type: 'Veículo',
        value: 125000,
        description: 'Veículo seminovo'
      }
    ],
    fixedCategories: [
      { id: 'fcat-1', name: 'Moradia', isActive: true, subcategories: ['Aluguel', 'Água', 'Energia', 'Internet', 'Condomínio', 'IPTU'] },
      { id: 'fcat-2', name: 'Assinaturas', isActive: true, subcategories: ['Netflix', 'Spotify', 'Amazon Prime', 'Disney+'] },
      { id: 'fcat-3', name: 'Educação', isActive: true, subcategories: ['Mensalidade', 'Livros', 'Cursos'] },
      { id: 'fcat-4', name: 'Saúde', isActive: true, subcategories: ['Academia', 'Plano de Saúde', 'Medicamentos'] },
      { id: 'fcat-5', name: 'Outros', isActive: true, subcategories: ['Diversos'] }
    ],
    variableCategories: [
      { id: 'vcat-1', name: 'Veículo', isActive: true, subcategories: ['Combustível', 'Lavagem', 'Seguro', 'Oficina', 'IPVA'] },
      { id: 'vcat-2', name: 'Mercado', isActive: true, subcategories: ['Alimentação', 'Higiene', 'Limpeza', 'Outros'] },
      { id: 'vcat-3', name: 'Farmácia', isActive: true, subcategories: ['Medicamentos', 'Cosméticos', 'Outros'] },
      { id: 'vcat-4', name: 'Lazer', isActive: true, subcategories: ['Alimentação', 'Cinema', 'Viagem', 'Shows'] },
      { id: 'vcat-5', name: 'Pets', isActive: true, subcategories: ['Ração', 'Higiene', 'Veterinário'] }
    ]
  };
};
