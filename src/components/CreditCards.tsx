/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { CreditCard, CardPurchase } from '../types';
import { Plus, Trash, Edit2, Check, X, CreditCard as CardIcon, Calendar, Percent, Sparkles, Filter, ChevronDown, ChevronUp } from 'lucide-react';

export default function CreditCards() {
  const { data, addCreditCard, updateCreditCard, deleteCreditCard, addCardPurchase, updateCardPurchase, deleteCardPurchase, selectedYear, selectedMonth } = useFinancial();

  // Estados de controle de formulários
  const [activeFormTab, setActiveFormTab] = useState<'card' | 'purchase'>('purchase');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Campos do Cartão
  const [formCardBank, setFormCardBank] = useState('Nubank');
  const [formCardName, setFormCardName] = useState('');
  const [formCardLimit, setFormCardLimit] = useState<number | ''>('');
  const [formCardClose, setFormCardClose] = useState<number | ''>('');
  const [formCardDue, setFormCardDue] = useState<number | ''>('');
  const [formCardActive, setFormCardActive] = useState(true);

  // Campos da Compra
  const [formPurCardId, setFormPurCardId] = useState('');
  const [formPurDesc, setFormPurDesc] = useState('');
  const [formPurCat, setFormPurCat] = useState('Casa');
  const [formPurValue, setFormPurValue] = useState<number | ''>('');
  const [formPurInstallments, setFormPurInstallments] = useState<number | ''>(1);
  const [formPurDate, setFormPurDate] = useState('');
  const [formPurFirstDue, setFormPurFirstDue] = useState('');

  // Filtro de cartão selecionado para visualização
  const [filterCardId, setFilterCardId] = useState('');

  const currentYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const nextYMObj = new Date(selectedYear, selectedMonth, 1);
  const nextYearMonth = `${nextYMObj.getFullYear()}-${String(nextYMObj.getMonth() + 1).padStart(2, '0')}`;

  const categories = [
    'Casa', 'Mercado', 'Farmácia', 'Veículo', 'Viagem', 'Lazer', 'Impostos', 'Educação', 'Saúde', 'Pets', 'Outros'
  ];

  // Auto-selecionar o primeiro cartão se disponível
  React.useEffect(() => {
    if (data.creditCards.length > 0 && !formPurCardId) {
      setFormPurCardId(data.creditCards[0].id);
    }
  }, [data.creditCards]);

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCardBank || !formCardName || !formCardLimit || !formCardClose || !formCardDue) return;

    const cardData = {
      bank: formCardBank,
      cardName: formCardName,
      limit: Number(formCardLimit),
      closingDay: Number(formCardClose),
      dueDay: Number(formCardDue),
      isActive: formCardActive
    };

    if (editingCardId) {
      updateCreditCard(editingCardId, cardData);
    } else {
      addCreditCard(cardData);
    }
    resetCardForm();
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPurCardId || !formPurDesc || !formPurCat || !formPurValue || !formPurInstallments || !formPurDate || !formPurFirstDue) return;

    addCardPurchase({
      cardId: formPurCardId,
      description: formPurDesc,
      category: formPurCat,
      totalValue: Number(formPurValue),
      totalInstallments: Number(formPurInstallments),
      purchaseDate: formPurDate,
      firstDueDate: formPurFirstDue
    });

    resetPurchaseForm();
  };

  const resetCardForm = () => {
    setFormCardBank('Nubank');
    setFormCardName('');
    setFormCardLimit('');
    setFormCardClose('');
    setFormCardDue('');
    setFormCardActive(true);
    setEditingCardId(null);
  };

  const resetPurchaseForm = () => {
    setFormPurDesc('');
    setFormPurCat('Casa');
    setFormPurValue('');
    setFormPurInstallments(1);
    setFormPurDate('');
    setFormPurFirstDue('');
  };

  // --- CÁLCULOS DINÂMICOS DE CARTÕES ---
  const cardsCalculated = data.creditCards.map(card => {
    let invoiceCurrent = 0; // faturas vencendo no mês selecionado
    let invoiceNext = 0;    // faturas vencendo no mês seguinte
    let futureInstallmentsValue = 0; // parcelas vencendo do mês subsequente em diante
    let totalOpenDebt = 0;  // todas as parcelas a vencer daqui em diante (incluindo atual)

    // Detalhar compras e parcelas deste cartão
    const purchasesOfCard = data.cardPurchases.filter(p => p.cardId === card.id);

    purchasesOfCard.forEach(p => {
      const firstDue = new Date(p.firstDueDate + 'T00:00:00');
      const instVal = p.totalValue / p.totalInstallments;

      for (let i = 0; i < p.totalInstallments; i++) {
        // Calcula data de cada parcela avançando i meses
        const installmentDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
        const instYM = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;

        if (instYM === currentYearMonth) {
          invoiceCurrent += instVal;
        } else if (instYM === nextYearMonth) {
          invoiceNext += instVal;
        } else if (instYM > nextYearMonth) {
          futureInstallmentsValue += instVal;
        }

        if (instYM >= currentYearMonth) {
          totalOpenDebt += instVal;
        }
      }
    });

    const availableLimit = Math.max(0, card.limit - totalOpenDebt);
    const percentUsage = card.limit > 0 ? (totalOpenDebt / card.limit) * 100 : 0;

    return {
      ...card,
      invoiceCurrent,
      invoiceNext,
      futureInstallmentsValue,
      totalOpenDebt,
      availableLimit,
      percentUsage
    };
  });

  // Filtragem de compras
  const filteredPurchases = data.cardPurchases.filter(p => {
    const matchesCard = filterCardId ? p.cardId === filterCardId : true;
    return matchesCard;
  });

  const toggleExpandPurchase = (id: string) => {
    setExpandedPurchaseId(expandedPurchaseId === id ? null : id);
  };

  return (
    <div id="credit-cards-panel" className="space-y-6">
      {/* Listagem de Cartões e Métricas de Limite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cardsCalculated.length === 0 ? (
          <div className="md:col-span-2 text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 p-4 text-zinc-400">
            <CardIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
            <p className="text-xs font-semibold">Nenhum cartão cadastrado</p>
            <p className="text-[10px] mt-0.5">Cadastre seu primeiro cartão de crédito para registrar suas compras parceladas.</p>
          </div>
        ) : (
          cardsCalculated.map(card => (
            <div
              key={card.id}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 shadow-xs relative overflow-hidden"
            >
              {/* Layout Estilo Cartão Físico */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">{card.cardName}</h3>
                  </div>
                  <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">{card.bank} • Fechamento: {card.closingDay} • Vencimento: {card.dueDay}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setEditingCardId(card.id);
                      setFormCardBank(card.bank);
                      setFormCardName(card.cardName);
                      setFormCardLimit(card.limit);
                      setFormCardClose(card.closingDay);
                      setFormCardDue(card.dueDay);
                      setFormCardActive(card.isActive);
                      setActiveFormTab('card');
                    }}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCreditCard(card.id)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Estatísticas Financeiras do Cartão */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Fatura Atual ({selectedMonth}/{selectedYear})</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">R$ {card.invoiceCurrent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Próxima Fatura</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">R$ {card.invoiceNext.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Total em Aberto</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">R$ {card.totalOpenDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Limite Disponível</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">R$ {card.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Progresso do Limite do Cartão */}
              <div>
                <div className="flex justify-between text-[9px] text-zinc-400 mb-1">
                  <span>Limite Consumido (Total Aberto: R$ {card.totalOpenDebt.toLocaleString('pt-BR')})</span>
                  <span>Limite de R$ {card.limit.toLocaleString('pt-BR')}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${card.percentUsage >= 80 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                    style={{ width: `${Math.min(100, card.percentUsage)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Grid Principal: Compras e Cadastros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Histórico de Compras */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Compras no Cartão</h3>
                <p className="text-xs text-zinc-500">Visualização das parcelas e cronograma de lançamentos futuros.</p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={filterCardId}
                  onChange={(e) => setFilterCardId(e.target.value)}
                  id="filter-card-select"
                  className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden"
                >
                  <option value="">Todos Cartões</option>
                  {data.creditCards.map(c => <option key={c.id} value={c.id}>{c.cardName}</option>)}
                </select>
              </div>
            </div>

            {/* Listagem de Compras */}
            <div className="space-y-3">
              {filteredPurchases.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-semibold">Nenhuma compra parcelada</p>
                  <p className="text-[10px] mt-0.5">Registre compras com cartão de crédito utilizando o painel lateral.</p>
                </div>
              ) : (
                filteredPurchases.map(item => {
                  const card = data.creditCards.find(c => c.id === item.cardId);
                  const isExpanded = expandedPurchaseId === item.id;
                  const instValue = item.totalValue / item.totalInstallments;

                  // Calcula parcelas pagas no passado
                  const firstDue = new Date(item.firstDueDate + 'T00:00:00');
                  let paidCount = 0;
                  for (let i = 0; i < item.totalInstallments; i++) {
                    const installmentDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
                    const instYM = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;
                    if (instYM < currentYearMonth) {
                      paidCount++;
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/10"
                    >
                      <div
                        onClick={() => toggleExpandPurchase(item.id)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0"></span>
                            <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate">{item.description}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 font-bold uppercase rounded">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                            Cartão: <strong className="text-zinc-700 dark:text-zinc-300">{card ? card.cardName : 'Deletado'}</strong> • Parcelas: {item.totalInstallments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-black text-rose-600 dark:text-rose-400">R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[9px] text-zinc-400 mt-0.5">Compra: {new Date(item.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                          </div>
                          <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expansão das Parcelas Automáticas */}
                      {isExpanded && (
                        <div className="border-t border-zinc-150 dark:border-zinc-850 p-4 bg-white dark:bg-zinc-950 space-y-2">
                          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold border-b border-zinc-100 dark:border-zinc-850 pb-1.5">
                            <span>Cronograma de Parcelamento gerado:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCardPurchase(item.id);
                              }}
                              className="text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                              Deletar Compra
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {(() => {
                              const list = [];
                              for (let i = 0; i < item.totalInstallments; i++) {
                                const installmentDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
                                const instYM = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;
                                const isFuture = instYM > currentYearMonth;
                                const isCurrent = instYM === currentYearMonth;

                                list.push(
                                  <div
                                    key={i}
                                    className={`p-2 border rounded-lg flex justify-between items-center ${
                                      isCurrent
                                        ? 'bg-rose-50/50 border-rose-150 dark:bg-rose-950/10 dark:border-rose-900/40'
                                        : isFuture
                                        ? 'bg-zinc-50/30 dark:bg-zinc-900/10 border-zinc-150'
                                        : 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30 text-zinc-400'
                                    }`}
                                  >
                                    <span className="font-semibold">Parcela {i + 1} de {item.totalInstallments}</span>
                                    <div className="text-right">
                                      <p className={`font-bold ${isCurrent ? 'text-rose-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                        R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </p>
                                      <span className="text-[9px] text-zinc-400 block font-mono">
                                        Vence: {installmentDate.toLocaleDateString('pt-BR')} ({isCurrent ? 'Atual' : isFuture ? 'Futura' : 'Paga'})
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return list;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Cadastros */}
        <div className="space-y-4">
          {/* Seletor de Formulário (Cartão ou Compra) */}
          <div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl flex">
            <button
              onClick={() => setActiveFormTab('purchase')}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                activeFormTab === 'purchase'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Lançar Compra
            </button>
            <button
              onClick={() => setActiveFormTab('card')}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                activeFormTab === 'card'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Novo Cartão
            </button>
          </div>

          {/* Form 1: Lançar Compra */}
          {activeFormTab === 'purchase' && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-2">Registrar Compra Cartão</h3>
              
              {data.creditCards.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">Você precisa cadastrar um cartão primeiro antes de registrar compras.</p>
              ) : (
                <form onSubmit={handleSavePurchase} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Selecionar Cartão</label>
                    <select
                      value={formPurCardId}
                      onChange={(e) => setFormPurCardId(e.target.value)}
                      id="select-purchase-card"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    >
                      {data.creditCards.map(c => <option key={c.id} value={c.id}>{c.cardName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Descrição</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: TV Samsung, Smartphone, Uber"
                      value={formPurDesc}
                      onChange={(e) => setFormPurDesc(e.target.value)}
                      id="input-purchase-desc"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Categoria</label>
                      <select
                        value={formPurCat}
                        onChange={(e) => setFormPurCat(e.target.value)}
                        id="select-purchase-category"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Quantidade de Parcelas</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="60"
                        placeholder="Ex: 12"
                        value={formPurInstallments}
                        onChange={(e) => setFormPurInstallments(e.target.value === '' ? '' : Number(e.target.value))}
                        id="input-purchase-inst"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Total (R$)</label>
                      <input
                        required
                        type="number"
                        placeholder="0.00"
                        value={formPurValue}
                        onChange={(e) => setFormPurValue(e.target.value === '' ? '' : Number(e.target.value))}
                        id="input-purchase-value"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data da Compra</label>
                      <input
                        required
                        type="date"
                        value={formPurDate}
                        onChange={(e) => setFormPurDate(e.target.value)}
                        id="input-purchase-date"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Primeiro Vencimento da Parcela</label>
                    <input
                      required
                      type="date"
                      value={formPurFirstDue}
                      onChange={(e) => setFormPurFirstDue(e.target.value)}
                      id="input-purchase-firstdue"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn-purchase-save"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Lançar Compra Parcelada
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Form 2: Cadastrar Cartão */}
          {activeFormTab === 'card' && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {editingCardId ? 'Editar Cartão' : 'Novo Cartão Crédito'}
                </h3>
                {editingCardId && (
                  <button
                    onClick={resetCardForm}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCard} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Banco / Emissor</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Nubank, Sicredi, BB"
                    value={formCardBank}
                    onChange={(e) => setFormCardBank(e.target.value)}
                    id="input-card-bank"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nome do Cartão (Identificação)</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Roxinho Nu, Sicredi Visa Gold"
                    value={formCardName}
                    onChange={(e) => setFormCardName(e.target.value)}
                    id="input-card-name"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Limite Total de Crédito (R$)</label>
                  <input
                    required
                    type="number"
                    placeholder="0.00"
                    value={formCardLimit}
                    onChange={(e) => setFormCardLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    id="input-card-limit"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Dia Fechamento</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 15"
                      value={formCardClose}
                      onChange={(e) => setFormCardClose(e.target.value === '' ? '' : Number(e.target.value))}
                      id="input-card-close"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Dia Vencimento</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 22"
                      value={formCardDue}
                      onChange={(e) => setFormCardDue(e.target.value === '' ? '' : Number(e.target.value))}
                      id="input-card-due"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={formCardActive}
                    onChange={(e) => setFormCardActive(e.target.checked)}
                    id="checkbox-card-active"
                    className="rounded-sm text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer"
                  />
                  <label htmlFor="checkbox-card-active" className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold select-none cursor-pointer">
                    Cartão ativo e liberado para compras
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-card-save"
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
                >
                  {editingCardId ? (
                    <>
                      <Check className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Cadastrar Cartão
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
