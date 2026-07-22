/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Key, 
  Calendar, 
  Search, 
  Lock, 
  UserCheck, 
  AlertTriangle,
  Eye,
  EyeOff,
  UserMinus,
  Mail,
  ShieldAlert,
  Clock,
  History,
  Info,
  Smartphone,
  RefreshCw,
  SlidersHorizontal,
  Unlock,
  Database,
  Sparkles,
  Filter
} from 'lucide-react';
import { User } from '../types';

export default function UsersAdmin() {
  const { 
    users, 
    currentUser, 
    registerUser, 
updateUser, 
    deleteUser, 
    changeUserPassword,
    auditLogs,
    clearAuditLogs,
    removeDatabaseRedundancies
  } = useFinancial();
  
  // Estados para o formulário de cadastro
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formActive, setFormActive] = useState<boolean>(true);
  
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Estados de busca, edição e visualização
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Estados para o formulário de Edição
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState('');
  const [edit2fa, setEdit2fa] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Estados de filtro para o Log de Auditoria
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterUser, setAuditFilterUser] = useState('all');
  const [auditFilterModule, setAuditFilterModule] = useState('all');
  const [auditFilterIp, setAuditFilterIp] = useState('all');
  const [dedupStatus, setDedupStatus] = useState<string | null>(null);

  // Manipular cadastro
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (formPassword !== formConfirmPassword) {
      setSubmitError('As senhas digitadas não coincidem.');
      return;
    }

    const result = registerUser(
      formFullName,
      formUsername,
      formPassword,
      formConfirmPassword,
      formEmail,
      formRole,
      formActive
    );

    if (!result.success) {
      setSubmitError(result.error || 'Erro desconhecido ao cadastrar usuário.');
      return;
    }

    setSubmitSuccess(`Usuário "${formUsername}" cadastrado com sucesso!`);
    setFormFullName('');
    setFormUsername('');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormEmail('');
    setFormRole('user');
    setFormActive(true);
  };

  // Carregar usuário no painel de edição
  const startEditing = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName || '');
    setEditEmail(user.email || '');
    setEditRole(user.role);
    setEditActive(user.active !== false);
    setEditPassword('');
    setEdit2fa(user.twoFactorEnabled || false);
    setEditError(null);
    setEditSuccess(null);
  };

  // Salvar Edição de Usuário
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditSuccess(null);

    const updatedFields: any = {
      fullName: editFullName,
      email: editEmail,
      role: editRole,
      active: editActive,
      twoFactorEnabled: edit2fa
    };

    if (editPassword.trim()) {
      updatedFields.password = editPassword;
    }

    const res = updateUser(editingUser.username, updatedFields);
    if (!res.success) {
      setEditError(res.error || 'Erro ao atualizar dados do usuário.');
      return;
    }

    setEditSuccess('Dados atualizados com sucesso!');
    setTimeout(() => {
      setEditingUser(null);
    }, 1500);
  };

  // Desbloquear usuário travado
  const handleUnlockUser = (username: string) => {
    const res = updateUser(username, { failedLoginAttempts: 0, lockedUntil: undefined });
    if (res.success) {
      alert(`Usuário "${username}" desbloqueado com sucesso! Tentativas falhas resetadas.`);
    } else {
      alert(`Erro ao desbloquear usuário: ${res.error}`);
    }
  };

  // Manipular exclusão de usuário
  const handleDelete = (username: string) => {
    if (window.confirm(`Tem certeza de que deseja excluir permanentemente o usuário "${username}"? Todos os seus dados de orçamentos, faturas, consignados e patrimônios serão deletados sem chance de recuperação.`)) {
      deleteUser(username);
    }
  };

  // Alternar visibilidade de senha criptografada na listagem
  const togglePasswordVisibility = (username: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  // Estatísticas de usuários
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const standardUsersCount = users.filter(u => u.role === 'user').length;
  const inactiveCount = users.filter(u => u.active === false).length;

  // Filtragem de lista
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.fullName && u.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filtragem dos Logs de Auditoria
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.operation.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.ip && log.ip.toLowerCase().includes(auditSearch.toLowerCase()));
    
    const matchesUser = auditFilterUser === 'all' || log.username.toLowerCase() === auditFilterUser.toLowerCase();
    const matchesModule = auditFilterModule === 'all' || log.module === auditFilterModule;
    const matchesIp = auditFilterIp === 'all' || (log.ip || '127.0.0.1') === auditFilterIp;

    return matchesSearch && matchesUser && matchesModule && matchesIp;
  });

  // Lista única de usuários, módulos e IPs para filtros de auditoria
  const uniqueAuditUsers = Array.from(new Set(auditLogs.map(l => l.username)));
  const uniqueAuditModules = Array.from(new Set(auditLogs.map(l => l.module)));
  const uniqueAuditIps = Array.from(new Set(auditLogs.map(l => l.ip || '127.0.0.1')));

  return (
    <div className="space-y-6">
      
      {/* 1. CARDS DE INDICADORES DE PERFIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total de Usuários */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Contas</h4>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{totalUsers}</p>
          </div>
        </div>

        {/* Administradores */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Admins (ADM)</h4>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{adminCount}</p>
          </div>
        </div>

        {/* Usuários Padrão */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Usuários Comuns</h4>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{standardUsersCount}</p>
          </div>
        </div>

        {/* Inativos */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Inativos</h4>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{inactiveCount}</p>
          </div>
        </div>

      </div>

      {/* 2. ÁREA DE DUAS COLUNAS: CRIAÇÃO/EDIÇÃO E LISTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Painel Esquerdo: Cadastro ou Edição de Usuário */}
        <div className="lg:col-span-5 space-y-6">
          
          {editingUser ? (
            /* FORMULÁRIO DE EDIÇÃO DE USUÁRIO */
            <div className="bg-indigo-50/10 dark:bg-zinc-900 border-2 border-indigo-200 dark:border-zinc-800 rounded-3xl p-6 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600 animate-spin" />
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Editar Usuário</h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-6">
                Modifique os acessos, permissões, status ativo e senha do usuário <code className="font-bold text-indigo-600 dark:text-indigo-400">@{editingUser.username}</code>.
              </p>

              {editError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                
                {/* Nome Completo */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Endereço de E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="exemplo@financpro.com"
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Nova Senha (Opcional) */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Redefinir Senha
                  </label>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold mb-1.5">Deixe em branco para manter a senha atual.</p>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Digite nova senha segura"
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Nível de Permissão e Ativo/Inativo */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Perfil */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Perfil de Acesso
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'admin' | 'user')}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    >
                      <option value="user">Usuário Comum</option>
                      <option value="admin">Administrador (ADM)</option>
                    </select>
                  </div>

                  {/* Situação */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Situação da Conta
                    </label>
                    <select
                      value={editActive ? 'true' : 'false'}
                      onChange={(e) => setEditActive(e.target.value === 'true')}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    >
                      <option value="true">Ativo (Permitir Login)</option>
                      <option value="false">Inativo (Bloquear Login)</option>
                    </select>
                  </div>

                </div>

                {/* Chave 2-Factor Authentication (2FA) */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                      Autenticação 2FA
                    </span>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold">Exige código gerador de 6 dígitos no login.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEdit2fa(!edit2fa)}
                    className={`text-[10px] font-black px-3 py-1 rounded-lg border cursor-pointer transition-all ${
                      edit2fa 
                        ? 'bg-indigo-600 border-indigo-700 text-white' 
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {edit2fa ? 'Habilitado' : 'Desabilitado'}
                  </button>
                </div>

                {/* Botões do Formulário de Edição */}
                <div className="flex gap-3 mt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Voltar
                  </button>
                </div>

              </form>
            </div>
          ) : (
            /* FORMULÁRIO DE CADASTRO TRADICIONAL */
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl p-6 h-fit">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Criar Usuário</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-5">
                Preencha os campos abaixo para cadastrar uma nova conta de acesso individual ao sistema financeiro.
              </p>

              {submitError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                
                {/* Nome Completo */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Ex: Davi Schio"
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Nome de Usuário (Login único)
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                    placeholder="Ex: davi.schio"
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ex: davi@financpro.com"
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Duas colunas de senha */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Confirmar Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Nível de Permissão e Atividade */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Perfil
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as 'admin' | 'user')}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    >
                      <option value="user">Usuário Comum</option>
                      <option value="admin">Administrador (ADM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Situação Inicial
                    </label>
                    <select
                      value={formActive ? 'true' : 'false'}
                      onChange={(e) => setFormActive(e.target.value === 'true')}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo (Bloqueado)</option>
                    </select>
                  </div>
                </div>

                {/* Botão Cadastrar */}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Salvar Usuário
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Painel Direito: Lista de Usuários Existentes */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-150 dark:border-zinc-850">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Diretório de Acessos</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mt-0.5">Gerenciamento completo das credenciais e logons.</p>
            </div>
            
            {/* Campo de Busca */}
            <div className="relative max-w-xs w-full sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome, login..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[580px]">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-850 rounded-2xl">
                <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">Nenhum registro encontrado.</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isDefaultAdmin = user.username.toLowerCase() === 'admin';
                const isMe = currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase();
                const isPasswordVisible = visiblePasswords[user.username] || false;
                const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();

                return (
                  <div 
                    key={user.username} 
                    className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                      isMe 
                        ? 'border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-xs' 
                        : 'border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* Avatar e Infos Básicas */}
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 uppercase select-none mt-0.5 ${
                          user.role === 'admin'
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400'
                        }`}>
                          {user.username.slice(0, 2)}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{user.fullName || 'Usuário Sem Nome'}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">(@{user.username})</span>
                            
                            {user.role === 'admin' ? (
                              <span className="text-[8px] bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-400 px-1.5 py-0.2 rounded-md font-extrabold uppercase tracking-wide">
                                ADM
                              </span>
                            ) : (
                              <span className="text-[8px] bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.2 rounded-md font-bold uppercase">
                                USER
                              </span>
                            )}

                            {user.active === false ? (
                              <span className="text-[8px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 px-1.5 py-0.2 rounded-md font-extrabold uppercase">
                                INATIVO
                              </span>
                            ) : (
                              <span className="text-[8px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded-md font-extrabold uppercase">
                                ATIVO
                              </span>
                            )}

                            {isMe && (
                              <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-md font-extrabold uppercase">
                                VOCÊ
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-zinc-400 font-semibold">
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            {user.email && (
                              <span className="flex items-center gap-0.5 text-zinc-400 dark:text-zinc-400">
                                <Mail className="w-3 h-3 text-zinc-400" />
                                {user.email}
                              </span>
                            )}
                          </div>
                          
                          {/* Histórico de Acesso */}
                          <div className="flex items-center gap-2 text-[9px] text-zinc-400 dark:text-zinc-500 font-bold">
                            <Clock className="w-2.5 h-2.5 shrink-0 text-zinc-400" />
                            <span>Último Login: </span>
                            {user.lastLoginAt ? (
                              <span className="text-zinc-700 dark:text-zinc-300">
                                {new Date(user.lastLoginAt).toLocaleString('pt-BR')} (IP: <code className="font-semibold">{user.lastLoginIp || '127.0.0.1'}</code>)
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-normal italic">Nenhum acesso registrado</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="flex items-center gap-1 shrink-0">
                        
                        {/* Se estiver travado por tentativas falhas */}
                        {isLocked && (
                          <button
                            onClick={() => handleUnlockUser(user.username)}
                            title="Destravar Conta Bloqueada"
                            className="p-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-lg cursor-pointer hover:scale-105 transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Bloqueado
                          </button>
                        )}

                        {/* Botão Editar Usuário */}
                        <button
                          onClick={() => startEditing(user)}
                          title="Editar Usuário"
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Excluir */}
                        <button
                          onClick={() => handleDelete(user.username)}
                          disabled={isDefaultAdmin || isMe}
                          title={isDefaultAdmin ? 'Admin original do sistema' : isMe ? 'Você não pode se excluir' : 'Excluir Usuário'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDefaultAdmin || isMe
                              ? 'text-zinc-200 dark:text-zinc-850 cursor-not-allowed'
                              : 'text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>

                    </div>

                    {/* Bloco de Visualização de Senha Criptografada SHA-256 */}
                    <div className="text-[10px] bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-semibold overflow-hidden">
                        <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>Hash SHA-256:</span>
                        <span className="font-mono font-bold text-zinc-600 dark:text-zinc-300 overflow-hidden text-ellipsis whitespace-nowrap block max-w-[200px] md:max-w-[280px]">
                          {isPasswordVisible ? user.password : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => togglePasswordVisibility(user.username)}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {isPasswordVisible ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            Ver Hash
                          </>
                        )}
                      </button>
                    </div>

                    {/* Indicador 2FA na listagem */}
                    {user.twoFactorEnabled && (
                      <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold tracking-wider bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-1 rounded-lg w-fit">
                        <Smartphone className="w-3 h-3" />
                        <span>2FA ATIVO</span>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* 3. LOGS DE AUDITORIA (HISTÓRICO DE PRINCIPAIS AÇÕES) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl p-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-150 dark:border-zinc-850">
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 animate-pulse" />
              Logs de Auditoria e Segurança
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mt-0.5">
              Histórico em tempo real de todas as ações de autenticação, modificação e exclusão de dados.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const res = removeDatabaseRedundancies();
                setDedupStatus(res.details);
                setTimeout(() => setDedupStatus(null), 8000);
              }}
              id="btn-deduplicate-db"
              className="text-[10px] font-bold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Remover todos os registros duplicados e redundâncias do banco de dados"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Desduplicar Banco (Sem Redundância)
            </button>

            <button
              onClick={() => {
                setAuditSearch('138.118.77.207');
                setAuditFilterIp('138.118.77.207');
              }}
              id="btn-filter-target-ip"
              className="text-[10px] font-bold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Filtrar e recuperar todos os lançamentos efetuados no IP 138.118.77.207"
            >
              <Filter className="w-3.5 h-3.5 text-emerald-500" />
              IP 138.118.77.207
            </button>

            <button
              onClick={() => {
                if (window.confirm('Tem certeza de que deseja limpar todos os registros de auditoria e segurança do sistema?')) {
                  clearAuditLogs();
                }
              }}
              className="text-[10px] font-bold px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100/50 cursor-pointer transition-colors"
            >
              Limpar Logs
            </button>
          </div>
        </div>

        {/* FEEDBACK DE DESDUPLICAÇÃO */}
        {dedupStatus && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{dedupStatus}</span>
          </div>
        )}

        {/* FILTROS DA AUDITORIA */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          
          {/* Busca Geral */}
          <div>
            <label className="block text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
              Busca nos Logs / IP
            </label>
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Buscar por termo, ação ou IP (ex: 138.118.77.207)..."
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-hidden"
            />
          </div>

          {/* Filtrar por usuário */}
          <div>
            <label className="block text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
              Filtrar por Usuário
            </label>
            <select
              value={auditFilterUser}
              onChange={(e) => setAuditFilterUser(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-hidden"
            >
              <option value="all">Todos os usuários</option>
              {uniqueAuditUsers.map(user => (
                <option key={user} value={user}>@{user}</option>
              ))}
            </select>
          </div>

          {/* Filtrar por Módulo */}
          <div>
            <label className="block text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
              Filtrar por Módulo
            </label>
            <select
              value={auditFilterModule}
              onChange={(e) => setAuditFilterModule(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-hidden"
            >
              <option value="all">Todos os módulos</option>
              {uniqueAuditModules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>

          {/* Filtrar por IP */}
          <div>
            <label className="block text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
              Filtrar por IP
            </label>
            <select
              value={auditFilterIp}
              onChange={(e) => setAuditFilterIp(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-hidden"
            >
              <option value="all">Todos os IPs</option>
              {uniqueAuditIps.map(ip => (
                <option key={ip} value={ip}>{ip}</option>
              ))}
            </select>
          </div>

        </div>

        {/* TABELA DE AUDITORIA */}
        <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-900/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-850">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Operador</th>
                  <th className="py-2.5 px-4">Operação</th>
                  <th className="py-2.5 px-4">Módulo</th>
                  <th className="py-2.5 px-4">Detalhes da Ação</th>
                  <th className="py-2.5 px-4">IP Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850 text-xs">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400 dark:text-zinc-500 font-medium">
                      Nenhum log de auditoria gerado ou correspondente aos filtros.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.slice(0, 100).map((log) => {
                    const isSystem = log.username.toLowerCase() === 'sistema';
                    
                    // Coloração da operação para facilidade de leitura do admin
                    let opBadgeColor = 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
                    if (log.operation.includes('EXCLUIR') || log.operation.includes('LIMPAR') || log.operation.includes('BLOQUEIO')) {
                      opBadgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 font-bold';
                    } else if (log.operation.includes('CRIAR') || log.operation.includes('LOGIN')) {
                      opBadgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold';
                    } else if (log.operation.includes('ATUALIZAR') || log.operation.includes('ALTERAR')) {
                      opBadgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-bold';
                    }

                    return (
                      <tr key={log.id} className="hover:bg-zinc-150/30 dark:hover:bg-zinc-900/30">
                        <td className="py-3 px-4 font-mono text-[10px] text-zinc-400 shrink-0">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${isSystem ? 'text-zinc-400 italic' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            @{log.username}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider ${opBadgeColor}`}>
                            {log.operation}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px]">
                          {log.module}
                        </td>
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-medium max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-zinc-400">
                          {log.ip || '127.0.0.1'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {filteredAuditLogs.length > 100 && (
            <div className="py-2 px-4 bg-zinc-100 dark:bg-zinc-950 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold border-t border-zinc-200 dark:border-zinc-850">
              Exibindo apenas os últimos 100 logs. Para análises maiores, consulte os relatórios de banco de dados.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
