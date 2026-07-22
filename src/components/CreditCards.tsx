/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { CreditCard, CardPurchase } from '../types';
import { 
  Plus, Trash, Edit2, Check, X, CreditCard as CardIcon, 
  Calendar, Percent, Sparkles, Filter, ChevronDown, ChevronUp, 
  TrendingUp, BarChart3, HelpCircle, AlertCircle, Tag
} from 'lucide-react';

export default function CreditCards() {
  const { 
    data, 
    addCreditCard, 
    updateCreditCard, 
    deleteCreditCard, 
    addCardPurchase, 
    updateCardPurchase, 
    deleteCardPurchase, 
    selectedYear, 
    selectedMonth 
  } = useFinancial();

  // Abas de visualização principal: "Compras & Lançamentos" ou "Projeções de Faturas"
  const [viewMode, setViewMode] = useState<'purchases' | 'projections'>('purchases');

  // Estados de controle de formulários
  const [activeFormTab, setActiveFormTab] = useState<'card' | 'purchase'>('purchase');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Campos do Cartão
  const [formCardBank, setFormCardBank] = useState('Nubank');
  const [formCardName, setFormCardName] = useState('');
  const [formCardCategory, setFormCardCategory] = useState('Uso Pessoal');
  const [formCardCustomCat, setFormCardCustomCat] = useState('');
  const [formCardLimit, setFormCardLimit] = useState<number | ''>('');
  const [formCardClose, setFormCardClose] = useState<number | ''>('');
  const [formCardDue, setFormCardDue] = useState<number | ''>('');
  const [formCardActive, setFormCardActive] = useState(true);

  // Campos da Compra
  const [formPurCardId, setFormPurCardId] = useState('');
  const [formPurDesc, setFormPurDesc] = useState('');
  const [formPurCat, setFormPurCat] = useState('Casa');
  const [formPurCustomCat, setFormPurCustomCat] = useState('');
  const [formPurValue, setFormPurValue] = useState<number | ''>('');
  const [formPurInstallments, setFormPurInstallments] = useState<number | ''>(1);
  const [formPurDate, setFormPurDate] = useState('');
  const [formPurFirstDue, setFormPurFirstDue] = useState('');

  // Estados para edição de compra em modal
  const [editingPurchase, setEditingPurchase] = useState<CardPurchase | null>(null);
  const [editPurCategory, setEditPurCategory] = useState('Casa');
  const [editPurCustomCat, setEditPurCustomCat] = useState('');
  const [editPurDesc, setEditPurDesc] = useState('');
  const [editPurValue, setEditPurValue] = useState<number | ''>('');
  const [editPurCardId, setEditPurCardId] = useState('');
  const [editPurDate, setEditPurDate] = useState('');
  const [editPurFirstDue, setEditPurFirstDue] = useState('');

  // Estado para edição rápida inline da categoria
  const [quickEditCatPurchaseId, setQuickEditCatPurchaseId] = useState<string | null>(null);
  const [quickCatValue, setQuickCatValue] = useState('');
  const [quickCustomCatValue, setQuickCustomCatValue] = useState('');

  // Filtros de seleção para visualização
  const [filterCardId, setFilterCardId] = useState('');
  const [filterCardCategory, setFilterCardCategory] = useState('');

  const currentYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  
  const nextYMObj = new Date(selectedYear, selectedMonth, 1);
  const nextYearMonth = `${nextYMObj.getFullYear()}-${String(nextYMObj.getMonth() + 1).padStart(2, '0')}`;

  const cardCategoryOptions = [
    'Uso Pessoal',
    'Corporativo',
    'Alimentação & Benefícios',
    'Viagens & Milhas',
    'Família',
    'Compras & Lazer',
    'Outros'
  ];

  const categories = [
    'Casa', 'Mercado', 'Farmácia', 'Veículo', 'Viagem', 'Lazer', 'Impostos', 'Educação', 'Saúde', 'Pets', 'Outros'
  ];

  const allPurchaseCategories = Array.from(new Set([
    'Casa', 'Mercado', 'Farmácia', 'Veículo', 'Viagem', 'Lazer', 'Impostos', 'Educação', 'Saúde', 'Pets',
    ...(data.variableCategories || []).map(c => c.name),
    'Outros'
  ]));

  const openEditPurchaseModal = (purchase: CardPurchase) => {
    setEditingPurchase(purchase);
    setEditPurDesc(purchase.description);
    setEditPurValue(purchase.totalValue);
    setEditPurCardId(purchase.cardId);
    setEditPurDate(purchase.purchaseDate);
    setEditPurFirstDue(purchase.firstDueDate);

    const cat = purchase.category;
    if (allPurchaseCategories.includes(cat) && cat !== 'Outros') {
      setEditPurCategory(cat);
      setEditPurCustomCat('');
    } else {
      setEditPurCategory('Outros');
      setEditPurCustomCat(cat);
    }
  };

  const handleSavePurchaseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;

    const finalCategory = editPurCategory === 'Outros' && editPurCustomCat.trim()
      ? editPurCustomCat.trim()
      : editPurCategory;

    updateCardPurchase(editingPurchase.id, {
      description: editPurDesc,
      category: finalCategory || 'Outros',
      totalValue: Number(editPurValue),
      cardId: editPurCardId,
      purchaseDate: editPurDate,
      firstDueDate: editPurFirstDue
    });

    setEditingPurchase(null);
  };

  const handleQuickSaveCategory = (purchaseId: string) => {
    const finalCat = quickCatValue === 'Outros' && quickCustomCatValue.trim()
      ? quickCustomCatValue.trim()
      : quickCatValue;

    if (finalCat) {
      updateCardPurchase(purchaseId, { category: finalCat });
    }
    setQuickEditCatPurchaseId(null);
  };

  // Auto-selecionar o primeiro cartão se disponível
  React.useEffect(() => {
    if (data.creditCards.length > 0 && !formPurCardId) {
      setFormPurCardId(data.creditCards[0].id);
    }
  }, [data.creditCards]);

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCardBank || !formCardName || !formCardLimit || !formCardClose || !formCardDue) return;

    const finalCategory = formCardCategory === 'Outros' && formCardCustomCat.trim()
      ? formCardCustomCat.trim()
      : formCardCategory;

    const cardData = {
      bank: formCardBank,
      cardName: formCardName,
      category: finalCategory || 'Uso Pessoal',
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

    const finalPurCat = formPurCat === 'Outros' && formPurCustomCat.trim()
      ? formPurCustomCat.trim()
      : formPurCat;

    addCardPurchase({
      cardId: formPurCardId,
      description: formPurDesc,
      category: finalPurCat,
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
    setFormCardCategory('Uso Pessoal');
    setFormCardCustomCat('');
    setFormCardLimit('');
    setFormCardClose('');
    setFormCardDue('');
    setFormCardActive(true);
    setEditingCardId(null);
  };

  const resetPurchaseForm = () => {
    setFormPurDesc('');
    setFormPurCat('Casa');
    setFormPurCustomCat('');
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

  // --- PROJEÇÕES ANALÍTICAS DE FATURAS (Futuras & Próximas) ---
  const monthlyProjections = React.useMemo(() => {
    const projectionsList: Array<{
      monthLabel: string;
      yearMonth: string;
      totalInvoice: number;
      cardsBreakdown: Array<{
        cardId: string;
        cardName: string;
        bank: string;
        invoiceValue: number;
        availableLimitAtThatMonth: number;
      }>;
      installmentsList: Array<{
        purchaseDesc: string;
        cardName: string;
        installmentIndex: number;
        totalInstallments: number;
        value: number;
        category: string;
      }>;
    }> = [];

    // Gerar projeções para os próximos 12 meses a partir do selecionado
    for (let m = 0; m < 12; m++) {
      const targetDate = new Date(selectedYear, selectedMonth - 1 + m, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;
      const targetYM = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      const monthLabel = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      const installmentsInMonth: typeof projectionsList[0]['installmentsList'] = [];
      const cardsMap: Record<string, number> = {};

      // Inicializa mapa de faturas de cartões
      data.creditCards.forEach(c => {
        cardsMap[c.id] = 0;
      });

      // Calcula todas as parcelas incidindo neste mês
      data.cardPurchases.forEach(p => {
        // Se houver filtro de cartão, pular outros
        if (filterCardId && p.cardId !== filterCardId) return;

        const firstDue = new Date(p.firstDueDate + 'T00:00:00');
        const instVal = p.totalValue / p.totalInstallments;

        for (let i = 0; i < p.totalInstallments; i++) {
          const instDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
          const instYM = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}`;

          if (instYM === targetYM) {
            const card = data.creditCards.find(c => c.id === p.cardId);
            installmentsInMonth.push({
              purchaseDesc: p.description,
              cardName: card ? card.cardName : 'Excluído',
              installmentIndex: i + 1,
              totalInstallments: p.totalInstallments,
              value: instVal,
              category: p.category
            });

            if (p.cardId in cardsMap) {
              cardsMap[p.cardId] += instVal;
            } else {
              cardsMap[p.cardId] = instVal;
            }
          }
        }
      });

      // Calcula o limite disponível estimado para este mês futuro
      // O limite disponível futuro aumenta porque parcelas anteriores a este mês já foram pagas!
      const cardsBreakdown = data.creditCards
        .filter(c => filterCardId ? c.id === filterCardId : true)
        .map(c => {
          const invoiceVal = cardsMap[c.id] || 0;

          // Calcular dívida restante deste cartão a partir deste mês de referência futuro m
          let remainingDebtFromMOnwards = 0;
          const purchases = data.cardPurchases.filter(p => p.cardId === c.id);

          purchases.forEach(p => {
            const firstDue = new Date(p.firstDueDate + 'T00:00:00');
            const instVal = p.totalValue / p.totalInstallments;

            for (let i = 0; i < p.totalInstallments; i++) {
              const instDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
              const instYM = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}`;

              // Se a parcela vence neste mês m ou depois, ela consome limite neste ponto do futuro
              if (instYM >= targetYM) {
                remainingDebtFromMOnwards += instVal;
              }
            }
          });

          const availableLimitAtThatMonth = Math.max(0, c.limit - remainingDebtFromMOnwards);

          return {
            cardId: c.id,
            cardName: c.cardName,
            bank: c.bank,
            invoiceValue: invoiceVal,
            availableLimitAtThatMonth
          };
        });

      const totalInvoice = Object.values(cardsMap).reduce((sum, v) => sum + v, 0);

      projectionsList.push({
        monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        yearMonth: targetYM,
        totalInvoice,
        cardsBreakdown,
        installmentsList: installmentsInMonth
      });
    }

    return projectionsList;
  }, [data.creditCards, data.cardPurchases, selectedYear, selectedMonth, filterCardId]);

  return (
    <div id="credit-cards-panel" className="space-y-6 animate-fade-in">
      {/* Menu Superior de Seleção de Visualização */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('purchases')}
            className={`text-xs font-bold pb-2 transition-all relative cursor-pointer ${
              viewMode === 'purchases'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-black'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Compras & Lançamentos
          </button>
          <button
            onClick={() => setViewMode('projections')}
            className={`text-xs font-bold pb-2 transition-all relative cursor-pointer ${
              viewMode === 'projections'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-black'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Projeções Futuras (Faturas & Limites)
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={filterCardCategory}
            onChange={(e) => setFilterCardCategory(e.target.value)}
            id="filter-card-category-top"
            className="text-[11px] p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden font-bold cursor-pointer"
          >
            <option value="">Filtrar: Categoria do Cartão</option>
            {cardCategoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterCardId}
            onChange={(e) => setFilterCardId(e.target.value)}
            id="filter-card-select-top"
            className="text-[11px] p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden font-bold cursor-pointer"
          >
            <option value="">Filtrar: Todos Cartões</option>
            {data.creditCards.map(c => <option key={c.id} value={c.id}>{c.cardName}</option>)}
          </select>
        </div>
      </div>

      {/* --- MODO DE VISUALIZAÇÃO 1: COMPRAS E CADASTROS --- */}
      {viewMode === 'purchases' && (
        <div className="space-y-6">
          {/* Listagem de Cartões e Métricas de Limite */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cardsCalculated.length === 0 ? (
              <div className="md:col-span-2 text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 p-4 text-zinc-400">
                <CardIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                <p className="text-xs font-semibold">Nenhum cartão cadastrado</p>
                <p className="text-[10px] mt-0.5 font-medium">Cadastre seu primeiro cartão de crédito para registrar suas compras parceladas.</p>
              </div>
            ) : (
              cardsCalculated
                .filter(card => {
                  const matchesCard = filterCardId ? card.id === filterCardId : true;
                  const matchesCategory = filterCardCategory ? (card.category || 'Uso Pessoal') === filterCardCategory : true;
                  return matchesCard && matchesCategory;
                })
                .map(card => (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Layout Estilo Cartão Físico */}
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">{card.cardName}</h3>
                            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold rounded-full border border-indigo-200/60 dark:border-indigo-800/40">
                              <Tag className="w-2.5 h-2.5" />
                              {card.category || 'Uso Pessoal'}
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-400 font-bold mt-0.5 uppercase tracking-wide">
                            {card.bank} • Fechamento: dia {card.closingDay} • Vencimento: dia {card.dueDay}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setEditingCardId(card.id);
                              setFormCardBank(card.bank);
                              setFormCardName(card.cardName);
                              const cat = card.category || 'Uso Pessoal';
                              if (cardCategoryOptions.includes(cat)) {
                                setFormCardCategory(cat);
                                setFormCardCustomCat('');
                              } else {
                                setFormCardCategory('Outros');
                                setFormCardCustomCat(cat);
                              }
                              setFormCardLimit(card.limit);
                              setFormCardClose(card.closingDay);
                              setFormCardDue(card.dueDay);
                              setFormCardActive(card.isActive);
                              setActiveFormTab('card');
                            }}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-indigo-600 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCreditCard(card.id)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-600 cursor-pointer transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Estatísticas Financeiras do Cartão */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Fatura Atual ({selectedMonth}/{selectedYear})</span>
                          <span className="font-black text-rose-600 dark:text-rose-400">R$ {card.invoiceCurrent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                          <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {card.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progresso do Limite do Cartão */}
                    <div>
                      <div className="flex justify-between text-[9px] text-zinc-400 mb-1">
                        <span className="font-semibold">Limite Consumido (Total em Aberto: R$ {card.totalOpenDebt.toLocaleString('pt-BR')})</span>
                        <span className="font-bold">Limite de R$ {card.limit.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${card.percentUsage >= 80 ? 'bg-rose-500' : 'bg-indigo-600'}`}
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
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Compras Ativas Registradas</h3>
                <p className="text-xs text-zinc-500 mb-4 font-medium">Lista de aquisições ativas parceladas e data de incidência das faturas.</p>

                {/* Listagem de Compras */}
                <div className="space-y-3">
                  {filteredPurchases.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                      <p className="text-xs font-semibold">Nenhuma compra parcelada encontrada</p>
                      <p className="text-[10px] mt-0.5">Utilize o painel lateral para registrar suas compras neste cartão.</p>
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0"></span>
                                <span className="text-xs font-black text-zinc-850 dark:text-zinc-200 truncate">{item.description}</span>

                                {quickEditCatPurchaseId === item.id ? (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 border border-indigo-400 dark:border-indigo-600 rounded-lg shadow-sm"
                                  >
                                    <select
                                      value={quickCatValue}
                                      onChange={(e) => setQuickCatValue(e.target.value)}
                                      id={`quick-select-category-${item.id}`}
                                      className="text-[10px] font-bold text-zinc-800 dark:text-zinc-100 bg-transparent outline-hidden cursor-pointer"
                                      autoFocus
                                    >
                                      {allPurchaseCategories.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>

                                    {quickCatValue === 'Outros' && (
                                      <input
                                        type="text"
                                        placeholder="Nova categoria..."
                                        value={quickCustomCatValue}
                                        onChange={(e) => setQuickCustomCatValue(e.target.value)}
                                        id={`quick-input-custom-category-${item.id}`}
                                        className="text-[10px] px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-hidden w-24 font-medium"
                                      />
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleQuickSaveCategory(item.id)}
                                      className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                      title="Salvar Categoria"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setQuickEditCatPurchaseId(null)}
                                      className="p-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-600 dark:text-zinc-300 rounded cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuickEditCatPurchaseId(item.id);
                                      const isStd = allPurchaseCategories.includes(item.category);
                                      if (isStd && item.category !== 'Outros') {
                                        setQuickCatValue(item.category);
                                        setQuickCustomCatValue('');
                                      } else {
                                        setQuickCatValue('Outros');
                                        setQuickCustomCatValue(item.category);
                                      }
                                    }}
                                    className="group text-[9px] px-2 py-0.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-bold uppercase rounded border border-rose-200/50 dark:border-rose-900/30 flex items-center gap-1 cursor-pointer transition-all"
                                    title="Clique para alterar a categoria desta compra"
                                  >
                                    <Tag className="w-2.5 h-2.5 text-rose-500" />
                                    <span>{item.category}</span>
                                    <Edit2 className="w-2.5 h-2.5 text-rose-500 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                                Cartão: <strong className="text-zinc-700 dark:text-zinc-300">{card ? card.cardName : 'Deletado'}</strong> • Parcelas: {item.totalInstallments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-xs font-black text-rose-600 dark:text-rose-400">R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-[9px] text-zinc-400 mt-0.5 font-semibold">Compra: {new Date(item.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              </div>
                              <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 rounded cursor-pointer">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Expansão das Parcelas Automáticas */}
                          {isExpanded && (
                            <div className="border-t border-zinc-150 dark:border-zinc-850 p-4 bg-white dark:bg-zinc-950 space-y-2">
                              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold border-b border-zinc-100 dark:border-zinc-850 pb-1.5 flex-wrap gap-2">
                                <span className="uppercase">Cronograma de Faturamento das Parcelas:</span>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditPurchaseModal(item);
                                    }}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer font-black"
                                    title="Editar categoria ou dados desta compra"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Editar Compra / Categoria
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteCardPurchase(item.id);
                                    }}
                                    className="text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer font-extrabold"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                    Excluir Lançamento
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {Array.from({ length: item.totalInstallments }).map((_, i) => {
                                  const installmentDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
                                  const instYM = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;
                                  const isFuture = instYM > currentYearMonth;
                                  const isCurrent = instYM === currentYearMonth;

                                  return (
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
                                      <span className="font-semibold text-zinc-650 dark:text-zinc-350">Parcela {i + 1} de {item.totalInstallments}</span>
                                      <div className="text-right">
                                        <p className={`font-black ${isCurrent ? 'text-rose-600' : 'text-zinc-700 dark:text-zinc-200'}`}>
                                          R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <span className="text-[9px] text-zinc-400 block font-mono font-medium">
                                          Vence: {installmentDate.toLocaleDateString('pt-BR')} ({isCurrent ? 'Fatura Atual' : isFuture ? 'Futura' : 'Paga'})
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
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
              <div className="bg-zinc-150 dark:bg-zinc-900 p-1 rounded-xl flex">
                <button
                  onClick={() => setActiveFormTab('purchase')}
                  className={`flex-1 text-center py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    activeFormTab === 'purchase'
                      ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Lançar Compra
                </button>
                <button
                  onClick={() => setActiveFormTab('card')}
                  className={`flex-1 text-center py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    activeFormTab === 'card'
                      ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
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
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Descrição da Compra</label>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Notebook, Supermercado, Farmácia"
                          value={formPurDesc}
                          onChange={(e) => setFormPurDesc(e.target.value)}
                          id="input-purchase-desc"
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Categoria da Compra</label>
                          <select
                            value={formPurCat}
                            onChange={(e) => setFormPurCat(e.target.value)}
                            id="select-purchase-category"
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-semibold"
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {formPurCat === 'Outros' && (
                            <input
                              type="text"
                              placeholder="Nome da categoria..."
                              value={formPurCustomCat}
                              onChange={(e) => setFormPurCustomCat(e.target.value)}
                              id="input-purchase-custom-category"
                              className="w-full text-xs p-2 mt-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Qtde Parcelas</label>
                          <input
                            required
                            type="number"
                            min="1"
                            max="60"
                            placeholder="Ex: 12"
                            value={formPurInstallments}
                            onChange={(e) => setFormPurInstallments(e.target.value === '' ? '' : Number(e.target.value))}
                            id="input-purchase-inst"
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
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
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-black text-rose-600 dark:text-rose-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Compra</label>
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
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Registrar Compra Parcelada
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
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 rounded cursor-pointer"
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
                        placeholder="Ex: Nubank, Sicredi, Banco do Brasil"
                        value={formCardBank}
                        onChange={(e) => setFormCardBank(e.target.value)}
                        id="input-card-bank"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nome do Cartão (Identificador)</label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: Nubank Black, BB Gold Ourocard"
                        value={formCardName}
                        onChange={(e) => setFormCardName(e.target.value)}
                        id="input-card-name"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Categoria do Cartão</label>
                      <div className="space-y-2">
                        <select
                          value={formCardCategory}
                          onChange={(e) => setFormCardCategory(e.target.value)}
                          id="select-card-category"
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-semibold"
                        >
                          {cardCategoryOptions.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        {formCardCategory === 'Outros' && (
                          <input
                            type="text"
                            placeholder="Digite o nome da categoria personalizada..."
                            value={formCardCustomCat}
                            onChange={(e) => setFormCardCustomCat(e.target.value)}
                            id="input-card-custom-category"
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-medium"
                          />
                        )}
                      </div>
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
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-black text-indigo-600 dark:text-indigo-400"
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
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
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
      )}

      {/* --- MODO DE VISUALIZAÇÃO 2: PROJEÇÕES ANALÍTICAS DE FATURAS --- */}
      {viewMode === 'projections' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between border-b pb-4 mb-4 gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Próximas Faturas & Projeções Futuras (12 Meses)
                </h3>
                <p className="text-xs text-zinc-500">
                  Previsão analítica das faturas geradas de {selectedMonth}/{selectedYear} em diante, com projeção de recuperação do limite.
                </p>
              </div>

              <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-xl max-w-sm">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Os limites futuros liberam gradativamente na medida em que as parcelas expiram.</span>
              </div>
            </div>

            {/* Listagem da Linha do Tempo de Projeções */}
            <div className="space-y-4">
              {monthlyProjections.map((monthProj, idx) => {
                const hasInstallments = monthProj.installmentsList.length > 0;
                
                return (
                  <div
                    key={monthProj.yearMonth}
                    className={`p-4 border rounded-2xl transition-all ${
                      idx === 0
                        ? 'bg-indigo-50/15 border-indigo-200 dark:bg-indigo-950/5 dark:border-indigo-900/50 ring-1 ring-indigo-100 dark:ring-indigo-950/30'
                        : 'bg-zinc-50/20 border-zinc-150 dark:bg-zinc-900/10'
                    }`}
                  >
                    {/* Header do Mês de Projeção */}
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-2.5 mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-indigo-500' : 'bg-zinc-400'}`}></span>
                        <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                          {monthProj.monthLabel} {idx === 0 ? '(Mês de Referência)' : idx === 1 ? '(Próxima Fatura)' : ''}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Fatura Projetada</span>
                        <span className={`text-sm font-black ${monthProj.totalInvoice > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`}>
                          R$ {monthProj.totalInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown por Cartões neste Mês específico */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs mb-3">
                      {monthProj.cardsBreakdown.map(cardBreakdown => {
                        const originalCard = data.creditCards.find(c => c.id === cardBreakdown.cardId);
                        const cardLimit = originalCard ? originalCard.limit : 0;
                        const recoveryPercent = cardLimit > 0 
                          ? (cardBreakdown.availableLimitAtThatMonth / cardLimit) * 105 
                          : 0;

                        return (
                          <div 
                            key={cardBreakdown.cardId}
                            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-zinc-850 dark:text-zinc-200">{cardBreakdown.cardName}</span>
                              <span className="font-bold text-rose-500 text-[11px]">
                                R$ {cardBreakdown.invoiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                                <span>Limite Projetado Liberado</span>
                                <span>R$ {cardBreakdown.availableLimitAtThatMonth.toLocaleString('pt-BR')} de R$ {cardLimit.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all" 
                                  style={{ width: `${Math.min(100, recoveryPercent)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detalhamento de itens cobrados neste mês */}
                    {hasInstallments ? (
                      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850 space-y-1.5 text-[11px]">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Itens nesta Fatura:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-semibold text-zinc-700 dark:text-zinc-300">
                          {monthProj.installmentsList.map((inst, i) => (
                            <div key={i} className="flex justify-between items-center border-b border-dashed border-zinc-100 dark:border-zinc-850/60 py-0.5">
                              <div className="truncate pr-2">
                                <span className="font-bold">{inst.purchaseDesc}</span>{' '}
                                <span className="text-[9px] bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 px-1 py-0.2 rounded">
                                  {inst.installmentIndex}/{inst.totalInstallments}
                                </span>
                              </div>
                              <span className="font-bold shrink-0">
                                R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-400 font-semibold italic text-center py-1">
                        Sem cobranças parceladas previstas para este mês de referência.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Compra do Cartão */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Editar Compra do Cartão</h3>
              </div>
              <button
                onClick={() => setEditingPurchase(null)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Categoria da Compra</label>
                <select
                  value={editPurCategory}
                  onChange={(e) => setEditPurCategory(e.target.value)}
                  id="modal-select-purchase-category"
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                >
                  {allPurchaseCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {editPurCategory === 'Outros' && (
                  <input
                    type="text"
                    placeholder="Digite a categoria personalizada..."
                    value={editPurCustomCat}
                    onChange={(e) => setEditPurCustomCat(e.target.value)}
                    id="modal-input-purchase-custom-category"
                    className="w-full text-xs p-2.5 mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Descrição da Compra</label>
                <input
                  required
                  type="text"
                  value={editPurDesc}
                  onChange={(e) => setEditPurDesc(e.target.value)}
                  id="modal-input-purchase-desc"
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Total (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editPurValue}
                    onChange={(e) => setEditPurValue(e.target.value === '' ? '' : Number(e.target.value))}
                    id="modal-input-purchase-value"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-black text-rose-600 dark:text-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Cartão Vinculado</label>
                  <select
                    value={editPurCardId}
                    onChange={(e) => setEditPurCardId(e.target.value)}
                    id="modal-select-purchase-card"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                  >
                    {data.creditCards.map(c => (
                      <option key={c.id} value={c.id}>{c.cardName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data da Compra</label>
                  <input
                    required
                    type="date"
                    value={editPurDate}
                    onChange={(e) => setEditPurDate(e.target.value)}
                    id="modal-input-purchase-date"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Primeiro Vencimento</label>
                  <input
                    required
                    type="date"
                    value={editPurFirstDue}
                    onChange={(e) => setEditPurFirstDue(e.target.value)}
                    id="modal-input-purchase-firstdue"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
