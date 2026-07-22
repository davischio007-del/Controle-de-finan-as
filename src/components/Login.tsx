/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { 
  ShieldAlert, 
  LogIn, 
  Eye, 
  EyeOff, 
  Lock, 
  User as UserIcon, 
  Mail, 
  Smartphone, 
  Clock, 
  ArrowLeft, 
  CheckCircle,
  HelpCircle,
  Activity
} from 'lucide-react';
import { getTOTPCode } from '../utils/security';

export default function Login() {
  const { loginUser, forgotPassword, users, darkMode, setDarkMode } = useFinancial();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controle de 2FA
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  // Simulador de Token 2FA para testes rápidos
  const [activeUserSecret, setActiveUserSecret] = useState<string | null>(null);
  const [simulatedToken, setSimulatedToken] = useState('');
  const [simSecondsRemaining, setSimSecondsRemaining] = useState(30);

  // Controle de "Esqueci minha senha"
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryTerm, setRecoveryTerm] = useState('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);
  const [recoveryErrorMessage, setRecoveryErrorMessage] = useState<string | null>(null);

  // Efeito para atualizar o simulador de token 2FA se o usuário inserido tiver 2FA ativo
  useEffect(() => {
    const matchedUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (matchedUser && matchedUser.twoFactorEnabled && matchedUser.twoFactorSecret) {
      setActiveUserSecret(matchedUser.twoFactorSecret);
    } else {
      setActiveUserSecret(null);
    }
  }, [username, users]);

  // Efeito do relógio do simulador 2FA
  useEffect(() => {
    if (!activeUserSecret) return;

    const updateToken = () => {
      setSimulatedToken(getTOTPCode(activeUserSecret));
      const epoch = Math.floor(Date.now() / 1000);
      setSimSecondsRemaining(30 - (epoch % 30));
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);
    return () => clearInterval(interval);
  }, [activeUserSecret]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Por favor, informe o nome de usuário.');
      return;
    }
    if (!password) {
      setError('Por favor, digite a senha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser(username, password, require2FA ? twoFactorCode : undefined);
      
      if (res.success) {
        return;
      }

      if (res.require2FA) {
        setRequire2FA(true);
        setError(null);
        return;
      }

      setError(res.error || 'Erro desconhecido ao efetuar login.');
    } catch (err: any) {
      setError(err?.message || 'Falha de comunicação no login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverySuccessMessage(null);
    setRecoveryErrorMessage(null);

    if (!recoveryTerm.trim()) {
      setRecoveryErrorMessage('Informe seu nome de login ou e-mail cadastrado.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(recoveryTerm);
      if (res.success) {
        setRecoverySuccessMessage(res.message);
        setRecoveryTerm('');
      } else {
        setRecoveryErrorMessage(res.message);
      }
    } catch (err: any) {
      setRecoveryErrorMessage(err?.message || 'Falha ao solicitar recuperação no Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsRecoveryMode(false);
    setRequire2FA(false);
    setTwoFactorCode('');
    setError(null);
    setRecoverySuccessMessage(null);
    setRecoveryErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-200">
      
      {/* Container Principal */}
      <div className="w-full max-w-md">
        
        {/* Logo / Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-md shadow-indigo-500/10 mb-3">
            O
          </div>
          <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">Organizador Financeiro</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mt-1">Gestor de Orçamento</p>
        </div>

        {/* MODO RECOVERY (Esqueci minha senha) */}
        {isRecoveryMode ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl shadow-xl p-8">
            <button
              onClick={handleBackToLogin}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold mb-6 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o Login
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600 animate-pulse" />
                Recuperação de Senha
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                Informe o seu e-mail cadastrado ou o seu login de acesso para que o sistema lhe envie instruções de segurança.
              </p>
            </div>

            {recoverySuccessMessage && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-semibold space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">E-mail de Recuperação Enviado!</span>
                </div>
                <p className="text-[11px] leading-relaxed font-normal">{recoverySuccessMessage}</p>
              </div>
            )}

            {recoveryErrorMessage && (
              <div className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{recoveryErrorMessage}</span>
              </div>
            )}

            {!recoverySuccessMessage && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Nome de Login ou E-mail
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={recoveryTerm}
                      onChange={(e) => setRecoveryTerm(e.target.value)}
                      placeholder="Ex: davi.schio ou email@exemplo.com"
                      className="w-full pl-10 pr-4 py-3 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Enviar E-mail de Recuperação
                </button>
              </form>
            )}
          </div>
        ) : (
          /* MODO LOGIN TRADICIONAL */
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                {require2FA ? 'Segurança em Duas Etapas' : 'Acesse sua Conta'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                {require2FA 
                  ? 'Sua conta exige validação adicional. Insira o código 2FA abaixo.' 
                  : 'Insira suas credenciais abaixo para acessar o sistema.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* LOGIN NORMAL CAMPOS */}
              {!require2FA ? (
                <>
                  {/* Usuário */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Nome de Usuário
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                        <UserIcon className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ex: davischio ou davischio@admin.com"
                        className="w-full pl-10 pr-4 py-3 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Senha */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsRecoveryMode(true)}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md cursor-pointer transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* SEGUNDA ETAPA: 2FA */
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Código Autenticador de 6 Dígitos
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                        <Smartphone className="w-4 h-4 animate-bounce" />
                      </span>
                      <input
                        type="text"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000 000"
                        className="w-full pl-10 pr-4 py-3 font-mono text-center tracking-[0.25em] text-sm font-black bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full py-1.5 text-center text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer hover:underline"
                  >
                    Voltar e alterar credenciais
                  </button>
                </div>
              )}

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4" />
                {isLoading ? 'Autenticando no Firebase...' : (require2FA ? 'Confirmar Código 2FA' : 'Entrar no Sistema')}
              </button>
            </form>

            {/* SE 2FA ESTIVER ATIVO, OFERECER SIMULADOR DE CHAVE EM EXPANDÍVEL */}
            {require2FA && activeUserSecret && (
              <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>Emulador 2FA (Facilitador de Testes)</span>
                </div>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
                  Como este é um ambiente seguro do AI Studio, geramos o token atual da sua chave secreta para você validar facilmente sem precisar de um celular:
                </p>
                <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-850">
                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm tracking-wider">
                    {simulatedToken}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
                    <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>{simSecondsRemaining}s</span>
                  </div>
                </div>
              </div>
            )}

            {/* Credenciais de Demonstração */}
            {!require2FA && (
              <div className="mt-6 pt-5 border-t border-zinc-150 dark:border-zinc-850">
                <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center mb-2.5">Acessos Recomendados</h3>
                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-150 dark:border-zinc-850 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Usuário ADM:</span>
                    <code className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-md">admin</code>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Senha do ADM:</span>
                    <code className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-md">admin</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé do Sistema */}
        <div className="text-center mt-6 flex justify-between items-center px-4">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">
            Versão 1.3.0 • Multi-User Admin
          </span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-bold cursor-pointer underline decoration-dotted"
          >
            Tema {darkMode ? 'Claro' : 'Escuro'}
          </button>
        </div>

      </div>
    </div>
  );
}
