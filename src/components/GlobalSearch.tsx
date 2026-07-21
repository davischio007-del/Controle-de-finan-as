/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Search, Calendar, Landmark, CreditCard, Receipt, TrendingUp, X } from 'lucide-react';

interface GlobalSearchProps {
  onNavigateToTab: (tabName: string) => void;
}

export default function GlobalSearch({ onNavigateToTab }: GlobalSearchProps) {
  const { data } = useFinancial();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        id="btn-global-search-open"
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors w-full max-w-xs md:max-w-sm"
      >
        <Search className="w-4 h-4 text-zinc-400" />
        <span>Pesquisar lançamentos...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded ml-auto">
          ⌘K
        </kbd>
      </button>
    );
  }

  // Realizar buscas em todas as coleções
  const searchResults: Array<{
    id: string;
    type: 'salary' | 'fixed' | 'variable' | 'consignado' | 'card_purchase';
    title: string;
    subtitle: string;
    value: number;
    date: string;
    tab: string;
  }> = [];

  const q = query.toLowerCase().trim();
  if (q.length > 0) {
    // Buscar em Salários
    data.salaries.forEach(s => {
      if (s.description.toLowerCase().includes(q) || s.payor.toLowerCase().includes(q) || (s.observation && s.observation.toLowerCase().includes(q))) {
        searchResults.push({
          id: s.id,
          type: 'salary',
          title: s.description,
          subtitle: `Receita • Fonte: ${s.payor}`,
          value: s.value,
          date: s.date,
          tab: 'salarios'
        });
      }
    });

    // Buscar em Despesas Fixas
    data.fixedExpenses.forEach(f => {
      if (f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.paymentMethod.toLowerCase().includes(q)) {
        searchResults.push({
          id: f.id,
          type: 'fixed',
          title: f.name,
          subtitle: `Despesa Fixa • Categoria: ${f.category} • Vencimento: Dia ${f.dueDay}`,
          value: f.value,
          date: f.startDate,
          tab: 'contas_fixas'
        });
      }
    });

    // Buscar em Despesas Variáveis
    data.variableExpenses.forEach(v => {
      if (v.description.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || v.subcategory.toLowerCase().includes(q) || v.paymentMethod.toLowerCase().includes(q)) {
        searchResults.push({
          id: v.id,
          type: 'variable',
          title: v.description || `${v.category} - ${v.subcategory}`,
          subtitle: `Despesa Variável • Categoria: ${v.category} (${v.subcategory})`,
          value: v.value,
          date: v.date,
          tab: 'contas_variaveis'
        });
      }
    });

    // Buscar em Consignados
    data.consignados.forEach(c => {
      if (c.bank.toLowerCase().includes(q) || c.contractNumber.toLowerCase().includes(q)) {
        searchResults.push({
          id: c.id,
          type: 'consignado',
          title: `Consignado ${c.bank}`,
          subtitle: `Financiamento • Contrato: ${c.contractNumber} • ${c.totalInstallments} parcelas`,
          value: c.borrowedAmount,
          date: c.loanDate,
          tab: 'consignados'
        });
      }
    });

    // Buscar em Compras dos Cartões
    data.cardPurchases.forEach(p => {
      if (p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
        const card = data.creditCards.find(c => c.id === p.cardId);
        searchResults.push({
          id: p.id,
          type: 'card_purchase',
          title: p.description,
          subtitle: `Compra no Cartão • ${card ? card.cardName : 'Cartão'} • Categoria: ${p.category} (${p.totalInstallments}x)`,
          value: p.totalValue,
          date: p.purchaseDate,
          tab: 'cartoes'
        });
      }
    });
  }

  const handleSelectResult = (tab: string) => {
    onNavigateToTab(tab);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div id="global-search-container" className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-850">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Digite para pesquisar salários, contas, cartões..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="input-global-search"
            className="w-full bg-transparent border-0 outline-hidden text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
          />
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            id="btn-global-search-close"
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Pesquisa Global Inteligente</p>
              <p className="text-xs max-w-xs mx-auto mt-1">Busque rapidamente por valores, descrições, categorias, bancos ou métodos de pagamento em toda a sua vida financeira.</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1">Não encontramos correspondências para "{query}".</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Resultados da busca ({searchResults.length})
              </div>
              {searchResults.map(res => {
                const isRevenue = res.type === 'salary';
                return (
                  <button
                    key={res.id}
                    onClick={() => handleSelectResult(res.tab)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        res.type === 'salary' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' :
                        res.type === 'fixed' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600' :
                        res.type === 'variable' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600' :
                        res.type === 'consignado' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600' :
                        'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                      }`}>
                        {res.type === 'salary' && <TrendingUp className="w-4 h-4" />}
                        {res.type === 'fixed' && <Calendar className="w-4 h-4" />}
                        {res.type === 'variable' && <Receipt className="w-4 h-4" />}
                        {res.type === 'consignado' && <Landmark className="w-4 h-4" />}
                        {res.type === 'card_purchase' && <CreditCard className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {res.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{res.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className={`text-xs font-bold ${isRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {isRevenue ? '+' : '-'} R$ {res.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">
                        {new Date(res.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-900 text-[10px] text-zinc-400 flex justify-between items-center shrink-0">
          <span>Pressione Esc para fechar</span>
          <span>Clique em um resultado para abrir a página</span>
        </div>
      </div>
    </div>
  );
}
