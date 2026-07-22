/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { X, Lock, Mail, ShieldCheck, Key, AlertTriangle, CheckCircle, User } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { currentUser, changeAuthEmail, changeAuthPassword } = useFinancial();

  const [activeTab, setActiveTab] = useState<'email' | 'password'>('email');

  // Estados para troca de e-mail
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [emailStatus, setEmailStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Estados para troca de senha
  const [passCurrentPassword, setPassCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passStatus, setPassStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loadingPass, setLoadingPass] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus(null);

    if (!emailCurrentPassword) {
      setEmailStatus({ type: 'error', text: 'Senha atual incorreta.' });
      return;
    }

    if (!newEmail || !newEmail.includes('@')) {
      setEmailStatus({ type: 'error', text: 'E-mail inválido.' });
      return;
    }

    setLoadingEmail(true);
    const res = await changeAuthEmail(emailCurrentPassword, newEmail);
    setLoadingEmail(false);

    if (res.success) {
      setEmailStatus({ type: 'success', text: 'E-mail atualizado com sucesso no Firebase Authentication e Firestore!' });
      setEmailCurrentPassword('');
    } else {
      setEmailStatus({ type: 'error', text: res.error || 'Erro ao atualizar e-mail.' });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus(null);

    if (!passCurrentPassword) {
      setPassStatus({ type: 'error', text: 'Senha atual incorreta.' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPassStatus({ type: 'error', text: 'A senha deve possuir pelo menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassStatus({ type: 'error', text: 'A confirmação da nova senha não coincide.' });
      return;
    }

    setLoadingPass(true);
    const res = await changeAuthPassword(passCurrentPassword, newPassword);
    setLoadingPass(false);

    if (res.success) {
      setPassStatus({ type: 'success', text: 'Senha alterada com sucesso no Firebase Authentication!' });
      setPassCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPassStatus({ type: 'error', text: res.error || 'Erro ao atualizar senha.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        
        {/* Cabeçalho */}
        <div className="p-5 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase">
              {currentUser.username.slice(0, 2)}
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white capitalize">
                Minha Conta - {currentUser.fullName || currentUser.username}
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                @{currentUser.username} • {currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-zinc-150 dark:border-zinc-850 bg-zinc-100/50 dark:bg-zinc-950/20 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Alterar E-mail
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Alterar Senha
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {activeTab === 'email' ? (
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Para sua segurança, informe sua senha atual do Firebase Authentication para confirmar a alteração do e-mail.
              </p>

              {emailStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    emailStatus.type === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                  }`}
                >
                  {emailStatus.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{emailStatus.text}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Novo E-mail
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Senha Atual (Reautenticação Obrigatória)
                </label>
                <input
                  type="password"
                  required
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingEmail}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                {loadingEmail ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>Atualizar E-mail</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Digite sua senha atual e a nova senha desejada. A nova senha deve ter no mínimo 6 caracteres.
              </p>

              {passStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    passStatus.type === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                  }`}
                >
                  {passStatus.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{passStatus.text}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Senha Atual (Reautenticação Obrigatória)
                </label>
                <input
                  type="password"
                  required
                  value={passCurrentPassword}
                  onChange={(e) => setPassCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Nova Senha (Mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingPass}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                {loadingPass ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                <span>Atualizar Senha</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
