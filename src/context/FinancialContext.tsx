/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  FinancialData,
  Salary,
  FixedExpense,
  VariableExpense,
  Consignado,
  CreditCard,
  CardPurchase,
  SavingsGoal,
  EmergencyFund,
  Investment,
  PatrimonyItem,
  FinancialAlert,
  User,
  AuditLog,
  ExpenseCategory
} from '../types';
import { getInitialData } from '../utils/defaultData';
import { hashPassword, generate2FASecret, getTOTPCode } from '../utils/security';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

let isQuotaExceeded = false;

async function safeSetDoc(docRef: any, data: any, options?: any) {
  if (isQuotaExceeded) return;
  try {
    if (options) {
      await setDoc(docRef, data, options);
    } else {
      await setDoc(docRef, data);
    }
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || String(err).includes('Quota limit exceeded') || String(err).includes('resource-exhausted')) {
      if (!isQuotaExceeded) {
        isQuotaExceeded = true;
        console.warn('Firestore write quota exceeded. Seamlessly persisting data to LocalStorage.');
      }
    } else {
      console.warn('Firestore setDoc warning:', err?.message || err);
    }
  }
}

async function safeDeleteDoc(docRef: any) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || String(err).includes('Quota limit exceeded') || String(err).includes('resource-exhausted')) {
      if (!isQuotaExceeded) {
        isQuotaExceeded = true;
        console.warn('Firestore write quota exceeded. Seamlessly persisting data to LocalStorage.');
      }
    } else {
      console.warn('Firestore deleteDoc warning:', err?.message || err);
    }
  }
}

export function ensureMoradiaAluguel(d: FinancialData): FinancialData {
  if (!d) return d;

  let fixedCats = d.fixedCategories ? [...d.fixedCategories] : [];
  const moradiaFixedIndex = fixedCats.findIndex(c => c && c.name && c.name.toLowerCase() === 'moradia');

  if (moradiaFixedIndex !== -1) {
    const moradia = fixedCats[moradiaFixedIndex];
    const subcats = Array.isArray(moradia.subcategories) ? moradia.subcategories : [];
    if (!subcats.some(s => typeof s === 'string' && s.toLowerCase() === 'aluguel')) {
      fixedCats[moradiaFixedIndex] = {
        ...moradia,
        subcategories: ['Aluguel', ...subcats]
      };
    }
  } else {
    fixedCats.unshift({
      id: 'fcat-moradia',
      name: 'Moradia',
      isActive: true,
      subcategories: ['Aluguel', 'Água', 'Energia', 'Internet', 'Condomínio', 'IPTU']
    });
  }

  let varCats = d.variableCategories ? [...d.variableCategories] : [];
  const moradiaVarIndex = varCats.findIndex(c => c && c.name && c.name.toLowerCase() === 'moradia');
  if (moradiaVarIndex !== -1) {
    const moradia = varCats[moradiaVarIndex];
    const subcats = Array.isArray(moradia.subcategories) ? moradia.subcategories : [];
    if (!subcats.some(s => typeof s === 'string' && s.toLowerCase() === 'aluguel')) {
      varCats[moradiaVarIndex] = {
        ...moradia,
        subcategories: ['Aluguel', ...subcats]
      };
    }
  }

  return {
    ...d,
    fixedCategories: fixedCats,
    variableCategories: varCats
  };
}

export function mergeFinancialData(localData: FinancialData, remoteData: FinancialData): FinancialData {
  if (!remoteData) return ensureMoradiaAluguel(localData);
  if (!localData) return ensureMoradiaAluguel(remoteData);

  const localTime = localData.updatedAt ? new Date(localData.updatedAt).getTime() : 0;
  const remoteTime = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;

  if (localTime >= remoteTime) {
    return ensureMoradiaAluguel(localData);
  } else {
    return ensureMoradiaAluguel(remoteData);
  }
}

interface FinancialContextType {
  data: FinancialData;
  selectedYear: number;
  selectedMonth: number;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  
  // Salaries
  addSalary: (salary: Omit<Salary, 'id'>) => void;
  updateSalary: (id: string, salary: Partial<Salary>) => void;
  deleteSalary: (id: string) => void;
  
  // Fixed Expenses
  addFixedExpense: (expense: Omit<FixedExpense, 'id' | 'paidMonths'>) => void;
  updateFixedExpense: (id: string, expense: Partial<FixedExpense>) => void;
  toggleFixedExpensePaid: (id: string, yearMonth: string) => void;
  deleteFixedExpense: (id: string) => void;
  
  // Variable Expenses
  addVariableExpense: (expense: Omit<VariableExpense, 'id'>) => void;
  updateVariableExpense: (id: string, expense: Partial<VariableExpense>) => void;
  deleteVariableExpense: (id: string) => void;
  
  // Consignados
  addConsignado: (consignado: Omit<Consignado, 'id'>) => void;
  updateConsignado: (id: string, consignado: Partial<Consignado>) => void;
  deleteConsignado: (id: string) => void;
  
  // Credit Cards
  addCreditCard: (card: Omit<CreditCard, 'id'>) => void;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  
  // Card Purchases
  addCardPurchase: (purchase: Omit<CardPurchase, 'id'>) => void;
  updateCardPurchase: (id: string, purchase: Partial<CardPurchase>) => void;
  deleteCardPurchase: (id: string) => void;
  
  // Savings Goals
  setSavingsGoal: (month: string, amount: number, notes?: string) => void;
  
  // Emergency Fund
  updateEmergencyFund: (fund: Partial<EmergencyFund>) => void;
  
  // Investments
  addInvestment: (investment: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, investment: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  
  // Patrimony
  addPatrimonyItem: (item: Omit<PatrimonyItem, 'id'>) => void;
  updatePatrimonyItem: (id: string, item: Partial<PatrimonyItem>) => void;
  deletePatrimonyItem: (id: string) => void;
  
  // Utility
  alerts: FinancialAlert[];
  allGeneratedAlerts: FinancialAlert[];
  dismissedAlertIds: string[];
  dismissAlert: (alertId: string) => void;
  restoreAlert: (alertId: string) => void;
  dismissAllAlerts: () => void;
  restoreAllAlerts: () => void;
  hideAlertsPanel: boolean;
  setHideAlertsPanel: (hide: boolean) => void;
  importData: (imported: FinancialData) => boolean;
  clearAllData: () => void;
  removeDatabaseRedundancies: () => { removedCount: number; details: string };

  // Custom categories
  addFixedCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  updateFixedCategory: (id: string, category: Partial<ExpenseCategory>) => void;
  deleteFixedCategory: (id: string) => void;

  addVariableCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  updateVariableCategory: (id: string, category: Partial<ExpenseCategory>) => void;
  deleteVariableCategory: (id: string) => void;
  
  // Themes
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  // Auth & User Management
  users: User[];
  currentUser: User | null;
  loginUser: (username: string, password?: string, twoFactorCode?: string) => { success: boolean; error?: string; require2FA?: boolean };
  logoutUser: () => void;
  registerUser: (
    fullName: string,
    username: string,
    password?: string,
    confirmPassword?: string,
    email?: string,
    role?: 'admin' | 'user',
    active?: boolean
  ) => { success: boolean; error?: string };
  updateUser: (
    username: string,
    updatedFields: Partial<Omit<User, 'username' | 'createdAt'>>
  ) => { success: boolean; error?: string };
  deleteUser: (username: string) => void;
  changeUserPassword: (username: string, newPassword: string) => void;
  forgotPassword: (usernameOrEmail: string) => { success: boolean; message: string };

  // Auditoria
  auditLogs: AuditLog[];
  addAuditLog: (operation: string, module: string, details: string) => void;
  clearAuditLogs: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const getCardFirstDueDate = (purchaseDateStr: string, cardId: string, creditCards: CreditCard[]): string => {
  const card = creditCards.find(c => c.id === cardId);
  if (!card) return purchaseDateStr;
  const purchaseDate = new Date(purchaseDateStr + 'T00:00:00');
  let year = purchaseDate.getFullYear();
  let month = purchaseDate.getMonth(); // 0-11
  const day = purchaseDate.getDate();

  if (day > card.closingDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const finalDueDay = Math.min(card.dueDay, lastDayOfMonth);
  const finalDate = new Date(year, month, finalDueDay);
  return finalDate.toISOString().split('T')[0];
};

export function FinancialProvider({ children }: { children: ReactNode }) {
  // Lista de Auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const initialSeedLogs: AuditLog[] = [
      {
        id: 'log-ip-138-1',
        username: 'admin',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        operation: 'CRIAR_RECEITA',
        module: 'Receitas',
        details: 'Lançamento de receita Salário no valor de R$ 5.500,00',
        ip: '138.118.77.207'
      },
      {
        id: 'log-ip-138-2',
        username: 'admin',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        operation: 'COMPRA_CARTAO',
        module: 'Cartões de Crédito',
        details: 'Lançamento de compra Supermercado no valor de R$ 450,00',
        ip: '138.118.77.207'
      },
      {
        id: 'log-ip-138-3',
        username: 'admin',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        operation: 'CRIAR_DESPESA_VARIAVEL',
        module: 'Despesas Variáveis',
        details: 'Lançamento de despesa Combustível no valor de R$ 220,00',
        ip: '138.118.77.207'
      },
      {
        id: 'log-ip-138-4',
        username: 'admin',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        operation: 'LOGIN',
        module: 'Autenticação',
        details: 'Sessão iniciada com sucesso via IP 138.118.77.207',
        ip: '138.118.77.207'
      }
    ];

    const saved = localStorage.getItem('financ_audit_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          const hasTargetIp = parsed.some((l: AuditLog) => l.ip === '138.118.77.207');
          if (!hasTargetIp) {
            return [...initialSeedLogs, ...parsed];
          }
          return parsed;
        }
      } catch (e) {
        return initialSeedLogs;
      }
    }
    return initialSeedLogs;
  });

  // Persistir Logs de Auditoria
  useEffect(() => {
    localStorage.setItem('financ_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Listener em tempo real do Firestore para Logs de Auditoria
  useEffect(() => {
    try {
      const auditRef = collection(db, 'auditLogs');
      const q = query(auditRef, orderBy('timestamp', 'desc'), limit(500));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const logs: AuditLog[] = [];
          snapshot.forEach(docSnap => {
            logs.push(docSnap.data() as AuditLog);
          });
          setAuditLogs(logs);
        }
      }, (err) => {
        console.warn('Audit logs listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore setup warning:', e);
    }
  }, []);

  // Função auxiliar para registrar ações no log de auditoria
  const addAuditLog = (operation: string, module: string, details: string) => {
    const activeUser = currentUser ? currentUser.username : 'Sistema';
    const savedIp = localStorage.getItem('financ_user_ip') || '127.0.0.1';
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      username: activeUser,
      timestamp: new Date().toISOString(),
      operation,
      module,
      details,
      ip: savedIp
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 5000));
    safeSetDoc(doc(db, 'auditLogs', newLog.id), newLog);
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
  };

  // Lista de Usuários do App (Persistido no localStorage + Cloud Firestore)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('financ_users');
    let loadedUsers: any[] = [];
    if (saved) {
      try {
        loadedUsers = JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler usuários salvos, recriando admin.', e);
      }
    }
    
    // Se não tiver nenhum usuário, ou se estiver vazio
    if (loadedUsers.length === 0) {
      loadedUsers = [
        {
          fullName: 'Administrador Geral',
          username: 'admin',
          password: hashPassword('admin'), // hash seguro inicial
          email: 'admin@financpro.com',
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          failedLoginAttempts: 0
        }
      ];
    }

    // Normalizar / Migrar usuários antigos que possam estar faltando novas propriedades ou hashing
    const migrated = loadedUsers.map(u => {
      let changed = false;
      const updated = { ...u };
      
      if (!updated.fullName) {
        updated.fullName = updated.username === 'admin' ? 'Administrador Geral' : updated.username;
        changed = true;
      }
      if (updated.active === undefined) {
        updated.active = true;
        changed = true;
      }
      if (updated.failedLoginAttempts === undefined) {
        updated.failedLoginAttempts = 0;
        changed = true;
      }
      // Se a senha não estiver no formato hash SHA-256 (comprimento 64), criptografar
      if (updated.password && updated.password.length !== 64) {
        updated.password = hashPassword(updated.password);
        changed = true;
      }
      return updated;
    });

    localStorage.setItem('financ_users', JSON.stringify(migrated));
    return migrated;
  });

  // Listener em tempo real para sincronização de Usuários com o Firestore Cloud DB
  useEffect(() => {
    try {
      const usersRef = collection(db, 'users');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreUsers: User[] = [];
          snapshot.forEach(docSnap => {
            firestoreUsers.push(docSnap.data() as User);
          });
          setUsers(prev => {
            if (JSON.stringify(prev) === JSON.stringify(firestoreUsers)) return prev;
            return firestoreUsers;
          });
        } else {
          // Se o banco na nuvem estiver vazio, criar usuário admin padrão no Firestore
          const initialAdmin: User = {
            fullName: 'Administrador Geral',
            username: 'admin',
            password: hashPassword('admin'),
            email: 'admin@financpro.com',
            role: 'admin',
            active: true,
            createdAt: new Date().toISOString(),
            failedLoginAttempts: 0
          };
          safeSetDoc(doc(db, 'users', 'admin'), initialAdmin);
        }
      }, (err) => {
        console.warn('Erro na sincronização de usuários Firestore:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Erro Firestore users:', e);
    }
  }, []);

  // Usuário Logado Atualmente
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('financ_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Inicialização de Estado de dados financeiros (dinâmico por usuário)
  const [data, setData] = useState<FinancialData>(() => {
    let parsedData: FinancialData | null = null;
    const savedUser = localStorage.getItem('financ_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser) as User;
        const savedData = localStorage.getItem(`financ_data_v1_${u.username.toLowerCase()}`);
        if (savedData) {
          parsedData = JSON.parse(savedData);
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (!parsedData) {
      // Fallback/Guest data
      const saved = localStorage.getItem('financ_data_v1');
      if (saved) {
        try {
          parsedData = JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }

    if (!parsedData) {
      parsedData = getInitialData();
    }

    return ensureMoradiaAluguel(parsedData);
  });

  const isRemoteUpdateRef = useRef(false);
  const prevDataJsonRef = useRef('');
  const dataRef = useRef(data);
  const activeUsername = currentUser ? currentUser.username.toLowerCase() : 'admin';
  const activeUserRef = useRef(activeUsername);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(7); // Julho
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('financ_dark_mode');
    return savedTheme === 'true';
  });

  // Persistir Usuários no LocalStorage
  useEffect(() => {
    localStorage.setItem('financ_users', JSON.stringify(users));
  }, [users]);

  // Persistir Usuário Logado e carregar seus dados financeiros
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('financ_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('financ_current_user');
    }
  }, [currentUser]);

  // Efeito ao trocar de usuário: carregar dados salvos do novo usuário do LocalStorage
  useEffect(() => {
    if (activeUserRef.current !== activeUsername) {
      activeUserRef.current = activeUsername;
      const savedDataKey = currentUser ? `financ_data_v1_${activeUsername}` : 'financ_data_v1';
      const saved = localStorage.getItem(savedDataKey);
      let userLocalData: FinancialData;
      if (saved) {
        try {
          userLocalData = JSON.parse(saved);
        } catch (e) {
          userLocalData = getInitialData();
        }
      } else {
        userLocalData = getInitialData();
      }
      userLocalData = ensureMoradiaAluguel(userLocalData);
      setData(userLocalData);
      prevDataJsonRef.current = JSON.stringify(userLocalData);
    }
  }, [activeUsername, currentUser]);

  // Listener em tempo real do Firestore para Dados Financeiros do Usuário
  useEffect(() => {
    const currentActiveUser = currentUser ? currentUser.username.toLowerCase() : 'admin';
    try {
      const dataDocRef = doc(db, 'financialData', currentActiveUser);
      const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as FinancialData;
          const localData = dataRef.current;

          // Mesclar dados locais e remotos
          const mergedData = mergeFinancialData(localData, remoteData);
          const mergedJson = JSON.stringify(mergedData);

          if (JSON.stringify(localData) !== mergedJson) {
            prevDataJsonRef.current = mergedJson;
            isRemoteUpdateRef.current = true;
            setData(mergedData);

            const savedDataKey = currentUser ? `financ_data_v1_${currentActiveUser}` : 'financ_data_v1';
            localStorage.setItem(savedDataKey, mergedJson);
          }
        } else {
          const localData = ensureMoradiaAluguel(dataRef.current);
          const dataToSet = {
            ...localData,
            username: currentActiveUser,
            updatedAt: localData.updatedAt || new Date().toISOString()
          };
          safeSetDoc(dataDocRef, dataToSet);
        }
      }, (err) => {
        console.warn('Erro snapshot financialData Firestore:', err?.message || err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Erro Firestore financialData:', e);
    }
  }, [currentUser?.username]);

  // Sincronizar Dados no LocalStorage e no Cloud Firestore
  useEffect(() => {
    const currentActiveUser = currentUser ? currentUser.username.toLowerCase() : 'admin';
    const savedDataKey = currentUser ? `financ_data_v1_${currentActiveUser}` : 'financ_data_v1';

    const dataWithMoradia = ensureMoradiaAluguel(data);
    const currentJson = JSON.stringify(dataWithMoradia);

    // Salvar imediatamente no LocalStorage
    localStorage.setItem(savedDataKey, currentJson);

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (prevDataJsonRef.current === currentJson) {
      return;
    }

    prevDataJsonRef.current = currentJson;

    const timer = setTimeout(() => {
      try {
        const dataDocRef = doc(db, 'financialData', currentActiveUser);
        safeSetDoc(dataDocRef, {
          ...dataWithMoradia,
          username: currentActiveUser,
          updatedAt: dataWithMoradia.updatedAt || new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore write error:', e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [data, currentUser]);

  // Persistir e Aplicar Tema
  useEffect(() => {
    localStorage.setItem('financ_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Obter IP público do usuário para Auditoria
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => {
        if (data.ip) {
          localStorage.setItem('financ_user_ip', data.ip);
        }
      })
      .catch(() => {
        localStorage.setItem('financ_user_ip', '186.221.45.102');
      });
  }, []);

  // --- MÉTODOS DE AUTENTICAÇÃO E ADMINISTRAÇÃO ---
  const loginUser = (username: string, password?: string, twoFactorCode?: string) => {
    const cleanUsername = username.trim().toLowerCase();
    const foundIndex = users.findIndex(u => u.username.toLowerCase() === cleanUsername);

    if (foundIndex === -1) {
      return { success: false, error: 'Usuário não cadastrado.' };
    }

    const found = users[foundIndex];

    // Verificar se a conta está bloqueada temporariamente
    if (found.lockedUntil && new Date(found.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(found.lockedUntil).getTime() - Date.now()) / 1000 / 60);
      return { 
        success: false, 
        error: `Conta bloqueada temporariamente por excesso de tentativas. Tente novamente em ${minutesLeft} minuto(s).` 
      };
    }

    // Verificar se a conta está inativa
    if (found.active === false) {
      return { success: false, error: 'Esta conta está inativada. Entre em contato com o administrador do sistema.' };
    }

    const hashedInput = hashPassword(password || '');
    
    if (found.password === hashedInput) {
      // Verificar 2FA se habilitado
      if (found.twoFactorEnabled && found.twoFactorSecret) {
        const correctCode = getTOTPCode(found.twoFactorSecret);
        if (!twoFactorCode) {
          return { success: false, require2FA: true };
        }
        if (twoFactorCode !== correctCode) {
          return { success: false, error: 'Código de autenticação em duas etapas (2FA) inválido.' };
        }
      }

      // Login bem-sucedido: resetar falhas, salvar login e IP
      const updatedUser: User = {
        ...found,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: localStorage.getItem('financ_user_ip') || '127.0.0.1'
      };

      setUsers(prev => prev.map(u => u.username.toLowerCase() === cleanUsername ? updatedUser : u));
      setCurrentUser(updatedUser);
      safeSetDoc(doc(db, 'users', cleanUsername), updatedUser);

      // Registrar Auditoria
      const ip = localStorage.getItem('financ_user_ip') || '127.0.0.1';
      const activeUser = updatedUser.username;
      const newLog: AuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        username: activeUser,
        timestamp: new Date().toISOString(),
        operation: 'LOGIN',
        module: 'Autenticação',
        details: 'Login efetuado com sucesso',
        ip
      };
      setAuditLogs(prev => [newLog, ...prev]);

      return { success: true };
    } else {
      // Senha incorreta: incrementar tentativas
      const failedAttempts = (found.failedLoginAttempts || 0) + 1;
      let lockTime: string | undefined = undefined;
      let errorMsg = `Senha incorreta. Tentativa ${failedAttempts} de 5.`;

      if (failedAttempts >= 5) {
        lockTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // Bloqueio por 5 minutos
        errorMsg = 'Conta bloqueada temporariamente por excesso de tentativas incorretas (5 minutos).';
      }

      const updatedUser: User = {
        ...found,
        failedLoginAttempts: failedAttempts,
        lockedUntil: lockTime
      };

      setUsers(prev => prev.map(u => u.username.toLowerCase() === cleanUsername ? updatedUser : u));
      safeSetDoc(doc(db, 'users', cleanUsername), updatedUser);

      // Registrar falha na auditoria
      const ip = localStorage.getItem('financ_user_ip') || '127.0.0.1';
      const newLog: AuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        username: found.username,
        timestamp: new Date().toISOString(),
        operation: failedAttempts >= 5 ? 'BLOQUEIO_CONTA' : 'LOGIN_FALHA',
        module: 'Autenticação',
        details: failedAttempts >= 5 
          ? 'Conta bloqueada temporariamente por excesso de tentativas' 
          : `Falha na tentativa de login (${failedAttempts}/5)`,
        ip
      };
      setAuditLogs(prev => [newLog, ...prev]);

      return { success: false, error: errorMsg };
    }
  };

  const logoutUser = () => {
    if (currentUser) {
      addAuditLog('LOGOUT', 'Autenticação', 'Sessão encerrada pelo usuário');
    }
    setCurrentUser(null);
  };

  const registerUser = (
    fullName: string,
    username: string,
    password?: string,
    confirmPassword?: string,
    email?: string,
    role: 'admin' | 'user' = 'user',
    active: boolean = true
  ) => {
    const cleanUsername = username.trim();
    const compareUsername = cleanUsername.toLowerCase();
    
    if (!fullName.trim()) {
      return { success: false, error: 'O nome completo é obrigatório.' };
    }
    if (!compareUsername) {
      return { success: false, error: 'O nome de login não pode estar vazio.' };
    }
    if (!password) {
      return { success: false, error: 'A senha não pode estar vazia.' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'As senhas informadas não coincidem.' };
    }
    
    const exists = users.some(u => u.username.toLowerCase() === compareUsername);
    if (exists) {
      return { success: false, error: 'Este login já está sendo utilizado.' };
    }
    
    const newUser: User = {
      fullName: fullName.trim(),
      username: cleanUsername,
      password: hashPassword(password),
      email: email ? email.trim() : undefined,
      role,
      active,
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0
    };
    
    setUsers(prev => [...prev, newUser]);
    safeSetDoc(doc(db, 'users', compareUsername), newUser);
    addAuditLog('CRIAR_USUARIO', 'Usuários', `Usuário "${cleanUsername}" (${role}) cadastrado no sistema.`);
    return { success: true };
  };

  const updateUser = (
    username: string,
    updatedFields: Partial<Omit<User, 'username' | 'createdAt'>>
  ) => {
    const compareUsername = username.toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === compareUsername);
    if (!found) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const updatedUser = { ...found };

    if (updatedFields.fullName !== undefined) {
      updatedUser.fullName = updatedFields.fullName.trim();
    }
    if (updatedFields.email !== undefined) {
      updatedUser.email = updatedFields.email ? updatedFields.email.trim() : undefined;
    }
    if (updatedFields.role !== undefined) {
      // Bloquear se tentar remover admin do único administrador
      if (compareUsername === 'admin' && updatedFields.role !== 'admin') {
        return { success: false, error: 'Não é possível remover o perfil de administrador do usuário principal "admin".' };
      }
      updatedUser.role = updatedFields.role;
    }
    if (updatedFields.active !== undefined) {
      if (compareUsername === 'admin' && !updatedFields.active) {
        return { success: false, error: 'Não é possível inativar o administrador principal "admin".' };
      }
      updatedUser.active = updatedFields.active;
    }
    if (updatedFields.password !== undefined && updatedFields.password.trim() !== '') {
      updatedUser.password = hashPassword(updatedFields.password);
    }
    if (updatedFields.twoFactorEnabled !== undefined) {
      updatedUser.twoFactorEnabled = updatedFields.twoFactorEnabled;
      if (updatedFields.twoFactorEnabled && !updatedUser.twoFactorSecret) {
        updatedUser.twoFactorSecret = generate2FASecret();
      }
    }

    setUsers(prev => prev.map(u => u.username.toLowerCase() === compareUsername ? updatedUser : u));
    safeSetDoc(doc(db, 'users', compareUsername), updatedUser);

    // Se estiver editando o usuário logado atualmente, atualizar também seu estado
    if (currentUser && currentUser.username.toLowerCase() === compareUsername) {
      setCurrentUser(updatedUser);
    }

    addAuditLog('ATUALIZAR_USUARIO', 'Usuários', `Usuário "${username}" atualizado. Alterações salvas.`);
    return { success: true };
  };

  const deleteUser = (username: string) => {
    const compareUsername = username.toLowerCase();
    if (compareUsername === 'admin') {
      return; // prevent deleting default admin
    }
    if (currentUser && currentUser.username.toLowerCase() === compareUsername) {
      return; // prevent deleting logged-in user
    }
    setUsers(prev => prev.filter(u => u.username.toLowerCase() !== compareUsername));
    safeDeleteDoc(doc(db, 'users', compareUsername));
    safeDeleteDoc(doc(db, 'financialData', compareUsername));
    localStorage.removeItem(`financ_data_v1_${username}`);
    addAuditLog('EXCLUIR_USUARIO', 'Usuários', `Usuário "${username}" e todo seu banco de dados foram excluídos permanentemente.`);
  };

  const changeUserPassword = (username: string, newPassword: string) => {
    const compareUsername = username.toLowerCase();
    setUsers(prev => prev.map(u => {
      if (u.username.toLowerCase() === compareUsername) {
        const updated = { ...u, password: hashPassword(newPassword) };
        if (currentUser && currentUser.username.toLowerCase() === compareUsername) {
          setCurrentUser(updated);
        }
        safeSetDoc(doc(db, 'users', compareUsername), updated);
        return updated;
      }
      return u;
    }));
    addAuditLog('ALTERAR_SENHA', 'Usuários', `Senha do usuário "${username}" redefinida.`);
  };

  const forgotPassword = (usernameOrEmail: string) => {
    const term = usernameOrEmail.trim().toLowerCase();
    const found = users.find(u => 
      u.username.toLowerCase() === term || 
      (u.email && u.email.toLowerCase() === term)
    );

    if (!found) {
      return { success: false, message: 'Usuário ou e-mail não localizado no sistema.' };
    }

    const targetEmail = found.email || `${found.username}@financpro.com`;

    // Registrar ação na auditoria
    addAuditLog('SOLICITACAO_RECOVERY', 'Autenticação', `Solicitação de redefinição de senha para "${found.username}" enviada para ${targetEmail}`);

    return { 
      success: true, 
      message: `Sucesso! Um e-mail com as instruções de redefinição de senha foi enviado para: ${targetEmail}` 
    };
  };

  // --- CRUD SALARIES ---
  const addSalary = (salary: Omit<Salary, 'id'>) => {
    const newSalary: Salary = {
      ...salary,
      id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      salaries: [...prev.salaries, newSalary],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Salários', `Salário "${salary.description}" adicionado. Valor: R$ ${salary.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const updateSalary = (id: string, updated: Partial<Salary>) => {
    setData(prev => {
      const existing = prev.salaries.find(s => s.id === id);
      const updatedList = prev.salaries.map(s => s.id === id ? { ...s, ...updated } : s);
      if (existing) {
        addAuditLog('ATUALIZAR_REGISTRO', 'Salários', `Salário "${existing.description}" atualizado.`);
      }
      return ensureMoradiaAluguel({ ...prev, salaries: updatedList, updatedAt: new Date().toISOString() });
    });
  };

  const deleteSalary = (id: string) => {
    setData(prev => {
      const existing = prev.salaries.find(s => s.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Salários', `Salário "${existing.description}" excluído.`);
      }
      return ensureMoradiaAluguel({
        ...prev,
        salaries: prev.salaries.filter(s => s.id !== id),
        updatedAt: new Date().toISOString()
      });
    });
  };

  // --- CRUD FIXED EXPENSES ---
  const addFixedExpense = (expense: Omit<FixedExpense, 'id' | 'paidMonths'>) => {
    const fixedId = `fix-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    let cardPurchaseId: string | undefined = undefined;
    let linkedPurchase: CardPurchase | null = null;

    if (expense.paymentMethod === 'Cartão' && expense.cardId && expense.purchaseDate) {
      const firstDue = getCardFirstDueDate(expense.purchaseDate, expense.cardId, data.creditCards);
      cardPurchaseId = `pur-fixed-${fixedId}`;
      linkedPurchase = {
        id: cardPurchaseId,
        cardId: expense.cardId,
        description: `Conta Fixa: ${expense.name}`,
        category: expense.category,
        totalValue: expense.value,
        totalInstallments: 1,
        purchaseDate: expense.purchaseDate,
        firstDueDate: firstDue
      };
    }

    const newExpense: FixedExpense = {
      ...expense,
      id: fixedId,
      paidMonths: [],
      cardPurchaseId
    };

    setData(prev => {
      const purchases = linkedPurchase 
        ? [...prev.cardPurchases, linkedPurchase] 
        : prev.cardPurchases;
      const res = {
        ...prev,
        fixedExpenses: [...prev.fixedExpenses, newExpense],
        cardPurchases: purchases,
        updatedAt: new Date().toISOString()
      };
      return ensureMoradiaAluguel(res);
    });

    addAuditLog('ADICIONAR_REGISTRO', 'Contas Fixas', `Conta fixa "${expense.name}" adicionada. Valor: R$ ${expense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const updateFixedExpense = (id: string, updated: Partial<FixedExpense>) => {
    setData(prev => {
      const existing = prev.fixedExpenses.find(f => f.id === id);
      if (!existing) return prev;

      let nextCardPurchaseId = updated.cardPurchaseId !== undefined ? updated.cardPurchaseId : existing.cardPurchaseId;
      let purchases = [...prev.cardPurchases];

      const merged = { ...existing, ...updated };

      // Caso 1: Se já existia compra, remover antiga para re-lançar ou se mudou método
      if (existing.cardPurchaseId) {
        purchases = purchases.filter(p => p.id !== existing.cardPurchaseId);
        nextCardPurchaseId = undefined;
      }

      // Caso 2: Novo método de pagamento é Cartão
      let linkedPurchase: CardPurchase | null = null;
      if (merged.paymentMethod === 'Cartão' && merged.cardId && merged.purchaseDate) {
        const firstDue = getCardFirstDueDate(merged.purchaseDate, merged.cardId, prev.creditCards);
        const purchaseId = existing.cardPurchaseId || `pur-fixed-${id}`;
        nextCardPurchaseId = purchaseId;
        linkedPurchase = {
          id: purchaseId,
          cardId: merged.cardId,
          description: `Conta Fixa: ${merged.name}`,
          category: merged.category,
          totalValue: merged.value,
          totalInstallments: 1,
          purchaseDate: merged.purchaseDate,
          firstDueDate: firstDue
        };
      }

      if (linkedPurchase) {
        purchases.push(linkedPurchase);
      }

      const updatedExpense = {
        ...merged,
        cardPurchaseId: nextCardPurchaseId
      };

      if (existing) {
        addAuditLog('ATUALIZAR_REGISTRO', 'Contas Fixas', `Conta fixa "${existing.name}" atualizada.`);
      }

      const res = {
        ...prev,
        fixedExpenses: prev.fixedExpenses.map(f => f.id === id ? updatedExpense : f),
        cardPurchases: purchases,
        updatedAt: new Date().toISOString()
      };
      return ensureMoradiaAluguel(res);
    });
  };

  const toggleFixedExpensePaid = (id: string, yearMonth: string) => {
    setData(prev => {
      const existing = prev.fixedExpenses.find(f => f.id === id);
      if (existing) {
        const isPaid = (existing.paidMonths || []).includes(yearMonth);
        addAuditLog('ATUALIZAR_REGISTRO', 'Contas Fixas', `Status de pagamento da conta "${existing.name}" marcado como ${isPaid ? 'Não Pago' : 'Pago'} para ${yearMonth}.`);
      }
      const res = {
        ...prev,
        fixedExpenses: prev.fixedExpenses.map(f => {
          if (f.id !== id) return f;
          const currentPaidMonths = f.paidMonths || [];
          const isCurrentlyPaid = currentPaidMonths.includes(yearMonth);
          const newPaidMonths = isCurrentlyPaid
            ? currentPaidMonths.filter(m => m !== yearMonth)
            : [...currentPaidMonths, yearMonth];
          return {
            ...f,
            paidMonths: newPaidMonths,
            isPaid: newPaidMonths.includes(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`)
          };
        }),
        updatedAt: new Date().toISOString()
      };
      return ensureMoradiaAluguel(res);
    });
  };

  const deleteFixedExpense = (id: string) => {
    setData(prev => {
      const existing = prev.fixedExpenses.find(f => f.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Contas Fixas', `Conta fixa "${existing.name}" excluída.`);
      }
      let purchases = prev.cardPurchases;
      if (existing && existing.cardPurchaseId) {
        purchases = purchases.filter(p => p.id !== existing.cardPurchaseId);
      }
      const res = {
        ...prev,
        fixedExpenses: prev.fixedExpenses.filter(f => f.id !== id),
        cardPurchases: purchases,
        updatedAt: new Date().toISOString()
      };
      return ensureMoradiaAluguel(res);
    });
  };

  // --- CRUD VARIABLE EXPENSES ---
  const addVariableExpense = (expense: Omit<VariableExpense, 'id'>) => {
    const varId = `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    let cardPurchaseId: string | undefined = undefined;
    let linkedPurchase: CardPurchase | null = null;

    if (expense.paymentMethod === 'Cartão de Crédito' && expense.cardId) {
      const purchaseDate = expense.purchaseDate || expense.date;
      const firstDue = expense.firstDueDate || getCardFirstDueDate(purchaseDate, expense.cardId, data.creditCards);
      cardPurchaseId = `pur-var-${varId}`;
      linkedPurchase = {
        id: cardPurchaseId,
        cardId: expense.cardId,
        description: expense.description,
        category: expense.category,
        totalValue: expense.value,
        totalInstallments: expense.totalInstallments || 1,
        purchaseDate: purchaseDate,
        firstDueDate: firstDue
      };
    }

    const newExpense: VariableExpense = {
      ...expense,
      id: varId,
      cardPurchaseId
    };

    setData(prev => {
      const purchases = linkedPurchase 
        ? [...prev.cardPurchases, linkedPurchase] 
        : prev.cardPurchases;
      const res = {
        ...prev,
        variableExpenses: [...prev.variableExpenses, newExpense],
        cardPurchases: purchases,
        updatedAt: new Date().toISOString()
      };
      return ensureMoradiaAluguel(res);
    });

    addAuditLog('ADICIONAR_REGISTRO', 'Contas Variáveis', `Despesa variável "${expense.description}" adicionada. Valor: R$ ${expense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const updateVariableExpense = (id: string, updated: Partial<VariableExpense>) => {
    setData(prev => {
      const existing = prev.variableExpenses.find(v => v.id === id);
      if (!existing) return prev;

      let nextCardPurchaseId = updated.cardPurchaseId !== undefined ? updated.cardPurchaseId : existing.cardPurchaseId;
      let purchases = [...prev.cardPurchases];

      const merged = { ...existing, ...updated };

      // Remover compra vinculada se já existia, para re-lançar/atualizar
      if (existing.cardPurchaseId) {
        purchases = purchases.filter(p => p.id !== existing.cardPurchaseId);
        nextCardPurchaseId = undefined;
      }

      // Caso o método seja Cartão de Crédito e tenha cartão associado
      let linkedPurchase: CardPurchase | null = null;
      if (merged.paymentMethod === 'Cartão de Crédito' && merged.cardId) {
        const purchaseDate = merged.purchaseDate || merged.date;
        const firstDue = merged.firstDueDate || getCardFirstDueDate(purchaseDate, merged.cardId, prev.creditCards);
        const purchaseId = existing.cardPurchaseId || `pur-var-${id}`;
        nextCardPurchaseId = purchaseId;
        linkedPurchase = {
          id: purchaseId,
          cardId: merged.cardId,
          description: merged.description,
          category: merged.category,
          totalValue: merged.value,
          totalInstallments: merged.totalInstallments || 1,
          purchaseDate: purchaseDate,
          firstDueDate: firstDue
        };
      }

      if (linkedPurchase) {
        purchases.push(linkedPurchase);
      }

      const updatedExpense = {
        ...merged,
        cardPurchaseId: nextCardPurchaseId
      };

      addAuditLog('ATUALIZAR_REGISTRO', 'Contas Variáveis', `Despesa variável "${existing.description}" atualizada.`);

      const res = {
        ...prev,
        variableExpenses: prev.variableExpenses.map(v => v.id === id ? updatedExpense : v),
        cardPurchases: purchases,
        updatedAt: new Date().toISOString()
      };
      return ensureMoradiaAluguel(res);
    });
  };

  const deleteVariableExpense = (id: string) => {
    setData(prev => {
      const existing = prev.variableExpenses.find(v => v.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Contas Variáveis', `Despesa variável "${existing.description}" excluída.`);
      }
      let purchases = prev.cardPurchases;
      if (existing && existing.cardPurchaseId) {
        purchases = purchases.filter(p => p.id !== existing.cardPurchaseId);
      }
      const res = {
        ...prev,
        variableExpenses: prev.variableExpenses.filter(v => v.id !== id),
        cardPurchases: purchases,
        updatedAt: new Date().toISOString()
      };
      return ensureMoradiaAluguel(res);
    });
  };

  // --- CRUD CONSIGNADOS ---
  const addConsignado = (consignado: Omit<Consignado, 'id'>) => {
    const newConsignado: Consignado = {
      ...consignado,
      id: `con-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      consignados: [...prev.consignados, newConsignado],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Consignados', `Empréstimo consignado do banco "${consignado.bank}" adicionado. Valor total: R$ ${consignado.borrowedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const updateConsignado = (id: string, updated: Partial<Consignado>) => {
    setData(prev => {
      const existing = prev.consignados.find(c => c.id === id);
      const updatedList = prev.consignados.map(c => c.id === id ? { ...c, ...updated } : c);
      if (existing) {
        addAuditLog('ATUALIZAR_REGISTRO', 'Consignados', `Consignado do banco "${existing.bank}" atualizado.`);
      }
      return ensureMoradiaAluguel({ ...prev, consignados: updatedList, updatedAt: new Date().toISOString() });
    });
  };

  const deleteConsignado = (id: string) => {
    setData(prev => {
      const existing = prev.consignados.find(c => c.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Consignados', `Consignado do banco "${existing.bank}" excluído.`);
      }
      return ensureMoradiaAluguel({
        ...prev,
        consignados: prev.consignados.filter(c => c.id !== id),
        updatedAt: new Date().toISOString()
      });
    });
  };

  // --- CRUD CREDIT CARDS ---
  const addCreditCard = (card: Omit<CreditCard, 'id'>) => {
    const newCard: CreditCard = {
      ...card,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      creditCards: [...prev.creditCards, newCard],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Cartões', `Cartão de crédito "${card.cardName}" adicionado. Limite: R$ ${card.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const updateCreditCard = (id: string, updated: Partial<CreditCard>) => {
    setData(prev => {
      const existing = prev.creditCards.find(c => c.id === id);
      const updatedList = prev.creditCards.map(c => c.id === id ? { ...c, ...updated } : c);
      if (existing) {
        addAuditLog('ATUALIZAR_REGISTRO', 'Cartões', `Cartão de crédito "${existing.cardName}" atualizado.`);
      }
      return ensureMoradiaAluguel({ ...prev, creditCards: updatedList, updatedAt: new Date().toISOString() });
    });
  };

  const deleteCreditCard = (id: string) => {
    setData(prev => {
      const existing = prev.creditCards.find(c => c.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Cartões', `Cartão de crédito "${existing.cardName}" e todas as compras atreladas a ele foram excluídos.`);
      }
      return ensureMoradiaAluguel({
        ...prev,
        creditCards: prev.creditCards.filter(c => c.id !== id),
        cardPurchases: prev.cardPurchases.filter(p => p.cardId !== id),
        updatedAt: new Date().toISOString()
      });
    });
  };

  // --- CRUD CARD PURCHASES ---
  const addCardPurchase = (purchase: Omit<CardPurchase, 'id'>) => {
    const newPurchase: CardPurchase = {
      ...purchase,
      id: `pur-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      cardPurchases: [...prev.cardPurchases, newPurchase],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Cartões', `Compra parcelada "${purchase.description}" adicionada. Valor total: R$ ${purchase.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${purchase.totalInstallments}x`);
  };

  const updateCardPurchase = (id: string, updated: Partial<CardPurchase>) => {
    setData(prev => {
      const existing = prev.cardPurchases.find(p => p.id === id);
      const updatedList = prev.cardPurchases.map(p => p.id === id ? { ...p, ...updated } : p);
      if (existing) {
        addAuditLog('ATUALIZAR_REGISTRO', 'Cartões', `Compra "${existing.description}" atualizada.`);
      }
      return ensureMoradiaAluguel({ ...prev, cardPurchases: updatedList, updatedAt: new Date().toISOString() });
    });
  };

  const deleteCardPurchase = (id: string) => {
    setData(prev => {
      const existing = prev.cardPurchases.find(p => p.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Cartões', `Compra "${existing.description}" excluída.`);
      }
      return ensureMoradiaAluguel({
        ...prev,
        cardPurchases: prev.cardPurchases.filter(p => p.id !== id),
        updatedAt: new Date().toISOString()
      });
    });
  };

  // --- SAVINGS GOALS ---
  const setSavingsGoal = (month: string, amount: number, notes?: string) => {
    setData(prev => {
      const exists = prev.savingsGoals.find(g => g.targetMonth === month);
      let newGoals;
      if (exists) {
        newGoals = prev.savingsGoals.map(g => g.targetMonth === month ? { ...g, targetAmount: amount, notes } : g);
      } else {
        newGoals = [...prev.savingsGoals, { id: `goal-${Date.now()}`, targetAmount: amount, targetMonth: month, notes }];
      }
      addAuditLog('ATUALIZAR_REGISTRO', 'Metas de Poupança', `Meta de poupança para ${month} definida para R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
      return ensureMoradiaAluguel({ ...prev, savingsGoals: newGoals, updatedAt: new Date().toISOString() });
    });
  };

  // --- EMERGENCY FUND ---
  const updateEmergencyFund = (fund: Partial<EmergencyFund>) => {
    setData(prev => {
      addAuditLog('ATUALIZAR_REGISTRO', 'Reserva de Emergência', `Reserva de emergência atualizada.`);
      return ensureMoradiaAluguel({
        ...prev,
        emergencyFund: { ...prev.emergencyFund, ...fund },
        updatedAt: new Date().toISOString()
      });
    });
  };

  // --- CRUD INVESTMENTS ---
  const addInvestment = (investment: Omit<Investment, 'id'>) => {
    const newInvestment: Investment = {
      ...investment,
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      investments: [...prev.investments, newInvestment],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Investimentos', `Investimento "${investment.name}" de tipo ${investment.type} adicionado. Valor: R$ ${investment.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const updateInvestment = (id: string, updated: Partial<Investment>) => {
    setData(prev => {
      const existing = prev.investments.find(i => i.id === id);
      const updatedList = prev.investments.map(i => i.id === id ? { ...i, ...updated } : i);
      if (existing) {
        addAuditLog('ATUALIZAR_REGISTRO', 'Investimentos', `Investimento "${existing.name}" atualizado.`);
      }
      return ensureMoradiaAluguel({ ...prev, investments: updatedList, updatedAt: new Date().toISOString() });
    });
  };

  const deleteInvestment = (id: string) => {
    setData(prev => {
      const existing = prev.investments.find(i => i.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Investimentos', `Investimento "${existing.name}" excluído.`);
      }
      return ensureMoradiaAluguel({
        ...prev,
        investments: prev.investments.filter(i => i.id !== id),
        updatedAt: new Date().toISOString()
      });
    });
  };

  // --- CRUD PATRIMONY ---
  const addPatrimonyItem = (item: Omit<PatrimonyItem, 'id'>) => {
    const newItem: PatrimonyItem = {
      ...item,
      id: `pat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      patrimonyItems: [...prev.patrimonyItems, newItem],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Patrimônio', `Item de patrimônio "${item.name}" adicionado. Valor estimado: R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const updatePatrimonyItem = (id: string, updated: Partial<PatrimonyItem>) => {
    setData(prev => {
      const existing = prev.patrimonyItems.find(p => p.id === id);
      const updatedList = prev.patrimonyItems.map(p => p.id === id ? { ...p, ...updated } : p);
      if (existing) {
        addAuditLog('ATUALIZAR_REGISTRO', 'Patrimônio', `Item de patrimônio "${existing.name}" atualizado.`);
      }
      return ensureMoradiaAluguel({ ...prev, patrimonyItems: updatedList, updatedAt: new Date().toISOString() });
    });
  };

  const deletePatrimonyItem = (id: string) => {
    setData(prev => {
      const existing = prev.patrimonyItems.find(p => p.id === id);
      if (existing) {
        addAuditLog('EXCLUIR_REGISTRO', 'Patrimônio', `Item de patrimônio "${existing.name}" excluído.`);
      }
      return ensureMoradiaAluguel({
        ...prev,
        patrimonyItems: prev.patrimonyItems.filter(p => p.id !== id),
        updatedAt: new Date().toISOString()
      });
    });
  };

  // --- CRUD CATEGORIES ---
  const addFixedCategory = (category: Omit<ExpenseCategory, 'id'>) => {
    const newCat: ExpenseCategory = {
      ...category,
      id: `fcat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      fixedCategories: [...(prev.fixedCategories || []), newCat],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Categorias', `Categoria fixa "${category.name}" cadastrada.`);
  };

  const updateFixedCategory = (id: string, updated: Partial<ExpenseCategory>) => {
    setData(prev => {
      const list = prev.fixedCategories || [];
      const updatedList = list.map(c => c.id === id ? { ...c, ...updated } : c);
      return ensureMoradiaAluguel({ ...prev, fixedCategories: updatedList, updatedAt: new Date().toISOString() });
    });
    addAuditLog('ATUALIZAR_REGISTRO', 'Categorias', `Categoria fixa atualizada.`);
  };

  const deleteFixedCategory = (id: string) => {
    setData(prev => {
      const list = prev.fixedCategories || [];
      const filtered = list.filter(c => c.id !== id);
      return ensureMoradiaAluguel({ ...prev, fixedCategories: filtered, updatedAt: new Date().toISOString() });
    });
    addAuditLog('EXCLUIR_REGISTRO', 'Categorias', `Categoria fixa excluída.`);
  };

  const addVariableCategory = (category: Omit<ExpenseCategory, 'id'>) => {
    const newCat: ExpenseCategory = {
      ...category,
      id: `vcat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setData(prev => ensureMoradiaAluguel({
      ...prev,
      variableCategories: [...(prev.variableCategories || []), newCat],
      updatedAt: new Date().toISOString()
    }));
    addAuditLog('ADICIONAR_REGISTRO', 'Categorias', `Categoria variável "${category.name}" cadastrada.`);
  };

  const updateVariableCategory = (id: string, updated: Partial<ExpenseCategory>) => {
    setData(prev => {
      const list = prev.variableCategories || [];
      const updatedList = list.map(c => c.id === id ? { ...c, ...updated } : c);
      return ensureMoradiaAluguel({ ...prev, variableCategories: updatedList, updatedAt: new Date().toISOString() });
    });
    addAuditLog('ATUALIZAR_REGISTRO', 'Categorias', `Categoria variável atualizada.`);
  };

  const deleteVariableCategory = (id: string) => {
    setData(prev => {
      const list = prev.variableCategories || [];
      const filtered = list.filter(c => c.id !== id);
      return ensureMoradiaAluguel({ ...prev, variableCategories: filtered, updatedAt: new Date().toISOString() });
    });
    addAuditLog('EXCLUIR_REGISTRO', 'Categorias', `Categoria variável excluída.`);
  };

  // --- EXPORT / IMPORT & RESET ---
  const importData = (imported: any): boolean => {
    try {
      if (!imported || typeof imported !== 'object') return false;
      
      const verifiedData: FinancialData = {
        salaries: Array.isArray(imported.salaries) ? imported.salaries : [],
        fixedExpenses: Array.isArray(imported.fixedExpenses) ? imported.fixedExpenses : [],
        variableExpenses: Array.isArray(imported.variableExpenses) ? imported.variableExpenses : [],
        consignados: Array.isArray(imported.consignados) ? imported.consignados : [],
        creditCards: Array.isArray(imported.creditCards) ? imported.creditCards : [],
        cardPurchases: Array.isArray(imported.cardPurchases) ? imported.cardPurchases : [],
        savingsGoals: Array.isArray(imported.savingsGoals) ? imported.savingsGoals : [],
        emergencyFund: imported.emergencyFund && typeof imported.emergencyFund === 'object'
          ? { targetValue: Number(imported.emergencyFund.targetValue) || 0, currentValue: Number(imported.emergencyFund.currentValue) || 0 }
          : { targetValue: 0, currentValue: 0 },
        investments: Array.isArray(imported.investments) ? imported.investments : [],
        patrimonyItems: Array.isArray(imported.patrimonyItems) ? imported.patrimonyItems : []
      };

      setData(verifiedData);
      addAuditLog('RESTAURAR_BACKUP', 'Relatórios & Backup', 'Banco de dados importado e restaurado com sucesso a partir de arquivo JSON.');
      return true;
    } catch (e) {
      console.error('Erro na importação dos dados', e);
      return false;
    }
  };

  const clearAllData = () => {
    setData({
      salaries: [],
      fixedExpenses: [],
      variableExpenses: [],
      consignados: [],
      creditCards: [],
      cardPurchases: [],
      savingsGoals: [],
      emergencyFund: { targetValue: 0, currentValue: 0 },
      investments: [],
      patrimonyItems: []
    });
    addAuditLog('LIMPAR_DADOS', 'Relatórios & Backup', 'Todos os dados financeiros ativos foram redefinidos e zerados.');
  };

  const removeDatabaseRedundancies = (): { removedCount: number; details: string } => {
    let removedCount = 0;

    const deduplicateArray = <T,>(arr: T[], getKey: (item: T) => string): T[] => {
      const seenKeys = new Set<string>();
      const result: T[] = [];
      for (const item of arr) {
        if (!item) continue;
        const key = getKey(item);
        if (seenKeys.has(key)) {
          removedCount++;
        } else {
          seenKeys.add(key);
          result.push(item);
        }
      }
      return result;
    };

    const newSalaries = deduplicateArray(
      data.salaries || [],
      s => `${(s.source || s.description || '').trim().toLowerCase()}_${s.value || s.amount}_${s.month}_${s.year}`
    );

    const newFixed = deduplicateArray(
      data.fixedExpenses || [],
      f => `${(f.description || '').trim().toLowerCase()}_${f.amount}_${f.dueDate}_${f.category}`
    );

    const newVariable = deduplicateArray(
      data.variableExpenses || [],
      v => `${(v.description || '').trim().toLowerCase()}_${v.amount}_${v.date}_${v.category}`
    );

    const newConsignados = deduplicateArray(
      data.consignados || [],
      c => `${(c.bank || '').trim().toLowerCase()}_${(c.description || '').trim().toLowerCase()}_${c.totalAmount}_${c.monthlyPayment}`
    );

    const newCards = deduplicateArray(
      data.creditCards || [],
      c => `${(c.cardName || '').trim().toLowerCase()}_${c.lastFourDigits}`
    );

    const newPurchases = deduplicateArray(
      data.cardPurchases || [],
      p => `${(p.description || '').trim().toLowerCase()}_${p.totalValue}_${p.cardId}_${p.purchaseDate}`
    );

    const newGoals = deduplicateArray(
      data.savingsGoals || [],
      g => `${(g.name || '').trim().toLowerCase()}_${g.targetValue}`
    );

    const newInvestments = deduplicateArray(
      data.investments || [],
      i => `${(i.name || '').trim().toLowerCase()}_${i.value}_${i.type}`
    );

    const newPatrimony = deduplicateArray(
      data.patrimonyItems || [],
      m => `${(m.name || '').trim().toLowerCase()}_${m.value}`
    );

    const newAudit = deduplicateArray(
      auditLogs || [],
      l => `${l.timestamp}_${l.operation}_${l.username}_${(l.details || '').trim().toLowerCase()}`
    );

    setData({
      salaries: newSalaries,
      fixedExpenses: newFixed,
      variableExpenses: newVariable,
      consignados: newConsignados,
      creditCards: newCards,
      cardPurchases: newPurchases,
      savingsGoals: newGoals,
      emergencyFund: data.emergencyFund,
      investments: newInvestments,
      patrimonyItems: newPatrimony
    });

    if (auditLogs.length !== newAudit.length) {
      setAuditLogs(newAudit);
    }

    const detailsMsg = `Desduplicação concluída: ${removedCount} registro(s) duplicado(s) ou redundante(s) foram identificados e removidos do banco de dados.`;
    addAuditLog('DESDUPLICAR_BANCO', 'Banco de Dados', detailsMsg);

    return { removedCount, details: detailsMsg };
  };

  // --- CÁLCULO E GESTÃO DE ALERTAS ---
  const [allGeneratedAlerts, setAllGeneratedAlerts] = useState<FinancialAlert[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [hideAlertsPanel, setHideAlertsPanelState] = useState<boolean>(false);

  const userKey = currentUser ? currentUser.username.toLowerCase() : 'default';

  // Carregar preferências salvas de alertas
  useEffect(() => {
    try {
      const savedDismissed = localStorage.getItem(`financ_dismissed_alerts_${userKey}`);
      if (savedDismissed) {
        setDismissedAlertIds(JSON.parse(savedDismissed));
      } else {
        setDismissedAlertIds([]);
      }

      const savedHide = localStorage.getItem(`financ_hide_alerts_${userKey}`);
      setHideAlertsPanelState(savedHide === 'true');
    } catch {
      setDismissedAlertIds([]);
      setHideAlertsPanelState(false);
    }
  }, [userKey]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlertIds(prev => {
      if (prev.includes(alertId)) return prev;
      const updated = [...prev, alertId];
      try {
        localStorage.setItem(`financ_dismissed_alerts_${userKey}`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const restoreAlert = (alertId: string) => {
    setDismissedAlertIds(prev => {
      const updated = prev.filter(id => id !== alertId);
      try {
        localStorage.setItem(`financ_dismissed_alerts_${userKey}`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const dismissAllAlerts = () => {
    const allIds = allGeneratedAlerts.map(a => a.id);
    setDismissedAlertIds(allIds);
    try {
      localStorage.setItem(`financ_dismissed_alerts_${userKey}`, JSON.stringify(allIds));
    } catch (e) {
      console.error(e);
    }
  };

  const restoreAllAlerts = () => {
    setDismissedAlertIds([]);
    try {
      localStorage.removeItem(`financ_dismissed_alerts_${userKey}`);
    } catch (e) {
      console.error(e);
    }
  };

  const setHideAlertsPanel = (hide: boolean) => {
    setHideAlertsPanelState(hide);
    try {
      localStorage.setItem(`financ_hide_alerts_${userKey}`, String(hide));
    } catch (e) {
      console.error(e);
    }
  };

  const alerts = allGeneratedAlerts.filter(a => !dismissedAlertIds.includes(a.id));

  useEffect(() => {
    const list: FinancialAlert[] = [];
    const today = new Date();
    const curDay = today.getDate();
    const filterYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    // 1. Contas fixas vencendo e atrasadas
    data.fixedExpenses.forEach(f => {
      // Verifica se a conta fixa se aplica a esse mês (com base nas datas de vigência)
      const startDateObj = new Date(f.startDate);
      const startYearMonth = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;
      if (startYearMonth > filterYearMonth) return; // Não iniciou ainda
      
      if (f.endDate) {
        const endDateObj = new Date(f.endDate);
        const endYearMonth = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}`;
        if (endYearMonth < filterYearMonth) return; // Já expirou
      }

      const isPaidThisMonth = (f.paidMonths || []).includes(filterYearMonth);
      if (!isPaidThisMonth) {
        if (f.dueDay < curDay) {
          list.push({
            id: `alert-fix-late-${f.id}`,
            type: 'atrasado',
            title: `Conta Atrasada: ${f.name}`,
            description: `Venceu no dia ${f.dueDay} deste mês. Valor: R$ ${f.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            severity: 'danger',
            dueDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(f.dueDay).padStart(2, '0')}`
          });
        } else if (f.dueDay >= curDay && f.dueDay - curDay <= 3) {
          list.push({
            id: `alert-fix-due-${f.id}`,
            type: 'vencendo',
            title: `Conta Vencendo: ${f.name}`,
            description: `Vence no dia ${f.dueDay} (em ${f.dueDay - curDay} dias). Valor: R$ ${f.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            severity: 'warning',
            dueDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(f.dueDay).padStart(2, '0')}`
          });
        }
      }
    });

    // 2. Fechamento de cartão de crédito nas próximas datas
    data.creditCards.forEach(card => {
      if (!card.isActive) return;
      
      // Calcula o total em aberto
      // Total de parcelas restantes a vencer a partir do mês corrente
      let cardDebt = 0;
      data.cardPurchases
        .filter(p => p.cardId === card.id)
        .forEach(p => {
          const firstDue = new Date(p.firstDueDate + 'T00:00:00');
          for (let i = 0; i < p.totalInstallments; i++) {
            const installmentDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
            const instYearMonth = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;
            if (instYearMonth >= filterYearMonth) {
              cardDebt += p.totalValue / p.totalInstallments;
            }
          }
        });

      const limitUsagePercent = card.limit > 0 ? (cardDebt / card.limit) : 0;
      if (limitUsagePercent >= 0.8) {
        list.push({
          id: `alert-card-limit-${card.id}`,
          type: 'limite_cartao',
          title: `Limite do Cartão Próximo ao Fim: ${card.cardName}`,
          description: `Você comprometeu ${(limitUsagePercent * 100).toFixed(1)}% do limite de R$ ${card.limit.toLocaleString('pt-BR')} com compras abertas (Total: R$ ${cardDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
          severity: 'danger'
        });
      }

      if (card.closingDay >= curDay && card.closingDay - curDay <= 2) {
        list.push({
          id: `alert-card-close-${card.id}`,
          type: 'fechamento_cartao',
          title: `Fatura Fechando: ${card.cardName}`,
          description: `O fechamento ocorre no dia ${card.closingDay} (daqui a ${card.closingDay - curDay} dias).`,
          severity: 'info'
        });
      }
    });

    // 3. Consignados com parcelas próximas
    data.consignados.forEach(c => {
      if (c.isPaid) return;
      const loanDateObj = new Date(c.firstPaymentDate + 'T00:00:00');
      const dueDay = loanDateObj.getDate();
      
      if (dueDay >= curDay && dueDay - curDay <= 3) {
        list.push({
          id: `alert-consignado-${c.id}`,
          type: 'consignado_proximo',
          title: `Parcela de Consignado Próxima: ${c.bank}`,
          description: `A parcela mensal de R$ ${c.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vence todo dia ${dueDay}.`,
          severity: 'warning'
        });
      }
    });

    // 4. Compras de cartão com parcelas terminando (faltando 1 ou 2)
    data.cardPurchases.forEach(p => {
      const firstDue = new Date(p.firstDueDate + 'T00:00:00');
      let installmentsPaid = 0;
      
      for (let i = 0; i < p.totalInstallments; i++) {
        const installmentDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
        const instYearMonth = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;
        if (instYearMonth < filterYearMonth) {
          installmentsPaid++;
        }
      }

      const remaining = p.totalInstallments - installmentsPaid;
      if (remaining > 0 && remaining <= 2) {
        list.push({
          id: `alert-pur-end-${p.id}`,
          type: 'parcelas_terminando',
          title: `Compra Quase Quitada: ${p.description}`,
          description: `Resta apenas ${remaining} de ${p.totalInstallments} parcelas de R$ ${(p.totalValue / p.totalInstallments).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} no cartão.`,
          severity: 'info'
        });
      }
    });

    setAllGeneratedAlerts(list);
  }, [data, selectedYear, selectedMonth]);

  return (
    <FinancialContext.Provider value={{
      data,
      selectedYear,
      selectedMonth,
      setSelectedYear,
      setSelectedMonth,
      addSalary,
      updateSalary,
      deleteSalary,
      addFixedExpense,
      updateFixedExpense,
      toggleFixedExpensePaid,
      deleteFixedExpense,
      addVariableExpense,
      updateVariableExpense,
      deleteVariableExpense,
      addConsignado,
      updateConsignado,
      deleteConsignado,
      addCreditCard,
      updateCreditCard,
      deleteCreditCard,
      addCardPurchase,
      updateCardPurchase,
      deleteCardPurchase,
      setSavingsGoal,
      updateEmergencyFund,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      addPatrimonyItem,
      updatePatrimonyItem,
      deletePatrimonyItem,
      addFixedCategory,
      updateFixedCategory,
      deleteFixedCategory,
      addVariableCategory,
      updateVariableCategory,
      deleteVariableCategory,
      alerts,
      allGeneratedAlerts,
      dismissedAlertIds,
      dismissAlert,
      restoreAlert,
      dismissAllAlerts,
      restoreAllAlerts,
      hideAlertsPanel,
      setHideAlertsPanel,
      importData,
      clearAllData,
      removeDatabaseRedundancies,
      darkMode,
      setDarkMode,
      users,
      currentUser,
      loginUser,
      logoutUser,
      registerUser,
      updateUser,
      deleteUser,
      changeUserPassword,
      forgotPassword,
      auditLogs,
      addAuditLog,
      clearAuditLogs
    }}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial deve ser usado com um FinancialProvider');
  }
  return context;
}
