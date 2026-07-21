/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { getInitialData } from '../utils/defaultData';
import {
  Download,
  Upload,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Landmark,
  PieChart,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function Reports() {
  const { data, setData, selectedYear, selectedMonth } = useFinancial();
  const [reportTab, setReportTab] = useState<'flow' | 'category' | 'cards' | 'loans'>('flow');

  // --- CÁLCULOS DO FLUXO DE CAIXA E CATEGORIAS ---
  const currentYM = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // 1. Receitas do mês
  const monthlySalaries = data.salaries.filter(s => s.year === selectedYear && s.month === selectedMonth);
  const totalSalaries = monthlySalaries.reduce((sum, s) => sum + s.value, 0);

  // 2. Despesas Fixas do mês
  const monthlyFixed = data.fixedExpenses.filter(f => {
    const startYM = f.startDate.slice(0, 7);
    if (startYM > currentYM) return false;
    if (f.endDate && f.endDate.slice(0, 7) < currentYM) return false;
    return true;
  });
  const totalFixed = monthlyFixed.reduce((sum, f) => sum + f.value, 0);

  // 3. Despesas Variáveis do mês
  const monthlyVariable = data.variableExpenses.filter(v => v.date.startsWith(currentYM));
  const totalVariable = monthlyVariable.reduce((sum, v) => sum + v.value, 0);

  // 4. Consignados pagos no mês (parcelas estimadas pagas)
  const monthlyLoans = data.consignados.filter(c => {
    if (c.isPaid) return false;
    const start = new Date(c.firstPaymentDate + 'T00:00:00');
    const end = new Date(selectedYear, selectedMonth - 1, 1);
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return diffMonths >= 0 && diffMonths < c.totalInstallments;
  });
  const totalLoans = monthlyLoans.reduce((sum, c) => sum + c.installmentValue, 0);

  // 5. Compras de cartão vencendo no mês
  let totalCards = 0;
  data.cardPurchases.forEach(p => {
    const firstDue = new Date(p.firstDueDate + 'T00:00:00');
    for (let i = 0; i < p.totalInstallments; i++) {
      const instDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
      const instYM = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}`;
      if (instYM === currentYM) {
        totalCards += p.totalValue / p.totalInstallments;
      }
    }
  });

  const totalExpenses = totalFixed + totalVariable + totalLoans + totalCards;
  const cashBalance = totalSalaries - totalExpenses;

  // --- AGRUPAMENTO POR CATEGORIAS ---
  const categorySummary: { [key: string]: number } = {};
  monthlyFixed.forEach(f => {
    categorySummary[f.category] = (categorySummary[f.category] || 0) + f.value;
  });
  monthlyVariable.forEach(v => {
    categorySummary[v.category] = (categorySummary[v.category] || 0) + v.value;
  });

  // --- EXPORTAR CSV PARA EXCEL ---
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\ufeff'; // BOM para Excel
    csvContent += 'Relatorio Financeiro;' + selectedMonth + '/' + selectedYear + '\n\n';

    // Seção Receitas
    csvContent += 'RECEITAS (SALARIOS)\n';
    csvContent += 'Descricao;Fonte;Valor;Data\n';
    monthlySalaries.forEach(s => {
      csvContent += `"${s.description}";"${s.payor}";${s.value.toFixed(2)};"${s.date}"\n`;
    });
    csvContent += `Total Receitas;;${totalSalaries.toFixed(2)};\n\n`;

    // Seção Contas Fixas
    csvContent += 'CONTAS FIXAS\n';
    csvContent += 'Nome;Categoria;Valor;Vencimento;Pago\n';
    monthlyFixed.forEach(f => {
      const isPaid = (f.paidMonths || []).includes(currentYM) ? 'Sim' : 'Nao';
      csvContent += `"${f.name}";"${f.category}";${f.value.toFixed(2)};${f.dueDay};"${isPaid}"\n`;
    });
    csvContent += `Total Fixas;;${totalFixed.toFixed(2)};;\n\n`;

    // Seção Contas Variáveis
    csvContent += 'DESPESAS VARIAVEIS\n';
    csvContent += 'Descricao;Categoria;Subcategoria;Valor;Data;Pagamento\n';
    monthlyVariable.forEach(v => {
      csvContent += `"${v.description}";"${v.category}";"${v.subcategory}";${v.value.toFixed(2)};"${v.date}";"${v.paymentMethod}"\n`;
    });
    csvContent += `Total Variaveis;;;${totalVariable.toFixed(2)};;\n\n`;

    // Seção Faturamento Geral do Mês
    csvContent += 'RESUMO FINANCEIRO DO MES\n';
    csvContent += `Total Receitas;${totalSalaries.toFixed(2)}\n`;
    csvContent += `Total Despesas;${totalExpenses.toFixed(2)}\n`;
    csvContent += `Saldo Liquido;${cashBalance.toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Financas_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EXPORTAR PDF (Utiliza a janela de Impressão nativa bem formatada) ---
  const handleExportPDF = () => {
    window.print();
  };

  // --- EXPORTAR JSON BACKUP ---
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `Backup_Financas_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- IMPORTAR JSON BACKUP ---
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.salaries && imported.fixedExpenses && imported.variableExpenses) {
            setData(imported);
            alert('Backup restaurado com sucesso!');
          } else {
            alert('Formato de arquivo inválido. Verifique o backup de finanças.');
          }
        } catch (err) {
          alert('Erro ao processar o arquivo JSON.');
        }
      };
    }
  };

  // --- LIMPAR TODOS OS DADOS ---
  const handleClearAll = () => {
    if (window.confirm('Tem certeza de que deseja apagar DEFINITIVAMENTE todos os dados do aplicativo? Esta ação não pode ser desfeita.')) {
      setData({
        salaries: [],
        fixedExpenses: [],
        variableExpenses: [],
        consignados: [],
        creditCards: [],
        cardPurchases: [],
        investments: [],
        patrimonyItems: [],
        emergencyFund: { targetValue: 0, currentValue: 0 },
        savingsGoals: {}
      });
      alert('Todos os dados foram resetados com sucesso.');
    }
  };

  // --- RESTAURAR DADOS DE TESTE PADRÃO ---
  const handleRestoreDefaults = () => {
    if (window.confirm('Deseja recarregar os dados de exemplo originais do sistema? Isso substituirá seus dados atuais.')) {
      setData(getInitialData());
      alert('Dados de exemplo recarregados com sucesso!');
    }
  };

  return (
    <div id="reports-panel" className="space-y-6">
      {/* Botões de Ações de Backup & Exportação */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Exportação & Backups de Segurança</h3>
          <p className="text-xs text-zinc-500">Exporte para planilhas eletrônicas de contabilidade ou baixe backups completos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            id="btn-export-csv"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 rounded-lg border border-emerald-200/50 dark:border-emerald-900/30 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel (CSV)
          </button>

          <button
            onClick={handleExportPDF}
            id="btn-export-pdf"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200/50 dark:border-rose-900/30 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Salvar PDF
          </button>

          <button
            onClick={handleExportJSON}
            id="btn-export-json"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200/50 dark:border-indigo-900/30 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Backup JSON
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200/60 dark:border-zinc-850 cursor-pointer">
            <Upload className="w-4 h-4" />
            Restaurar
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Visão de Fluxo e Relatório Detalhado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Relatório Dinâmico do Fluxo de Caixa */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Abas do Relatório */}
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-4 mb-4">
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                <button
                  onClick={() => setReportTab('flow')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    reportTab === 'flow' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Fluxo de Caixa
                </button>
                <button
                  onClick={() => setReportTab('category')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    reportTab === 'category' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Por Categoria
                </button>
                <button
                  onClick={() => setReportTab('loans')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    reportTab === 'loans' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Consignados
                </button>
              </div>

              <span className="text-[10px] text-zinc-400 font-bold uppercase">Relatório Mensal</span>
            </div>

            {/* Conteúdo Aba: Fluxo de Caixa */}
            {reportTab === 'flow' && (
              <div className="space-y-4 print-section">
                <div className="flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10 p-4 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Resumo de Liquidez Mensal</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Demostrativo de receitas e despesas de {selectedMonth}/{selectedYear}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-black ${cashBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      R$ {cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Saldo Líquido</p>
                  </div>
                </div>

                <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-3 border-b border-zinc-150 dark:border-zinc-850 grid grid-cols-3 font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                    <span>Descrição da Conta</span>
                    <span className="text-center">Vigência</span>
                    <span className="text-right">Valor Registrado</span>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    <div className="p-3 grid grid-cols-3 hover:bg-zinc-50/30">
                      <span className="font-semibold text-emerald-600">Total de Receitas (Salários)</span>
                      <span className="text-center text-zinc-400">{selectedMonth}/{selectedYear}</span>
                      <span className="text-right font-bold text-emerald-600">+ R$ {totalSalaries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="p-3 grid grid-cols-3 hover:bg-zinc-50/30">
                      <span className="font-semibold text-rose-600">Total Despesas Fixas</span>
                      <span className="text-center text-zinc-400">{selectedMonth}/{selectedYear}</span>
                      <span className="text-right font-bold text-rose-500">- R$ {totalFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="p-3 grid grid-cols-3 hover:bg-zinc-50/30">
                      <span className="font-semibold text-rose-600">Total Despesas Variáveis</span>
                      <span className="text-center text-zinc-400">{selectedMonth}/{selectedYear}</span>
                      <span className="text-right font-bold text-rose-500">- R$ {totalVariable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="p-3 grid grid-cols-3 hover:bg-zinc-50/30">
                      <span className="font-semibold text-rose-600">Parcelas de Consignados</span>
                      <span className="text-center text-zinc-400">{selectedMonth}/{selectedYear}</span>
                      <span className="text-right font-bold text-rose-500">- R$ {totalLoans.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="p-3 grid grid-cols-3 hover:bg-zinc-50/30">
                      <span className="font-semibold text-rose-600">Faturas de Cartão de Crédito</span>
                      <span className="text-center text-zinc-400">{selectedMonth}/{selectedYear}</span>
                      <span className="text-right font-bold text-rose-500">- R$ {totalCards.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Aba: Por Categoria */}
            {reportTab === 'category' && (
              <div className="space-y-4">
                <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-3 border-b border-zinc-150 dark:border-zinc-850 grid grid-cols-3 font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                    <span>Categoria</span>
                    <span className="text-center">Gasto Total</span>
                    <span className="text-right">Representatividade (% Despesas)</span>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    {Object.keys(categorySummary).length === 0 ? (
                      <div className="p-6 text-center text-zinc-400">Não há registros de despesas categorizadas para este mês.</div>
                    ) : (
                      Object.entries(categorySummary).map(([cat, val]) => {
                        const pct = totalExpenses > 0 ? (val / totalExpenses) * 100 : 0;
                        return (
                          <div key={cat} className="p-3 grid grid-cols-3 hover:bg-zinc-50/30">
                            <span className="font-semibold">{cat}</span>
                            <span className="text-center text-rose-600 font-bold">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-right text-zinc-500 font-semibold">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Aba: Consignados */}
            {reportTab === 'loans' && (
              <div className="space-y-4">
                <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-3 border-b border-zinc-150 dark:border-zinc-850 grid grid-cols-4 font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                    <span>Banco Credor</span>
                    <span className="text-center">Valor Parcela</span>
                    <span className="text-center">Primeiro Vencimento</span>
                    <span className="text-right">Saldo Devedor Restante</span>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    {data.consignados.length === 0 ? (
                      <div className="p-6 text-center text-zinc-400">Não há empréstimos consignados cadastrados no sistema.</div>
                    ) : (
                      data.consignados.map(loan => (
                        <div key={loan.id} className="p-3 grid grid-cols-4 hover:bg-zinc-50/30">
                          <span className="font-semibold">{loan.bank}</span>
                          <span className="text-center text-rose-600 font-bold">R$ {loan.installmentValue.toLocaleString('pt-BR')}</span>
                          <span className="text-center text-zinc-500">{new Date(loan.firstPaymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          <span className="text-right text-zinc-800 dark:text-zinc-200 font-bold">R$ {(loan.installmentValue * loan.totalInstallments).toLocaleString('pt-BR')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Perigo & Manutenção do Aplicativo */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-2">Manutenção do Banco</h3>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2">
                <h4 className="font-bold text-zinc-700 dark:text-zinc-300">Carregar Dados Originais</h4>
                <p className="text-[10px] text-zinc-400">Substitui seus dados ativos de forma a restabelecer os valores de teste demonstrados.</p>
                <button
                  onClick={handleRestoreDefaults}
                  id="btn-restore-defaults"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 rounded-lg cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recarregar Exemplo
                </button>
              </div>

              <div className="p-4 bg-rose-50/20 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-2">
                <h4 className="font-bold text-rose-700 dark:text-rose-400">Limpar Banco Completo</h4>
                <p className="text-[10px] text-zinc-400">Apaga permanentemente todos os salários, contas, cartões e patrimônios salvos.</p>
                <button
                  onClick={handleClearAll}
                  id="btn-wipe-data"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Resetar Aplicativo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
