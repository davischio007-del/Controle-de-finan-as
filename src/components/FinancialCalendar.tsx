/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Calendar as CalendarIcon, Check, Clock, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

export default function FinancialCalendar() {
  const { data, selectedYear, selectedMonth } = useFinancial();

  // Dias no mês selecionado
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDayIndex = new Date(selectedYear, selectedMonth - 1, 1).getDay();

  // Nomes dos meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Coletar todos os vencimentos no mês atual
  interface CalendarEvent {
    id: string;
    day: number;
    title: string;
    type: 'fixed' | 'card' | 'consignado';
    value: number;
    isPaid: boolean;
    details: string;
  }

  const events: CalendarEvent[] = [];

  // 1. Contas Fixas
  const currentFilterYM = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  data.fixedExpenses.forEach(f => {
    // Valida vigência da conta fixa
    const startYM = f.startDate.slice(0, 7);
    if (startYM > currentFilterYM) return;

    if (f.endDate) {
      const endYM = f.endDate.slice(0, 7);
      if (endYM < currentFilterYM) return;
    }

    const isPaid = (f.paidMonths || []).includes(currentFilterYM);
    events.push({
      id: `fix-${f.id}`,
      day: f.dueDay,
      title: f.name,
      type: 'fixed',
      value: f.value,
      isPaid,
      details: `Conta Fixa • Pagamento por ${f.paymentMethod}`
    });
  });

  // 2. Faturas de Cartões de Crédito
  data.creditCards.forEach(card => {
    if (!card.isActive) return;

    // Calcula valor devido nesta fatura
    let invoiceSum = 0;
    data.cardPurchases
      .filter(p => p.cardId === card.id)
      .forEach(p => {
        const firstDue = new Date(p.firstDueDate + 'T00:00:00');
        for (let i = 0; i < p.totalInstallments; i++) {
          const installmentDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
          const instYearMonth = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;
          if (instYearMonth === currentFilterYM) {
            invoiceSum += p.totalValue / p.totalInstallments;
          }
        }
      });

    if (invoiceSum > 0) {
      events.push({
        id: `card-${card.id}`,
        day: card.dueDay,
        title: `Fatura ${card.cardName}`,
        type: 'card',
        value: invoiceSum,
        isPaid: false, // Opcional, cartões dependem da quitação da fatura
        details: `Vencimento do cartão • Fechamento todo dia ${card.closingDay}`
      });
    }
  });

  // 3. Consignados
  data.consignados.forEach(c => {
    if (c.isPaid) return;
    const firstDue = new Date(c.firstPaymentDate + 'T00:00:00');
    const dueDay = firstDue.getDate();

    events.push({
      id: `con-${c.id}`,
      day: dueDay,
      title: `Parcela ${c.bank}`,
      type: 'consignado',
      value: c.installmentValue,
      isPaid: false,
      details: `Parcela Consignado • Contrato: ${c.contractNumber}`
    });
  });

  // Criar mapeamento de dia para eventos
  const eventsByDay: { [key: number]: CalendarEvent[] } = {};
  for (let i = 1; i <= daysInMonth; i++) {
    eventsByDay[i] = [];
  }
  events.forEach(e => {
    if (e.day >= 1 && e.day <= daysInMonth) {
      eventsByDay[e.day].push(e);
    }
  });

  const blanks = Array(firstDayIndex).fill(null);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const today = new Date();
  const isCurrentFilterMonth = today.getFullYear() === selectedYear && (today.getMonth() + 1) === selectedMonth;
  const currentDayNum = today.getDate();

  // Ordenar lista de compromissos por dia
  const sortedEvents = [...events].sort((a, b) => a.day - b.day);

  return (
    <div id="financial-calendar-panel" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-500 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Agenda Financeira
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Vencimentos e compromissos do mês de <strong>{monthNames[selectedMonth - 1]} de {selectedYear}</strong></p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full inline-block"></span>
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Fixa</span>
          <span className="w-3 h-3 bg-rose-500 rounded-full inline-block ml-2"></span>
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Cartão</span>
          <span className="w-3 h-3 bg-amber-500 rounded-full inline-block ml-2"></span>
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Consignado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendário Grid */}
        <div className="lg:col-span-7 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {blanks.map((_, idx) => (
              <div key={`blank-${idx}`} className="aspect-square bg-transparent"></div>
            ))}

            {daysArray.map(day => {
              const dayEvents = eventsByDay[day] || [];
              const isToday = isCurrentFilterMonth && day === currentDayNum;
              
              return (
                <div
                  key={`day-${day}`}
                  className={`aspect-square bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg p-1.5 flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500 transition-all relative ${
                    isToday ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
                  }`}
                >
                  <span className={`text-[10px] font-bold ${
                    isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {day}
                  </span>

                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {dayEvents.map(e => (
                      <span
                        key={e.id}
                        title={`${e.title}: R$ ${e.value}`}
                        className={`w-1.5 h-1.5 rounded-full ${
                          e.type === 'fixed' ? (e.isPaid ? 'bg-emerald-500' : 'bg-blue-500') :
                          e.type === 'card' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      ></span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de Vencimentos do Mês */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cronograma do Mês</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold">
              {events.length} contas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[340px] pr-1">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                <p className="text-xs font-semibold">Nenhum vencimento</p>
                <p className="text-[10px] mt-0.5">Parabéns! Nenhuma conta registrada vencendo neste mês.</p>
              </div>
            ) : (
              sortedEvents.map(e => {
                const isOverdue = isCurrentFilterMonth && e.day < currentDayNum && !e.isPaid;
                return (
                  <div
                    key={e.id}
                    className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition-all ${
                      e.isPaid
                        ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30 text-zinc-400'
                        : isOverdue
                        ? 'bg-rose-50/30 border-rose-150 dark:bg-rose-950/10 dark:border-rose-900/40 text-rose-900'
                        : 'bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-850 text-zinc-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          e.type === 'fixed' ? 'bg-blue-500' :
                          e.type === 'card' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}></span>
                        <p className={`text-xs font-bold truncate ${e.isPaid ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {e.title}
                        </p>
                      </div>
                      <p className="text-[9px] text-zinc-400 mt-0.5 truncate">{e.details}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${e.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        R$ {e.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded ${
                        e.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 animate-pulse'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {e.isPaid ? (
                          <>
                            <Check className="w-2.5 h-2.5" />
                            Pago
                          </>
                        ) : isOverdue ? (
                          <>
                            <AlertCircle className="w-2.5 h-2.5" />
                            Atrasado (Dia {e.day})
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            Dia {e.day}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
