/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UseFixedExpenseFormReturn } from '../../hooks/useFixedExpenseForm';
import { Plus, Check, X, CreditCard } from 'lucide-react';
import { TextField } from '../ui/TextField';
import { SelectField } from '../ui/SelectField';
import { Button } from '../ui/Button';

const paymentMethods = ['Pix', 'Dinheiro', 'Débito', 'Cartão', 'Boleto', 'Transferência'];

export function FixedExpenseForm({
  formName,
  setFormName,
  formCategory,
  formSubcategory,
  setFormSubcategory,
  formValue,
  setFormValue,
  formDueDay,
  setFormDueDay,
  formIsRecur,
  setFormIsRecur,
  formStart,
  setFormStart,
  formEnd,
  setFormEnd,
  formPayMethod,
  setFormPayMethod,
  formCardId,
  setFormCardId,
  formPurchaseDate,
  setFormPurchaseDate,
  editingId,
  isAdding,
  activeCategories,
  creditCards,
  handleCategoryChange,
  resetForm,
  handleSave,
}: UseFixedExpenseFormReturn) {
  const currentCategoryObj = activeCategories.find(c => c.name === formCategory);
  const currentSubcategories = currentCategoryObj?.subcategories || [];

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-xs h-fit space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-3">
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
        <TextField
          id="input-fixed-name"
          label="Nome do Vencimento"
          required
          type="text"
          placeholder="Ex: Aluguel, Internet Fibra"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="select-fixed-category"
            label="Categoria"
            value={formCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={
              activeCategories.length === 0
                ? [{ value: '', label: 'Crie uma categoria...' }]
                : activeCategories.map(c => ({ value: c.name, label: c.name }))
            }
          />

          <SelectField
            id="select-fixed-subcategory"
            label="Subcategoria"
            value={formSubcategory}
            onChange={(e) => setFormSubcategory(e.target.value)}
            options={
              currentSubcategories.length === 0
                ? [{ value: '', label: 'Sem subcategoria' }]
                : currentSubcategories.map(sub => ({ value: sub, label: sub }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="select-fixed-pay-method"
            label="Forma Pagamento"
            value={formPayMethod}
            onChange={(e) => setFormPayMethod(e.target.value)}
            options={paymentMethods}
          />

          <TextField
            id="input-fixed-due-day"
            label="Dia do Vencimento"
            required
            type="number"
            min={1}
            max={31}
            placeholder="15"
            value={formDueDay}
            onChange={(e) => setFormDueDay(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        {/* Integração com Cartão de Crédito */}
        {formPayMethod === 'Cartão' && (
          <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950 rounded-xl space-y-3">
            <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Integração com Cartão
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Cartão Utilizado"
                value={formCardId}
                onChange={(e) => setFormCardId(e.target.value)}
                options={
                  creditCards.length === 0
                    ? [{ value: '', label: 'Sem cartões cadastrados' }]
                    : creditCards.map(c => ({
                        value: c.id,
                        label: `${c.cardName} (${c.bank})`,
                      }))
                }
              />

              <TextField
                label="Data da Compra"
                type="date"
                value={formPurchaseDate}
                onChange={(e) => setFormPurchaseDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="input-fixed-value"
            label="Valor Mensal (R$)"
            required
            type="number"
            step="any"
            placeholder="0.00"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value === '' ? '' : Number(e.target.value))}
          />

          <TextField
            id="input-fixed-start"
            label="Data Início"
            required
            type="date"
            value={formStart}
            onChange={(e) => setFormStart(e.target.value)}
          />
        </div>

        <TextField
          id="input-fixed-end"
          label="Data Fim (Opcional)"
          type="date"
          value={formEnd}
          onChange={(e) => setFormEnd(e.target.value)}
        />

        <div className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={formIsRecur}
            onChange={(e) => setFormIsRecur(e.target.checked)}
            id="checkbox-fixed-recur"
            className="rounded-sm text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer"
          />
          <label
            htmlFor="checkbox-fixed-recur"
            className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold select-none cursor-pointer"
          >
            Recorrente mensal automático
          </label>
        </div>

        <Button
          type="submit"
          id="btn-fixed-save"
          variant="primary"
          size="md"
          icon={editingId ? Check : Plus}
          className="w-full"
        >
          {editingId ? 'Salvar Alterações' : 'Cadastrar Conta Fixa'}
        </Button>
      </form>
    </div>
  );
}
