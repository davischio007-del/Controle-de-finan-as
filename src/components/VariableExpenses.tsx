/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { VariableExpense, ExpenseCategory, CreditCard } from '../types';
import { 
  Plus, Trash, Edit2, Check, X, Receipt, Filter, Search, Sparkles, 
  PlusCircle, CreditCard as CardIcon, Settings, Power, Tag 
} from 'lucide-react';

const calculateCardFirstDueDate = (purchaseDateStr: string, cardId: string, creditCards: CreditCard[]): string => {
  const card = creditCards.find(c => c.id === cardId);
  if (!card) return purchaseDateStr;
  if (!purchaseDateStr) return '';
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

export default function VariableExpenses() {
  const { 
    data, 
    addVariableExpense, 
    updateVariableExpense, 
    deleteVariableExpense, 
    selectedYear, 
    selectedMonth,
    addVariableCategory,
    updateVariableCategory,
    deleteVariableCategory
  } = useFinancial();

  // Estados de controle do Gerenciador de Categorias/Subgrupos
  const [showCatManager, setShowCatManager] = useState(false);

  // Estados de formulário de Despesas
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formValue, setFormValue] = useState<number | ''>('');
  const [formDate, setFormDate] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Dinheiro');

  // Estados para integração de Cartão de Crédito
  const [formCardId, setFormCardId] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formInstallments, setFormInstallments] = useState<number | ''>(1);
  const [formFirstDueDate, setFormFirstDueDate] = useState('');
  const [formObservation, setFormObservation] = useState('');

  // Estados do Gerenciador de Categorias & Subgrupos
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newSubName, setNewSubName] = useState<{ [catId: string]: string }>({});

  const [selectedParentCatId, setSelectedParentCatId] = useState<string>('');
  const [subgroupFormName, setSubgroupFormName] = useState('');
  const [editingSubgroup, setEditingSubgroup] = useState<{ catId: string; subName: string } | null>(null);
  const [editingSubgroupValue, setEditingSubgroupValue] = useState('');

  // Filtros locais
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Obter categorias salvas no contexto
  const variableCategories = data.variableCategories || [];
  const activeCategories = variableCategories.filter(c => c.isActive);

  const paymentMethods = [
    'Dinheiro',
    'PIX',
    'Débito',
    'Transferência',
    'Boleto',
    'Cartão de Crédito'
  ];

  const activeCards = data.creditCards.filter(c => c.isActive);

  // Selecionar primeira categoria e subcategoria ativa se vazias
  useEffect(() => {
    if (activeCategories.length > 0 && !formCategory) {
      const firstCat = activeCategories[0];
      setFormCategory(firstCat.name);
      if (firstCat.subcategories.length > 0) {
        setFormSubcategory(firstCat.subcategories[0]);
      }
    }
  }, [activeCategories, formCategory]);

  // Sincronizar subcategoria quando muda a categoria no form
  const handleCategoryChange = (catName: string) => {
    setFormCategory(catName);
    const cat = variableCategories.find(c => c.name === catName);
    if (cat && cat.subcategories.length > 0) {
      setFormSubcategory(cat.subcategories[0]);
    } else {
      setFormSubcategory('');
    }
  };

  // Define um cartão padrão ao selecionar Cartão de Crédito
  useEffect(() => {
    if (formPayMethod === 'Cartão de Crédito' && !formCardId && activeCards.length > 0) {
      setFormCardId(activeCards[0].id);
    }
  }, [formPayMethod, activeCards, formCardId]);

  // Sincroniza data da compra com a data do gasto por padrão
  useEffect(() => {
    if (formPayMethod === 'Cartão de Crédito' && !formPurchaseDate && formDate) {
      setFormPurchaseDate(formDate);
    }
  }, [formPayMethod, formDate, formPurchaseDate]);

  // Calcula a data do primeiro vencimento automaticamente
  useEffect(() => {
    if (formPayMethod === 'Cartão de Crédito' && formCardId) {
      const pDate = formPurchaseDate || formDate;
      if (pDate) {
        const autoDue = calculateCardFirstDueDate(pDate, formCardId, data.creditCards);
        setFormFirstDueDate(autoDue);
      }
    }
  }, [formPayMethod, formCardId, formPurchaseDate, formDate, data.creditCards]);

  const handleStartEdit = (v: VariableExpense) => {
    setEditingId(v.id);
    setFormCategory(v.category);
    setFormSubcategory(v.subcategory);
    setFormValue(v.value);
    setFormDate(v.date);
    setFormDesc(v.description);
    setFormPayMethod(v.paymentMethod);
    setFormCardId(v.cardId || '');
    setFormPurchaseDate(v.purchaseDate || v.date || '');
    setFormInstallments(v.totalInstallments !== undefined ? v.totalInstallments : 1);
    setFormFirstDueDate(v.firstDueDate || '');
    setFormObservation(v.observation || '');
  };

  const resetForm = () => {
    const firstCat = activeCategories[0]?.name || '';
    setFormCategory(firstCat);
    const catObj = activeCategories.find(c => c.name === firstCat);
    setFormSubcategory(catObj?.subcategories?.[0] || '');
    setFormValue('');
    setFormDate('');
    setFormDesc('');
    setFormPayMethod('Dinheiro');
    setFormCardId('');
    setFormPurchaseDate('');
    setFormInstallments(1);
    setFormFirstDueDate('');
    setFormObservation('');
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formValue || !formDate || !formDesc) return;

    const expenseData = {
      category: formCategory,
      subcategory: formSubcategory || '',
      value: Number(formValue),
      date: formDate,
      description: formDesc,
      paymentMethod: formPayMethod,
      // Campos adicionais para Cartão de Crédito
      ...(formPayMethod === 'Cartão de Crédito' ? {
        cardId: formCardId,
        purchaseDate: formPurchaseDate || formDate,
        totalInstallments: Number(formInstallments) || 1,
        firstDueDate: formFirstDueDate,
        observation: formObservation
      } : {
        cardId: undefined,
        purchaseDate: undefined,
        totalInstallments: undefined,
        firstDueDate: undefined,
        observation: undefined
      })
    };

    if (editingId) {
      updateVariableExpense(editingId, expenseData);
    } else {
      addVariableExpense(expenseData);
    }
    resetForm();
  };

  // --- Operações de Grupos e Subgrupos ---
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addVariableCategory({
      name: newCatName.trim(),
      isActive: true,
      subcategories: []
    });
    setNewCatName('');
  };

  const handleSaveEditCategory = (id: string) => {
    if (!editingCatName.trim()) return;
    updateVariableCategory(id, { name: editingCatName.trim() });
    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleToggleCategoryActive = (cat: ExpenseCategory) => {
    updateVariableCategory(cat.id, { isActive: !cat.isActive });
  };

  const handleAddSubcategory = (catId: string) => {
    const subName = newSubName[catId];
    if (!subName || !subName.trim()) return;
    const cat = variableCategories.find(c => c.id === catId);
    if (!cat) return;

    if (!cat.subcategories.includes(subName.trim())) {
      const updatedSubs = [...cat.subcategories, subName.trim()];
      updateVariableCategory(catId, { subcategories: updatedSubs });
    }
    setNewSubName(prev => ({ ...prev, [catId]: '' }));
  };

  const handleAddSubgroupWithParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCatId || !subgroupFormName.trim()) return;
    const cat = variableCategories.find(c => c.id === selectedParentCatId);
    if (!cat) return;

    if (!cat.subcategories.includes(subgroupFormName.trim())) {
      const updatedSubs = [...cat.subcategories, subgroupFormName.trim()];
      updateVariableCategory(selectedParentCatId, { subcategories: updatedSubs });
    }
    setSubgroupFormName('');
  };

  const handleSaveEditSubgroup = (catId: string, oldSubName: string) => {
    if (!editingSubgroupValue.trim()) return;
    const cat = variableCategories.find(c => c.id === catId);
    if (!cat) return;

    const updatedSubs = cat.subcategories.map(s => s === oldSubName ? editingSubgroupValue.trim() : s);
    updateVariableCategory(catId, { subcategories: updatedSubs });
    setEditingSubgroup(null);
    setEditingSubgroupValue('');
  };

  const handleRemoveSubcategory = (catId: string, subNameToRemove: string) => {
    const cat = variableCategories.find(c => c.id === catId);
    if (!cat) return;

    const updatedSubs = cat.subcategories.filter(s => s !== subNameToRemove);
    updateVariableCategory(catId, { subcategories: updatedSubs });
  };

  // Filtragem
  const filterYM = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const filteredExpenses = data.variableExpenses.filter(v => {
    const matchesMonth = v.date.startsWith(filterYM);
    const matchesCategory = filterCategory ? v.category === filterCategory : true;
    const matchesSearch = searchQuery
      ? v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesMonth && matchesCategory && matchesSearch;
  });

  const totalVariableThisMonth = filteredExpenses.reduce((sum, v) => sum + v.value, 0);

  // Subcategorias disponíveis para o formulário
  const currentFormCatObj = variableCategories.find(c => c.name === formCategory);
  const currentSubcategories = currentFormCatObj ? currentFormCatObj.subcategories : [];

  return (
    <div id="variable-expenses-panel" className="space-y-6">
      {/* Resumo de Despesas Variáveis do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div id="metric-variable-total" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/20 rounded-xl shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Despesas Variáveis</p>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              R$ {totalVariableThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Lançamentos flexíveis efetuados em {selectedMonth}/{selectedYear}</p>
          </div>
        </div>

        <div id="metric-variable-count" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 rounded-xl shrink-0">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quantidade de Lançamentos</p>
            <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-1">
              {filteredExpenses.length} compras
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Média de R$ {(filteredExpenses.length > 0 ? totalVariableThisMonth / filteredExpenses.length : 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} por gasto</p>
          </div>
        </div>
      </div>

      {/* Botão para Gerenciador de Grupos e Subgrupos */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCatManager(!showCatManager)}
          id="btn-toggle-variable-category-manager"
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4 text-indigo-500" />
          {showCatManager ? "Fechar Configuração de Grupos" : "Gerenciar Grupos & Subgrupos"}
        </button>
      </div>

      {/* Painel do Gerenciador de Grupos e Subgrupos */}
      {showCatManager && (
        <div id="variable-category-manager-section" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Configuração de Grupos e Subgrupos - Contas Variáveis</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Crie, edite, exclua ou organize os grupos (categorias principais) e subgrupos vinculados.</p>
          </div>

          {/* Formulários de Cadastro de Grupos e Subgrupos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800">
            {/* 1. Criar Grupo (Categoria Principal) */}
            <form onSubmit={handleAddCategory} className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                1. Criar Novo Grupo (Categoria Principal)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ex: Alimentação, Transporte, Saúde..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Grupo
                </button>
              </div>
            </form>

            {/* 2. Criar Subgrupo vinculado a um Grupo Pai */}
            <form onSubmit={handleAddSubgroupWithParent} className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                2. Criar Subgrupo (Vincular ao Grupo Pai)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  required
                  value={selectedParentCatId}
                  onChange={(e) => setSelectedParentCatId(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="" disabled>Selecione o Grupo Pai...</option>
                  {activeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado, Restaurante..."
                  value={subgroupFormName}
                  onChange={(e) => setSubgroupFormName(e.target.value)}
                  className="flex-1 text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Subgrupo
                </button>
              </div>
            </form>
          </div>

          {/* Listagem de Grupos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {variableCategories.map(cat => (
              <div 
                key={cat.id} 
                className={`p-4 border rounded-xl space-y-3 transition-colors ${
                  cat.isActive 
                    ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/20' 
                    : 'border-zinc-100 dark:border-zinc-900 bg-zinc-100/10 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="text-xs p-1 px-2 border rounded-md border-indigo-300 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 flex-1 outline-hidden"
                      />
                      <button
                        onClick={() => handleSaveEditCategory(cat.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1 text-zinc-400 hover:bg-zinc-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Tag className={`w-3.5 h-3.5 ${cat.isActive ? 'text-indigo-500' : 'text-zinc-400'}`} />
                      <span className={`text-xs font-black ${cat.isActive ? 'text-zinc-800 dark:text-zinc-100' : 'line-through text-zinc-400'}`}>
                        {cat.name}
                      </span>
                      <span className={`text-[8px] px-1 rounded-sm font-bold uppercase ${
                        cat.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {cat.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Botão de Ativar/Inativar */}
                    <button
                      onClick={() => handleToggleCategoryActive(cat)}
                      title={cat.isActive ? "Inativar Grupo" : "Ativar Grupo"}
                      className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                        cat.isActive ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Botão de Editar Nome */}
                    <button
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Botão de Deletar */}
                    <button
                      onClick={() => deleteVariableCategory(cat.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subgrupos vinculados */}
                <div className="border-t border-zinc-100 dark:border-zinc-850 pt-2.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Subgrupos Vinculados</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{cat.subcategories.length} subgrupo(s)</span>
                  </div>

                  {/* Chips de subgrupos com suporte a edição e exclusão */}
                  <div className="flex flex-wrap gap-1.5">
                    {cat.subcategories.length === 0 ? (
                      <span className="text-[10px] text-zinc-400 italic font-medium">Nenhum subgrupo cadastrado</span>
                    ) : (
                      cat.subcategories.map(sub => {
                        const isEditingThisSub = editingSubgroup?.catId === cat.id && editingSubgroup?.subName === sub;
                        if (isEditingThisSub) {
                          return (
                            <div key={sub} className="inline-flex items-center gap-1 p-0.5 px-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                              <input
                                type="text"
                                autoFocus
                                value={editingSubgroupValue}
                                onChange={(e) => setEditingSubgroupValue(e.target.value)}
                                className="text-[10px] p-0.5 bg-white dark:bg-zinc-900 border rounded text-zinc-800 dark:text-zinc-100 w-24 outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditSubgroup(cat.id, sub)}
                                className="p-0.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded"
                                title="Salvar"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubgroup(null)}
                                className="p-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <span 
                            key={sub}
                            className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-800"
                          >
                            <span>{sub}</span>
                            <div className="flex items-center gap-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubgroup({ catId: cat.id, subName: sub });
                                  setEditingSubgroupValue(sub);
                                }}
                                className="p-0.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded focus:outline-hidden"
                                title="Editar subgrupo"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubcategory(cat.id, sub)}
                                className="p-0.5 text-zinc-400 hover:text-rose-500 rounded focus:outline-hidden"
                                title="Excluir subgrupo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Adicionar Subgrupo Rápido */}
                  <div className="flex gap-1 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar subgrupo aqui..."
                      value={newSubName[cat.id] || ''}
                      onChange={(e) => setNewSubName(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      className="text-[10px] p-1 px-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-md flex-1 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubcategory(cat.id)}
                      className="p-1 bg-zinc-100 hover:bg-indigo-50 dark:bg-zinc-900 text-indigo-600 rounded-md cursor-pointer"
                      title="Adicionar Subgrupo"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Lista de Compras */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Despesas Variáveis (Gastos Livres)</h3>
                <p className="text-xs text-zinc-500">Registro detalhado de despesas de consumo flexível por Grupo e Subgrupo</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    id="search-variable-input"
                    className="text-xs p-1.5 pl-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500 w-36"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  id="filter-variable-category"
                  className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500"
                >
                  <option value="">Todos os Grupos</option>
                  {variableCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Listagem real */}
            <div className="space-y-3">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-semibold">Nenhum gasto variável</p>
                  <p className="text-[10px] mt-0.5">Nenhuma despesa variável encontrada para os filtros selecionados.</p>
                </div>
              ) : (
                filteredExpenses.map(item => {
                  const associatedCard = item.cardId ? data.creditCards.find(c => c.id === item.cardId) : null;
                  return (
                    <div
                      key={item.id}
                      className="p-4 border border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 rounded-xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0"></span>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.description}</p>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                          Grupo: <strong className="text-zinc-700 dark:text-zinc-300">{item.category}</strong>
                          {item.subcategory && (
                            <> • Subgrupo: <strong className="text-zinc-700 dark:text-zinc-300">{item.subcategory}</strong></>
                          )}
                          {' '}• Pagamento: {item.paymentMethod}
                          {associatedCard && (
                            <> • <strong className="text-indigo-600 dark:text-indigo-400">{associatedCard.bank} - {associatedCard.cardName}</strong> ({item.totalInstallments}x)</>
                          )}
                        </p>
                        {item.observation && (
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic mt-1">
                            Obs: {item.observation}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-black text-rose-600 dark:text-rose-400">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5 font-mono">{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>

                        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                          <button
                            onClick={() => handleStartEdit(item)}
                            id={`btn-variable-edit-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteVariableExpense(item.id)}
                            id={`btn-variable-delete-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {editingId ? 'Editar Despesa Variável' : 'Cadastrar Despesa Variável'}
            </h3>
            {editingId && (
              <button
                onClick={resetForm}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Descrição</label>
              <input
                required
                type="text"
                placeholder="Ex: Supermercado Mensal, Posto de Gasolina"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                id="input-variable-desc"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Grupo (Categoria)</label>
                <select
                  value={formCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  id="select-variable-category"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                >
                  {activeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Subgrupo</label>
                <select
                  value={formSubcategory}
                  onChange={(e) => setFormSubcategory(e.target.value)}
                  id="select-variable-subcategory"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                >
                  {currentSubcategories.length === 0 ? (
                    <option value="">Sem subgrupos</option>
                  ) : (
                    currentSubcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor (R$)</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-variable-value"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Gasto</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  id="input-variable-date"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Forma de Pagamento</label>
              <select
                value={formPayMethod}
                onChange={(e) => setFormPayMethod(e.target.value)}
                id="select-variable-pay-method"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
              >
                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {formPayMethod === 'Cartão de Crédito' && (
              <div id="credit-card-fields" className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  <CardIcon className="w-3.5 h-3.5" />
                  <span>Detalhes do Cartão de Crédito</span>
                </div>

                {activeCards.length === 0 ? (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/30 font-medium">
                    Nenhum cartão de crédito ativo encontrado. Cadastre um cartão de crédito no painel de Cartões de Crédito para ativar a integração.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">Cartão Utilizado</label>
                      <select
                        required
                        value={formCardId}
                        onChange={(e) => setFormCardId(e.target.value)}
                        id="select-variable-card"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="" disabled>Selecione um cartão</option>
                        {activeCards.map(card => (
                          <option key={card.id} value={card.id}>
                            {card.bank} - {card.cardName} (Venc: dia {card.dueDay})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">Data da Compra</label>
                        <input
                          required
                          type="date"
                          value={formPurchaseDate}
                          onChange={(e) => setFormPurchaseDate(e.target.value)}
                          id="input-variable-purchase-date"
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">Qtd. de Parcelas</label>
                        <input
                          required
                          type="number"
                          min="1"
                          value={formInstallments}
                          onChange={(e) => setFormInstallments(e.target.value === '' ? '' : Number(e.target.value))}
                          id="input-variable-installments"
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Data do Primeiro Vencimento</label>
                        <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-sm">Opcional / Auto</span>
                      </div>
                      <input
                        type="date"
                        value={formFirstDueDate}
                        onChange={(e) => setFormFirstDueDate(e.target.value)}
                        id="input-variable-first-due-date"
                        placeholder="Calculado automaticamente"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">Observações</label>
                      <textarea
                        rows={2}
                        placeholder="Notas sobre a compra..."
                        value={formObservation}
                        onChange={(e) => setFormObservation(e.target.value)}
                        id="textarea-variable-observation"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              id="btn-variable-save"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
            >
              {editingId ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Despesa
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
