/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { FixedExpense, ExpenseCategory } from '../types';
import { 
  Plus, Trash, Edit2, Check, X, Calendar, CheckSquare, Square, 
  DollarSign, Filter, Sparkles, AlertCircle, Settings, Power, 
  PlusCircle, CreditCard, Tag
} from 'lucide-react';

export default function FixedExpenses() {
  const { 
    data, 
    addFixedExpense, 
    updateFixedExpense, 
    toggleFixedExpensePaid, 
    deleteFixedExpense, 
    selectedYear, 
    selectedMonth,
    addFixedCategory,
    updateFixedCategory,
    deleteFixedCategory
  } = useFinancial();

  // Estados de controle de abas / gerência
  const [showCatManager, setShowCatManager] = useState(false);

  // Estados de formulário de Despesa Fixa
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formValue, setFormValue] = useState<number | ''>('');
  const [formDueDay, setFormDueDay] = useState<number | ''>('');
  const [formIsRecur, setFormIsRecur] = useState(true);
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Pix');
  
  // Campos extras para integração com Cartão de Crédito
  const [formCardId, setFormCardId] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('2026-07-20');

  // Estados de Gerenciador de Categorias
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newSubName, setNewSubName] = useState<{ [catId: string]: string }>({});

  // Estados extras para seleção de Grupo Pai e Edição de Subgrupo
  const [selectedParentCatId, setSelectedParentCatId] = useState<string>('');
  const [subgroupFormName, setSubgroupFormName] = useState('');
  const [editingSubgroup, setEditingSubgroup] = useState<{ catId: string; subName: string } | null>(null);
  const [editingSubgroupValue, setEditingSubgroupValue] = useState('');

  // Filtros locais de contas fixas
  const [filterCategory, setFilterCategory] = useState('');

  const currentYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Obter categorias salvas no context
  const fixedCategories = data.fixedCategories || [];
  const activeCategories = fixedCategories.filter(c => c.isActive);

  // Métodos de pagamento suportados
  const paymentMethods = [
    'Pix', 'Dinheiro', 'Débito', 'Cartão', 'Boleto', 'Transferência'
  ];

  // Auto-selecionar primeira categoria ativa se vazia
  React.useEffect(() => {
    if (activeCategories.length > 0 && !formCategory) {
      setFormCategory(activeCategories[0].name);
      if (activeCategories[0].subcategories.length > 0) {
        setFormSubcategory(activeCategories[0].subcategories[0]);
      }
    }
  }, [activeCategories, formCategory]);

  // Sincronizar subcategoria quando muda a categoria no form
  const handleCategoryChange = (catName: string) => {
    setFormCategory(catName);
    const cat = fixedCategories.find(c => c.name === catName);
    if (cat && cat.subcategories.length > 0) {
      setFormSubcategory(cat.subcategories[0]);
    } else {
      setFormSubcategory('');
    }
  };

  const handleStartEdit = (f: FixedExpense) => {
    setEditingId(f.id);
    setFormName(f.name);
    setFormCategory(f.category);
    setFormSubcategory(f.subcategory || '');
    setFormValue(f.value);
    setFormDueDay(f.dueDay);
    setFormIsRecur(f.isRecurring);
    setFormStart(f.startDate);
    setFormEnd(f.endDate || '');
    setFormPayMethod(f.paymentMethod);
    setFormCardId(f.cardId || '');
    setFormPurchaseDate(f.purchaseDate || '2026-07-20');
    setIsAdding(false);
  };

  const resetForm = () => {
    setFormName('');
    const firstCat = activeCategories[0]?.name || '';
    setFormCategory(firstCat);
    const catObj = activeCategories.find(c => c.name === firstCat);
    setFormSubcategory(catObj?.subcategories?.[0] || '');
    setFormValue('');
    setFormDueDay('');
    setFormIsRecur(true);
    setFormStart('');
    setFormEnd('');
    setFormPayMethod('Pix');
    setFormCardId(data.creditCards[0]?.id || '');
    setFormPurchaseDate('2026-07-20');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCategory || !formValue || !formDueDay || !formStart) return;

    const expenseData = {
      name: formName,
      category: formCategory,
      subcategory: formSubcategory || undefined,
      value: Number(formValue),
      dueDay: Number(formDueDay),
      isRecurring: formIsRecur,
      startDate: formStart,
      endDate: formEnd || undefined,
      paymentMethod: formPayMethod,
      isPaid: false,
      // Se pagou no cartão, passa o cardId e a data da compra para vincular
      cardId: formPayMethod === 'Cartão' ? formCardId : undefined,
      purchaseDate: formPayMethod === 'Cartão' ? formPurchaseDate : undefined,
    };

    if (editingId) {
      updateFixedExpense(editingId, expenseData);
    } else {
      addFixedExpense(expenseData);
    }
    resetForm();
  };

  // --- CRUD local de Categorias ---
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addFixedCategory({
      name: newCatName.trim(),
      isActive: true,
      subcategories: []
    });
    setNewCatName('');
  };

  const handleSaveEditCategory = (id: string) => {
    if (!editingCatName.trim()) return;
    updateFixedCategory(id, { name: editingCatName.trim() });
    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleToggleCategoryActive = (cat: ExpenseCategory) => {
    updateFixedCategory(cat.id, { isActive: !cat.isActive });
  };

  const handleAddSubcategory = (catId: string) => {
    const subName = newSubName[catId];
    if (!subName || !subName.trim()) return;
    const cat = fixedCategories.find(c => c.id === catId);
    if (!cat) return;

    if (!cat.subcategories.includes(subName.trim())) {
      const updatedSubs = [...cat.subcategories, subName.trim()];
      updateFixedCategory(catId, { subcategories: updatedSubs });
    }
    setNewSubName(prev => ({ ...prev, [catId]: '' }));
  };

  const handleAddSubgroupWithParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCatId || !subgroupFormName.trim()) return;
    const cat = fixedCategories.find(c => c.id === selectedParentCatId);
    if (!cat) return;

    if (!cat.subcategories.includes(subgroupFormName.trim())) {
      const updatedSubs = [...cat.subcategories, subgroupFormName.trim()];
      updateFixedCategory(selectedParentCatId, { subcategories: updatedSubs });
    }
    setSubgroupFormName('');
  };

  const handleSaveEditSubgroup = (catId: string, oldSubName: string) => {
    if (!editingSubgroupValue.trim()) return;
    const cat = fixedCategories.find(c => c.id === catId);
    if (!cat) return;

    const updatedSubs = cat.subcategories.map(s => s === oldSubName ? editingSubgroupValue.trim() : s);
    updateFixedCategory(catId, { subcategories: updatedSubs });
    setEditingSubgroup(null);
    setEditingSubgroupValue('');
  };

  const handleRemoveSubcategory = (catId: string, subNameToRemove: string) => {
    const cat = fixedCategories.find(c => c.id === catId);
    if (!cat) return;

    const updatedSubs = cat.subcategories.filter(s => s !== subNameToRemove);
    updateFixedCategory(catId, { subcategories: updatedSubs });
  };

  // Filtragem das Contas Fixas
  const filteredExpenses = data.fixedExpenses.filter(f => {
    // 1. Filtro de vigência temporal
    const startYM = f.startDate.slice(0, 7);
    if (startYM > currentYearMonth) return false;

    if (f.endDate) {
      const endYM = f.endDate.slice(0, 7);
      if (endYM < currentYearMonth) return false;
    }

    // 2. Filtro de Categoria
    if (filterCategory && f.category !== filterCategory) return false;

    return true;
  });

  const totalFixedVal = filteredExpenses.reduce((sum, f) => sum + f.value, 0);
  const totalPaidVal = filteredExpenses
    .filter(f => (f.paidMonths || []).includes(currentYearMonth))
    .reduce((sum, f) => sum + f.value, 0);

  const pendingVal = totalFixedVal - totalPaidVal;

  return (
    <div id="fixed-expenses-panel" className="space-y-6">
      {/* Resumo de Contas Fixas do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div id="metric-fixed-total" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/20 rounded-xl shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Contas Fixas</p>
            <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-1">
              R$ {totalFixedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5 font-semibold">Obrigações vigentes em {selectedMonth}/{selectedYear}</p>
          </div>
        </div>

        <div id="metric-fixed-paid" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 rounded-xl shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Pago</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {totalPaidVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5 font-semibold">Contas marcadas como pagas</p>
          </div>
        </div>

        <div id="metric-fixed-pending" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/20 rounded-xl shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total em Aberto</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              R$ {pendingVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5 font-semibold">Aguardando liquidação</p>
          </div>
        </div>
      </div>

      {/* Botão para Gerenciador de Categorias */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCatManager(!showCatManager)}
          id="btn-toggle-category-manager"
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4 text-indigo-500" />
          {showCatManager ? "Fechar Configuração de Categorias" : "Gerenciar Categorias & Subcategorias"}
        </button>
      </div>

      {/* Painel do Gerenciador de Categorias */}
      {showCatManager && (
        <div id="category-manager-section" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Configuração de Categorias - Contas Fixas</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Crie, edite, exclua ou inative categorias de despesas fixas de forma autônoma.</p>
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
                  placeholder="Ex: Moradia, Assinaturas..."
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
                  placeholder="Ex: Água, Internet..."
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

          {/* Listagem de Categorias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {fixedCategories.map(cat => (
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
                      title={cat.isActive ? "Inativar Categoria" : "Ativar Categoria"}
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
                      onClick={() => deleteFixedCategory(cat.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategorias vinculadas */}
                <div className="border-t border-zinc-100 dark:border-zinc-850 pt-2.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Subgrupos Vinculados</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{cat.subcategories.length} subgrupo(s)</span>
                  </div>

                  {/* Chips de subcategorias com edição e exclusão */}
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

                  {/* Adicionar Subcategoria Rápido */}
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

      {/* Grid de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Lista de Contas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Contas Fixas</h3>
                <p className="text-xs text-zinc-500">Acompanhe vencimentos e marque como pagas para este mês.</p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  id="filter-fixed-category"
                  className="text-xs p-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden"
                >
                  <option value="">Todas Categorias</option>
                  {fixedCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Listagem de contas */}
            <div className="space-y-3">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-semibold">Nenhuma conta fixa aplicável</p>
                  <p className="text-[10px] mt-0.5 font-medium">Não há contas ativas de vigência iniciada em {selectedMonth}/{selectedYear}.</p>
                </div>
              ) : (
                filteredExpenses.map(item => {
                  const isPaid = (item.paidMonths || []).includes(currentYearMonth);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition-all ${
                        isPaid
                          ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30 text-zinc-400'
                          : 'bg-zinc-50/30 dark:bg-zinc-900/10 border-zinc-150 dark:border-zinc-850'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Caixa de seleção rápida de pagamento */}
                        <button
                          onClick={() => toggleFixedExpensePaid(item.id, currentYearMonth)}
                          id={`btn-fixed-toggle-paid-${item.id}`}
                          className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                            isPaid
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-600'
                          }`}
                        >
                          {isPaid ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate">{item.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold uppercase tracking-wider">
                              {item.category} {item.subcategory ? `> ${item.subcategory}` : ''}
                            </span>
                            {item.cardPurchaseId && (
                              <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 font-bold uppercase tracking-wider">
                                <CreditCard className="w-2 h-2" /> Cartão
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                            Vence dia: <strong className="text-zinc-700 dark:text-zinc-300">{item.dueDay}</strong> • {item.paymentMethod}
                            {item.purchaseDate && ` (Compra: ${new Date(item.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR')})`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
                        <div className="text-right">
                          <p className={`text-xs font-black ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-850 dark:text-zinc-100'}`}>
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-wide mt-1 ${
                            isPaid ? 'bg-emerald-100 text-emerald-850' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                          <button
                            onClick={() => handleStartEdit(item)}
                            id={`btn-fixed-edit-${item.id}`}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteFixedExpense(item.id)}
                            id={`btn-fixed-delete-${item.id}`}
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
              {editingId ? 'Editar Conta Recorrente' : 'Cadastrar Conta Fixa'}
            </h3>
            {(editingId || isAdding) && (
              <button
                onClick={resetForm}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nome do Vencimento</label>
              <input
                required
                type="text"
                placeholder="Ex: Aluguel, Internet Fibra"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                id="input-fixed-name"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Categoria</label>
                <select
                  value={formCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  id="select-fixed-category"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                >
                  {activeCategories.length === 0 ? (
                    <option value="">Crie uma categoria...</option>
                  ) : (
                    activeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Subcategoria</label>
                <select
                  value={formSubcategory}
                  onChange={(e) => setFormSubcategory(e.target.value)}
                  id="select-fixed-subcategory"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                >
                  {(() => {
                    const activeCat = fixedCategories.find(c => c.name === formCategory);
                    if (!activeCat || activeCat.subcategories.length === 0) {
                      return <option value="">Sem subcategoria</option>;
                    }
                    return activeCat.subcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Forma Pagamento</label>
                <select
                  value={formPayMethod}
                  onChange={(e) => setFormPayMethod(e.target.value)}
                  id="select-fixed-pay-method"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                >
                  {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Dia do Vencimento</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  placeholder="15"
                  value={formDueDay}
                  onChange={(e) => setFormDueDay(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-fixed-due-day"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Renderização Condicional se for Cartão de Crédito */}
            {formPayMethod === 'Cartão' && (
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950 rounded-xl space-y-3">
                <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Integração com Cartão
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Cartão utilizado</label>
                    <select
                      value={formCardId}
                      onChange={(e) => setFormCardId(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    >
                      {data.creditCards.length === 0 ? (
                        <option value="">Sem cartões cadastrados</option>
                      ) : (
                        data.creditCards.map(c => (
                          <option key={c.id} value={c.id}>{c.cardName} ({c.bank})</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Data da compra</label>
                    <input
                      type="date"
                      value={formPurchaseDate}
                      onChange={(e) => setFormPurchaseDate(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valor Mensal (R$)</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value === '' ? '' : Number(e.target.value))}
                  id="input-fixed-value"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Início</label>
                <input
                  required
                  type="date"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  id="input-fixed-start"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data Fim (Opcional)</label>
              <input
                type="date"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                id="input-fixed-end"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={formIsRecur}
                onChange={(e) => setFormIsRecur(e.target.checked)}
                id="checkbox-fixed-recur"
                className="rounded-sm text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer"
              />
              <label htmlFor="checkbox-fixed-recur" className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold select-none cursor-pointer">
                Recorrente mensal automático
              </label>
            </div>

            <button
              type="submit"
              id="btn-fixed-save"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
            >
              {editingId ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Conta Fixa
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
