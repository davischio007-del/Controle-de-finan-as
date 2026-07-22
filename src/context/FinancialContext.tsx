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
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

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
  
  // Status de Sincronização e Conexão Firestore
  isOffline: boolean;
  isSyncPending: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  
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
  loginUser: (username: string, password?: string, twoFactorCode?: string) => Promise<{ success: boolean; error?: string; require2FA?: boolean }>;
  logoutUser: () => Promise<void>;
  registerUser: (
    fullName: string,
    username: string,
    password?: string,
    confirmPassword?: string,
    email?: string,
    role?: 'admin' | 'user',
    active?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  updateUser: (
    username: string,
    updatedFields: Partial<Omit<User, 'username' | 'createdAt'>>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (username: string) => Promise<void>;
  changeUserPassword: (username: string, newPassword: string) => Promise<void>;
  changeAuthEmail: (currentPassword: string, newEmail: string) => Promise<{ success: boolean; error?: string }>;
  changeAuthPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (usernameOrEmail: string) => Promise<{ success: boolean; message: string }>;

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
  // Estados de conexão e sincronização
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isSyncPending, setIsSyncPending] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  // Monitorar estado da conexão com a internet
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setSyncStatus('synced');
    };
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Lista de Auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('financ_audit_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return [];
  });

  // Persistir Logs de Auditoria no Cache Local
  useEffect(() => {
    localStorage.setItem('financ_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Listener em tempo real do Firestore para Audit Logs
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
        console.warn('Alerta ou erro em auditLogs listener:', err?.message || err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Audit logs firestore warning:', e);
    }
  }, []);

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
    
    // Salvar no Firestore se houver conexão
    try {
      setDoc(doc(db, 'auditLogs', newLog.id), newLog).catch(err => {
        console.warn('Erro ao salvar audit log no Firestore:', err);
      });
    } catch {
      // ignore
    }
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
  };

  // Estado de Usuários
  const [users, setUsers] = useState<User[]>([]);

  // Usuário Logado Atualmente (Autenticado via Firebase Auth)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Dados Financeiros
  const [data, setData] = useState<FinancialData>(() => {
    return ensureMoradiaAluguel(getInitialData());
  });

  const isRemoteUpdateRef = useRef(false);
  const prevDataJsonRef = useRef('');
  const dataRef = useRef(data);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('financ_dark_mode');
    return savedTheme === 'true';
  });

  // --- FIREBASE AUTHENTICATION & SESSION PERSISTENCE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const uid = fbUser.uid;
        const userEmail = fbUser.email || `${uid}@financpro.com`;

        // Buscar dados de perfil do usuário em /users/{uid}
        let userProfile: User;
        try {
          const userDocRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            userProfile = { uid, ...userSnap.data() } as User;
          } else {
            // Criar perfil padrão se for a primeira vez
            const isFirstAdmin = userEmail.includes('admin');
            userProfile = {
              uid,
              fullName: isFirstAdmin ? 'Administrador Geral' : (fbUser.displayName || userEmail.split('@')[0]),
              username: userEmail.split('@')[0],
              email: userEmail,
              role: isFirstAdmin ? 'admin' : 'user',
              active: true,
              createdAt: new Date().toISOString(),
              failedLoginAttempts: 0
            };
            await setDoc(userDocRef, userProfile);
          }
        } catch (err) {
          console.warn('Erro ao carregar perfil do usuário do Firestore:', err);
          userProfile = {
            uid,
            fullName: fbUser.displayName || userEmail.split('@')[0],
            username: userEmail.split('@')[0],
            email: userEmail,
            role: 'user',
            active: true,
            createdAt: new Date().toISOString(),
            failedLoginAttempts: 0
          };
        }

        setCurrentUser(userProfile);

        // Tentar carregar do Cache Local para renderização instantânea
        const localCache = localStorage.getItem(`financ_cache_${uid}`);
        if (localCache) {
          try {
            const parsed = JSON.parse(localCache);
            setData(ensureMoradiaAluguel(parsed));
          } catch {
            // ignore
          }
        }
      } else {
        setCurrentUser(null);
        setData(ensureMoradiaAluguel(getInitialData()));
      }
    });

    return () => unsubscribe();
  }, []);

  // Listener em tempo real do Firestore para Dados Financeiros do Usuário
  useEffect(() => {
    if (!currentUser?.uid) return;

    const uid = currentUser.uid;
    const finDocRef = doc(db, 'users', uid, 'financialData', 'main');

    setSyncStatus('syncing');

    const unsubscribe = onSnapshot(finDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data() as FinancialData;
        const localData = dataRef.current;

        const mergedData = mergeFinancialData(localData, remoteData);
        const mergedJson = JSON.stringify(mergedData);

        if (JSON.stringify(localData) !== mergedJson) {
          prevDataJsonRef.current = mergedJson;
          isRemoteUpdateRef.current = true;
          setData(mergedData);

          // Atualizar Cache no LocalStorage
          localStorage.setItem(`financ_cache_${uid}`, mergedJson);
        }
        setSyncStatus('synced');
        setIsSyncPending(false);
      } else {
        // Se o documento no Firestore ainda não existir, inicializar com template padrão
        const initialTemplate = ensureMoradiaAluguel(dataRef.current || getInitialData());
        const dataToSave = {
          ...initialTemplate,
          username: currentUser.username,
          updatedAt: new Date().toISOString()
        };
        setDoc(finDocRef, dataToSave).catch(err => {
          console.warn('Erro ao criar registro inicial do usuário no Firestore:', err);
        });
      }
    }, (err) => {
      console.warn('Alerta ou erro no snapshot de financialData:', err?.message || err);
      setSyncStatus('offline');
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Sincronizar alterações locais no Firestore (Debounced)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const uid = currentUser.uid;
    const dataWithMoradia = ensureMoradiaAluguel(data);
    const currentJson = JSON.stringify(dataWithMoradia);

    // Salvar sempre no LocalStorage como Cache Temporário
    localStorage.setItem(`financ_cache_${uid}`, currentJson);

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (prevDataJsonRef.current === currentJson) {
      return;
    }

    prevDataJsonRef.current = currentJson;
    setSyncStatus('syncing');

    const timer = setTimeout(async () => {
      try {
        const finDocRef = doc(db, 'users', uid, 'financialData', 'main');
        await setDoc(finDocRef, {
          ...dataWithMoradia,
          username: currentUser.username,
          updatedAt: dataWithMoradia.updatedAt || new Date().toISOString()
        }, { merge: true });

        setSyncStatus('synced');
        setIsSyncPending(false);
      } catch (err) {
        console.warn('Firestore write warning/offline:', err);
        setIsSyncPending(true);
        setSyncStatus('offline');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [data, currentUser]);

  // Sincronizar dados pendentes quando a conexão de internet for restabelecida
  useEffect(() => {
    const syncPending = async () => {
      if (!isOffline && isSyncPending && currentUser?.uid) {
        try {
          setSyncStatus('syncing');
          const dataWithMoradia = ensureMoradiaAluguel(dataRef.current);
          const finDocRef = doc(db, 'users', currentUser.uid, 'financialData', 'main');
          await setDoc(finDocRef, {
            ...dataWithMoradia,
            username: currentUser.username,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          setIsSyncPending(false);
          setSyncStatus('synced');
          addAuditLog('SYNC_OFFLINE', 'Nuvem Firestore', 'Dados locais sincronizados com o banco de dados Firebase.');
        } catch (err) {
          console.warn('Erro ao ressincronizar dados offline:', err);
          setSyncStatus('error');
        }
      }
    };

    syncPending();
  }, [isOffline, isSyncPending, currentUser?.uid]);

  // Persistir Tema
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
  const loginUser = async (usernameInput: string, passwordInput?: string, twoFactorCode?: string) => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, error: 'Por favor, informe o login ou e-mail.' };
    }
    if (!passwordInput) {
      return { success: false, error: 'Por favor, digite a senha.' };
    }

    const emailToUse = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@financpro.com`;

    try {
      // 1. Autenticação direta no Firebase Auth usando signInWithEmailAndPassword
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailToUse, passwordInput);
      } catch (authErr: any) {
        const errCode = authErr?.code || '';

        // Se o usuário não existe no Firebase Auth, cria a conta (primeiro acesso)
        if (errCode === 'auth/user-not-found' || (cleanUsername === 'admin' && (errCode === 'auth/invalid-credential' || errCode === 'auth/wrong-password'))) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, emailToUse, passwordInput);
          } catch (createErr: any) {
            const createCode = createErr?.code || '';
            if (createCode === 'auth/email-already-in-use') {
              return { success: false, error: 'Senha incorreta.' };
            }
            if (createCode === 'auth/network-request-failed') {
              return { success: false, error: 'Erro de conexão.' };
            }
            return { success: false, error: 'Senha incorreta.' };
          }
        } else if (errCode === 'auth/user-not-found') {
          return { success: false, error: 'Usuário não encontrado.' };
        } else if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
          return { success: false, error: 'Senha incorreta.' };
        } else if (errCode === 'auth/network-request-failed') {
          return { success: false, error: 'Erro de conexão.' };
        } else if (errCode === 'permission-denied') {
          return { success: false, error: 'Usuário sem permissão.' };
        } else {
          return { success: false, error: authErr?.message || 'Erro de autenticação no Firebase.' };
        }
      }

      const fbUser = userCredential.user;
      const uid = fbUser.uid;

      // 2. Buscar/Criar perfil de administrador no Firestore (/users/{UID})
      const userDocRef = doc(db, 'users', uid);
      let userProfile: User;

      try {
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          userProfile = { uid, ...userSnap.data() } as User;
        } else {
          const isAdminUser = cleanUsername === 'admin' || emailToUse.includes('admin');
          userProfile = {
            uid,
            fullName: isAdminUser ? 'Administrador' : cleanUsername,
            username: cleanUsername,
            email: emailToUse,
            role: isAdminUser ? 'admin' : 'user',
            active: true,
            createdAt: new Date().toISOString(),
            failedLoginAttempts: 0
          };
          await setDoc(userDocRef, userProfile);
        }
      } catch (dbErr: any) {
        if (dbErr?.code === 'permission-denied') {
          return { success: false, error: 'Usuário sem permissão.' };
        }
        userProfile = {
          uid,
          fullName: cleanUsername === 'admin' ? 'Administrador' : cleanUsername,
          username: cleanUsername,
          email: emailToUse,
          role: cleanUsername === 'admin' ? 'admin' : 'user',
          active: true,
          createdAt: new Date().toISOString(),
          failedLoginAttempts: 0
        };
      }

      if (userProfile.active === false) {
        await signOut(auth);
        return { success: false, error: 'Usuário sem permissão.' };
      }

      // Verificar 2FA se habilitado
      if (userProfile.twoFactorEnabled && userProfile.twoFactorSecret) {
        const correctCode = getTOTPCode(userProfile.twoFactorSecret);
        if (!twoFactorCode) {
          return { success: false, require2FA: true };
        }
        if (twoFactorCode !== correctCode) {
          return { success: false, error: 'Código de autenticação em duas etapas (2FA) inválido.' };
        }
      }

      const updatedUser: User = {
        ...userProfile,
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: localStorage.getItem('financ_user_ip') || '127.0.0.1'
      };

      try {
        await setDoc(userDocRef, updatedUser, { merge: true });
      } catch {
        // ignore
      }

      setCurrentUser(updatedUser);

      addAuditLog('LOGIN', 'Autenticação', `Sessão iniciada com sucesso via Firebase Auth (UID: ${uid})`);
      return { success: true };
    } catch (err: any) {
      console.error('Erro no login:', err);
      if (err?.code === 'auth/network-request-failed') {
        return { success: false, error: 'Erro de conexão.' };
      }
      return { success: false, error: err?.message || 'Erro ao efetuar login.' };
    }
  };

  const logoutUser = async () => {
    if (currentUser) {
      addAuditLog('LOGOUT', 'Autenticação', 'Sessão encerrada pelo usuário');
    }
    await signOut(auth);
    setCurrentUser(null);
  };

  const registerUser = async (
    fullName: string,
    usernameInput: string,
    passwordInput?: string,
    confirmPassword?: string,
    emailInput?: string,
    role: 'admin' | 'user' = 'user',
    active: boolean = true
  ) => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    if (!fullName.trim()) return { success: false, error: 'O nome completo é obrigatório.' };
    if (!cleanUsername) return { success: false, error: 'O nome de login não pode estar vazio.' };
    if (!passwordInput) return { success: false, error: 'A senha não pode estar vazia.' };
    if (passwordInput !== confirmPassword) return { success: false, error: 'As senhas informadas não coincidem.' };

    const emailToUse = emailInput ? emailInput.trim() : `${cleanUsername}@financpro.com`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailToUse, passwordInput);
      const uid = userCredential.user.uid;

      const newUser: User = {
        uid,
        fullName: fullName.trim(),
        username: cleanUsername,
        email: emailToUse,
        role,
        active,
        createdAt: new Date().toISOString(),
        failedLoginAttempts: 0
      };

      await setDoc(doc(db, 'users', uid), newUser);
      
      // Inicializar registro de dados financeiros do usuário
      const initialTemplate = ensureMoradiaAluguel(getInitialData());
      await setDoc(doc(db, 'users', uid, 'financialData', 'main'), {
        ...initialTemplate,
        username: cleanUsername,
        updatedAt: new Date().toISOString()
      });

      addAuditLog('CRIAR_USUARIO', 'Usuários', `Usuário "${cleanUsername}" (${role}) cadastrado no Firebase com sucesso.`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao cadastrar usuário no Firebase Auth.' };
    }
  };

  const updateUser = async (
    usernameTarget: string,
    updatedFields: Partial<Omit<User, 'username' | 'createdAt'>>
  ) => {
    if (!currentUser?.uid) return { success: false, error: 'Acesso não autorizado.' };

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return { success: false, error: 'Usuário não encontrado.' };

      const existingData = userSnap.data() as User;
      const updatedUser: User = {
        ...existingData,
        ...updatedFields
      };

      if (updatedFields.twoFactorEnabled !== undefined) {
        updatedUser.twoFactorEnabled = updatedFields.twoFactorEnabled;
        if (updatedFields.twoFactorEnabled && !updatedUser.twoFactorSecret) {
          updatedUser.twoFactorSecret = generate2FASecret();
        }
      }

      await setDoc(userDocRef, updatedUser, { merge: true });
      setCurrentUser(updatedUser);

      addAuditLog('ATUALIZAR_USUARIO', 'Usuários', `Dados do usuário "${usernameTarget}" atualizados.`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao atualizar dados.' };
    }
  };

  const deleteUser = async (usernameTarget: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'financialData', 'main'));
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await signOut(auth);
      setCurrentUser(null);
      addAuditLog('EXCLUIR_USUARIO', 'Usuários', `Sua conta e dados foram excluídos do Firebase.`);
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
    }
  };

  const mapFirebaseAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/requires-recent-login':
        return 'Faça login novamente para alterar seus dados.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Senha atual incorreta.';
      case 'auth/email-already-in-use':
        return 'Este email já está cadastrado.';
      case 'auth/weak-password':
        return 'A senha deve possuir pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/network-request-failed':
        return 'Falha na conexão de rede. Verifique sua internet.';
      default:
        return err?.message || 'Erro de autenticação no Firebase.';
    }
  };

  const changeAuthEmail = async (currentPassword: string, newEmail: string) => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'E-mail inválido.' };
    }

    const currentEmail = fbUser.email || `${currentUser?.username}@financpro.com`;

    try {
      const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);

      await updateEmail(fbUser, cleanEmail);

      const uid = fbUser.uid;
      await setDoc(doc(db, 'users', uid), { email: cleanEmail, updatedAt: new Date().toISOString() }, { merge: true });

      if (currentUser) {
        setCurrentUser({ ...currentUser, email: cleanEmail });
      }

      addAuditLog('ALTERAR_EMAIL', 'Autenticação', `E-mail alterado para "${cleanEmail}" via Firebase Auth.`);
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao alterar e-mail:', err);
      const errorMsg = mapFirebaseAuthError(err);
      addAuditLog('ERRO_ALTERAR_EMAIL', 'Autenticação', `Falha ao alterar e-mail: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  };

  const changeAuthPassword = async (currentPassword: string, newPassword: string) => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A senha deve possuir pelo menos 6 caracteres.' };
    }

    const currentEmail = fbUser.email || `${currentUser?.username}@financpro.com`;

    try {
      const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);

      await updatePassword(fbUser, newPassword);

      addAuditLog('ALTERAR_SENHA', 'Autenticação', `Senha de acesso alterada via Firebase Auth.`);
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      const errorMsg = mapFirebaseAuthError(err);
      addAuditLog('ERRO_ALTERAR_SENHA', 'Autenticação', `Falha ao alterar senha: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  };

  const changeUserPassword = async (usernameTarget: string, newPassword: string) => {
    addAuditLog('ALTERAR_SENHA', 'Usuários', `Solicitada alteração de senha do usuário ${usernameTarget}.`);
  };

  const forgotPassword = async (usernameOrEmail: string) => {
    const term = usernameOrEmail.trim().toLowerCase();
    const targetEmail = term.includes('@') ? term : `${term}@financpro.com`;

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      addAuditLog('SOLICITACAO_RECOVERY', 'Autenticação', `Link de recuperação de senha enviado para ${targetEmail}`);
      return { 
        success: true, 
        message: `Instruções e link oficial do Firebase Auth enviados para: ${targetEmail}. Verifique sua caixa de entrada e spam.` 
      };
    } catch (err: any) {
      addAuditLog('ERRO_RECOVERY', 'Autenticação', `Erro na solicitação de redefinição para ${targetEmail}: ${err?.message}`);
      return { 
        success: false, 
        message: err?.code === 'auth/user-not-found'
          ? `Usuário/E-mail não encontrado no Firebase Auth (${targetEmail}). Se utilizou o login 'admin', informe seu e-mail cadastrado.`
          : `Alerta do Firebase Auth: ${err?.message || 'Não foi possível enviar o e-mail de redefinição.'}`
      };
    }
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

      if (existing.cardPurchaseId) {
        purchases = purchases.filter(p => p.id !== existing.cardPurchaseId);
        nextCardPurchaseId = undefined;
      }

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

      if (existing.cardPurchaseId) {
        purchases = purchases.filter(p => p.id !== existing.cardPurchaseId);
        nextCardPurchaseId = undefined;
      }

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

    const newSalaries = deduplicateArray<Salary>(
      data.salaries || [],
      s => `${(s.description || s.payor || '').trim().toLowerCase()}_${s.value}_${s.month}_${s.year}`
    );

    const newFixed = deduplicateArray<FixedExpense>(
      data.fixedExpenses || [],
      f => `${(f.name || '').trim().toLowerCase()}_${f.value}_${f.dueDay}_${f.category}`
    );

    const newVariable = deduplicateArray<VariableExpense>(
      data.variableExpenses || [],
      v => `${(v.description || '').trim().toLowerCase()}_${v.value}_${v.date}_${v.category}`
    );

    const newConsignados = deduplicateArray<Consignado>(
      data.consignados || [],
      c => `${(c.bank || '').trim().toLowerCase()}_${c.borrowedAmount}_${c.installmentValue}_${c.totalInstallments}`
    );

    const newCards = deduplicateArray<CreditCard>(
      data.creditCards || [],
      c => `${(c.cardName || '').trim().toLowerCase()}_${c.bank}_${c.limit}`
    );

    const newPurchases = deduplicateArray<CardPurchase>(
      data.cardPurchases || [],
      p => `${(p.description || '').trim().toLowerCase()}_${p.totalValue}_${p.cardId}_${p.purchaseDate}`
    );

    const newGoals = deduplicateArray<SavingsGoal>(
      data.savingsGoals || [],
      g => `${g.targetAmount}_${g.targetMonth}`
    );

    const newInvestments = deduplicateArray<Investment>(
      data.investments || [],
      i => `${(i.name || '').trim().toLowerCase()}_${i.value}_${i.type}`
    );

    const newPatrimony = deduplicateArray<PatrimonyItem>(
      data.patrimonyItems || [],
      m => `${(m.name || '').trim().toLowerCase()}_${m.value}`
    );

    const newAudit = deduplicateArray<AuditLog>(
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
      const startDateObj = new Date(f.startDate);
      const startYearMonth = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;
      if (startYearMonth > filterYearMonth) return;
      
      if (f.endDate) {
        const endDateObj = new Date(f.endDate);
        const endYearMonth = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}`;
        if (endYearMonth < filterYearMonth) return;
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

    // 4. Compras de cartão com parcelas terminando
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
      isOffline,
      isSyncPending,
      syncStatus,
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
      changeAuthEmail,
      changeAuthPassword,
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
