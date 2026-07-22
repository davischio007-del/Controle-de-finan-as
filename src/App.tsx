/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import Dashboard from './components/Dashboard';
import Salaries from './components/Salaries';
import FixedExpenses from './components/FixedExpenses';
import VariableExpenses from './components/VariableExpenses';
import Consignados from './components/Consignados';
import CreditCards from './components/CreditCards';
import Investments from './components/Investments';
import Reports from './components/Reports';
import GlobalSearch from './components/GlobalSearch';
import CSVImporter from './components/CSVImporter';
import FinancialCalendar from './components/FinancialCalendar';
import AlertsPanel from './components/AlertsPanel';
import Login from './components/Login';
import UsersAdmin from './components/UsersAdmin';
import UserProfileModal from './components/UserProfileModal';

import {
  LayoutDashboard,
  Landmark,
  CalendarDays,
  Receipt,
  FileCheck,
  CreditCard,
  LineChart,
  FileBarChart,
  Search,
  UploadCloud,
  Moon,
  Sun,
  Menu,
  X,
  BellRing,
  Users,
  LogOut,
  UserCog
} from 'lucide-react';

function DashboardShell() {
  const { 
    data, 
    updateConsignado, 
    selectedYear, 
    setSelectedYear, 
    selectedMonth, 
    setSelectedMonth, 
    currentUser, 
    logoutUser,
    isOffline,
    isSyncPending,
    syncStatus 
  } = useFinancial();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'salaries' | 'fixed' | 'variable' | 'consignados' | 'cards' | 'investments' | 'reports' | 'users-admin'>('dashboard');
  const [consignadoBankFilter, setConsignadoBankFilter] = useState<string | undefined>(undefined);

  const handleNavigateTab = (tab: string, bankFilter?: string) => {
    setActiveTab(tab as any);
    if (bankFilter !== undefined) {
      setConsignadoBankFilter(bankFilter);
    }
  };

  // Controle de prompt de consignados vencendo no mês atual
  const [dismissedConsignadoPrompt, setDismissedConsignadoPrompt] = useState(false);

  // Verificar parcelas de consignado com vencimento no mês atual
  const dueConsignadoInstallments = React.useMemo(() => {
    if (!data?.consignados) return [];
    
    const list: Array<{
      loanId: string;
      bank: string;
      contractNumber: string;
      installmentNumber: number;
      totalInstallments: number;
      value: number;
      dueDate: string;
    }> = [];

    data.consignados.forEach(c => {
      if (c.isPaid) return;
      
      const start = new Date(c.firstPaymentDate + 'T00:00:00');
      const end = new Date(selectedYear, selectedMonth - 1, 1);
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      const instNum = diffMonths + 1;

      if (instNum >= 1 && instNum <= c.totalInstallments) {
        const paidList = c.paidInstallmentsList || [];
        if (!paidList.includes(instNum)) {
          // Calcular vencimento exato desta parcela
          const firstDate = new Date(c.firstPaymentDate + 'T00:00:00');
          const targetDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + (instNum - 1), firstDate.getDate());
          const lastDayOfTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
          const clampedDay = Math.min(firstDate.getDate(), lastDayOfTargetMonth);
          const finalDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), clampedDay);
          const dueDateStr = finalDate.toISOString().split('T')[0];

          list.push({
            loanId: c.id,
            bank: c.bank,
            contractNumber: c.contractNumber,
            installmentNumber: instNum,
            totalInstallments: c.totalInstallments,
            value: c.installmentValue,
            dueDate: dueDateStr
          });
        }
      }
    });

    return list;
  }, [data?.consignados, selectedYear, selectedMonth]);

  // Estados de modais overlays
  const [showSearch, setShowSearch] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Controle de Modo Escuro (Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Se não estiver autenticado, renderizar a tela de login
  if (!currentUser) {
    return <Login />;
  }

  // Lista de Abas de Navegação (Administração visível apenas para admins)
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'salaries', label: 'Salários', icon: Landmark },
    { id: 'fixed', label: 'Contas Fixas', icon: CalendarDays },
    { id: 'variable', label: 'Contas Variáveis', icon: Receipt },
    { id: 'consignados', label: 'Consignados', icon: FileCheck },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'investments', label: 'Investimentos', icon: LineChart },
    { id: 'reports', label: 'Relatórios & Backup', icon: FileBarChart },
    ...(currentUser.role === 'admin' ? [{ id: 'users-admin', label: 'Administração', icon: Users } as const] : [])
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col md:flex-row transition-all duration-200">
      
      {/* 1. SIDEBAR DE NAVEGAÇÃO DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-850 shrink-0 select-none">
        {/* Logo / Branding */}
        <div className="p-6 border-b border-zinc-150 dark:border-zinc-850">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              F
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white">Organizador Financeiro</h1>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Gestor de Orçamento</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                id={`btn-nav-desktop-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 dark:text-zinc-400 hover:text-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Perfil de Usuário Logado & Logout */}
        <div className="p-4 border-t border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setShowProfileModal(true)}
              title="Configurações da Minha Conta (Alterar E-mail / Senha)"
              className="flex items-center gap-2 min-w-0 p-1.5 -ml-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl transition-colors cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-150 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 uppercase select-none group-hover:scale-105 transition-transform">
                {currentUser.username.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate capitalize flex items-center gap-1">
                  {currentUser.username}
                  <UserCog className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowProfileModal(true)}
                title="Alterar E-mail / Senha"
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
              >
                <UserCog className="w-4 h-4" />
              </button>
              <button
                onClick={logoutUser}
                title="Sair do Sistema"
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          {isOffline ? (
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 py-1 px-2 rounded-md border border-amber-200 dark:border-amber-900/40 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>Modo Offline (Cache Local)</span>
            </div>
          ) : isSyncPending || syncStatus === 'syncing' ? (
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 py-1 px-2 rounded-md border border-indigo-200 dark:border-indigo-900/40 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-spin"></span>
              <span>Sincronizando Firestore...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 py-1 px-2 rounded-md border border-emerald-200 dark:border-emerald-900/40 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Firestore em Tempo Real</span>
            </div>
          )}
          <div className="text-[9px] text-zinc-400 font-bold text-center">
            Versão 1.3.0 • Multi-User Admin & Cloud DB
          </div>
        </div>
      </aside>

      {/* 2. CONTEÚDO PRINCIPAL COM CABEÇALHO */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER DE OPERAÇÃO */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-850 px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
          
          {/* Lado Esquerdo: Mobile Menu Toggle & Título */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              id="btn-toggle-mobile-menu"
              className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-600 dark:text-zinc-300 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Painel do Usuário</h2>
              <h1 className="text-base font-black text-zinc-900 dark:text-white capitalize">
                {navigationItems.find(n => n.id === activeTab)?.label}
              </h1>
            </div>
          </div>

          {/* Filtros Centrais: Ano / Mês */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              id="global-month-select"
              className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-bold text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              id="global-year-select"
              className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-bold text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>

          {/* Lado Direito: Ações Globais (Pesquisar, OFX Importer, Dark Mode) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSearch(true)}
              id="btn-global-search"
              title="Pesquisa Global"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 cursor-pointer transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowImporter(true)}
              id="btn-csv-importer"
              title="Importar Extrato Bancário"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 cursor-pointer transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowCalendar(!showCalendar)}
              id="btn-calendar-toggle"
              title="Calendário Financeiro"
              className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 cursor-pointer transition-colors ${showCalendar ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600' : ''}`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>

            <button
              onClick={toggleDarkMode}
              id="btn-theme-toggle"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-500 dark:text-zinc-400 cursor-pointer transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* ALERTA DE DIAS COM CONTAS EM ATENÇÃO */}
        <div className="px-6 pt-4">
          <AlertsPanel />
        </div>

        {/* PROMPT DE CONSIGNADOS VENCENDO NO MÊS (CONTROLE DE BOOT) */}
        {dueConsignadoInstallments.length > 0 && !dismissedConsignadoPrompt && (
          <div className="px-6 pt-4 animate-fade-in">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl shadow-xs relative flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg shrink-0 mt-0.5">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    Controle de Vencimentos: Parcelas de Consignados para {selectedMonth}/{selectedYear}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-semibold">
                    Olá! Identificamos {dueConsignadoInstallments.length} {dueConsignadoInstallments.length === 1 ? 'prestação' : 'prestações'} de empréstimo consignado com vencimento neste mês. Deseja registrar a confirmação de pagamento?
                  </p>
                  
                  {/* Lista de parcelas */}
                  <div className="mt-2.5 space-y-2 text-[11px] text-amber-900/90 dark:text-amber-200/90">
                    {dueConsignadoInstallments.map(inst => (
                      <div key={`${inst.loanId}-${inst.installmentNumber}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-white/50 dark:bg-zinc-900/40 p-2 rounded-lg border border-amber-100 dark:border-amber-900/20">
                        <span>• <strong>{inst.bank}</strong> (Contrato: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{inst.contractNumber}</code>)</span>
                        <span className="bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded text-[10px] font-black text-amber-800 dark:text-amber-400">Parcela {inst.installmentNumber}/{inst.totalInstallments}</span>
                        <span>- Vence em: <strong>{new Date(inst.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
                        <span>- Valor: <strong className="text-amber-700 dark:text-amber-400">R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                        <button
                          onClick={() => {
                            const c = data.consignados.find(loan => loan.id === inst.loanId);
                            if (!c) return;
                            const nextPaidList = [...(c.paidInstallmentsList || []), inst.installmentNumber];
                            const isNowFullyPaid = nextPaidList.length >= c.totalInstallments;
                            const currentDates = c.paymentConfirmationDates || {};
                            updateConsignado(inst.loanId, {
                              paidInstallmentsList: nextPaidList,
                              isPaid: isNowFullyPaid,
                              paymentConfirmationDates: {
                                ...currentDates,
                                [inst.installmentNumber]: new Date().toISOString().split('T')[0]
                              }
                            });
                          }}
                          className="ml-auto md:ml-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-2.5 py-1 rounded-md cursor-pointer transition-all shadow-xs"
                        >
                          Confirmar Pagamento
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDismissedConsignadoPrompt(true)}
                className="absolute top-4 right-4 md:static md:top-auto md:right-auto p-1.5 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-lg cursor-pointer transition-colors"
                title="Dispensar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3. CALENDÁRIO FINANCEIRO OVERLAY SLIDE-OUT */}
        {showCalendar && (
          <div className="px-6 pt-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-md relative">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cronograma de Vencimento Mensal</h3>
                <button onClick={() => setShowCalendar(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <FinancialCalendar />
            </div>
          </div>
        )}

        {/* 4. VISÃO DE TRABALHO ATIVA */}
        <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard onNavigateTab={handleNavigateTab} />}
          {activeTab === 'salaries' && <Salaries />}
          {activeTab === 'fixed' && <FixedExpenses />}
          {activeTab === 'variable' && <VariableExpenses />}
          {activeTab === 'consignados' && <Consignados targetBankFilter={consignadoBankFilter} />}
          {activeTab === 'cards' && <CreditCards />}
          {activeTab === 'investments' && <Investments />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'users-admin' && <UsersAdmin />}
        </div>
      </main>

      {/* 5. MENU MOBILE COMPLETO DRAWER */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-zinc-950/40 backdrop-blur-xs">
          <div className="w-64 bg-white dark:bg-zinc-900 h-full p-5 flex flex-col justify-between border-r border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-150">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    F
                  </div>
                  <span className="font-extrabold text-zinc-900 dark:text-white">Finanças Pro</span>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="p-1">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMobileMenu(false);
                      }}
                      id={`btn-nav-mobile-${item.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
                        activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-zinc-150 dark:border-zinc-800 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-150 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 uppercase select-none">
                    {currentUser.username.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate capitalize">{currentUser.username}</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
                  </div>
                </div>
                <button
                  onClick={logoutUser}
                  title="Sair do Sistema"
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-zinc-400 text-center font-bold">
                Versão 1.3.0 • Multi-User Admin
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: PESQUISA GLOBAL OVERLAY */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mecanismo de Busca Global</span>
              <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <GlobalSearch onNavigateToTab={(tab) => { setActiveTab(tab as any); setShowSearch(false); }} />
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: IMPORTER EXTRATO BANCÁRIO */}
      {showImporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Importador de Extrato Bancário (CSV/OFX)</span>
              <button onClick={() => setShowImporter(false)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              <CSVImporter onClose={() => setShowImporter(false)} />
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: PERFIL DE USUÁRIO / ALTERAR E-MAIL E SENHA */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <FinancialProvider>
      <DashboardShell />
    </FinancialProvider>
  );
}
