/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Upload, FileText, Check, AlertCircle, RefreshCw, HelpCircle, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface RowPreview {
  id: string;
  originalRaw: string[];
  date: string;
  description: string;
  value: number;
  type: 'receita' | 'despesa';
  importStatus: 'pending' | 'success' | 'ignored';
  category: string;
  subcategory: string;
}

export default function CSVImporter() {
  const { addSalary, addVariableExpense } = useFinancial();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Column mapping states
  const [dateColIdx, setDateColIdx] = useState<number>(0);
  const [descColIdx, setDescColIdx] = useState<number>(1);
  const [valColIdx, setValColIdx] = useState<number>(2);

  const [rowPreviews, setRowPreviews] = useState<RowPreview[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);

  // Categorias disponíveis para despesas variáveis rápidas
  const categories = [
    'Casa', 'Mercado', 'Farmácia', 'Veículo', 'Viagem', 'Lazer', 'Impostos', 'Educação', 'Saúde', 'Pets', 'Outros'
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Split lines, handling both CRLF and LF
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      // Parse columns simple splitter (comma or semicolon)
      const detectDelimiter = (firstLine: string) => {
        const commas = (firstLine.match(/,/g) || []).length;
        const semicolons = (firstLine.match(/;/g) || []).length;
        return semicolons > commas ? ';' : ',';
      };

      const delimiter = detectDelimiter(lines[0]);

      const parsedLines = lines.map(line => {
        // Basic CSV splitting (handling quoted values optionally)
        let parts: string[] = [];
        let insideQuote = false;
        let currentPart = '';

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            insideQuote = !insideQuote;
          } else if (char === delimiter && !insideQuote) {
            parts.push(currentPart.trim());
            currentPart = '';
          } else {
            currentPart += char;
          }
        }
        parts.push(currentPart.trim());
        return parts;
      });

      if (parsedLines.length > 0) {
        setCsvHeaders(parsedLines[0]);
        setCsvRows(parsedLines.slice(1));
        
        // Auto detect best matching column indices
        const headersLower = parsedLines[0].map(h => h.toLowerCase());
        const dIdx = headersLower.findIndex(h => h.includes('data') || h.includes('date'));
        const deIdx = headersLower.findIndex(h => h.includes('desc') || h.includes('hist') || h.includes('memo'));
        const vIdx = headersLower.findIndex(h => h.includes('val') || h.includes('amo') || h.includes('quant'));

        if (dIdx !== -1) setDateColIdx(dIdx);
        if (deIdx !== -1) setDescColIdx(deIdx);
        if (vIdx !== -1) setValColIdx(vIdx);

        setStep(2);
      }
    };
    reader.readAsText(file);
  };

  const generatePreviews = () => {
    const list: RowPreview[] = csvRows.map((cols, index) => {
      // Parse date: tentamos YYYY-MM-DD ou DD/MM/YYYY
      let rawDate = cols[dateColIdx] || '';
      let formattedDate = '2026-07-20'; // Fallback
      
      if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          // DD/MM/YYYY -> YYYY-MM-DD
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          formattedDate = `${year}-${month}-${day}`;
        }
      } else if (rawDate.includes('-')) {
        formattedDate = rawDate; // assume YYYY-MM-DD
      }

      // Parse value
      let rawValue = cols[valColIdx] || '0';
      // Limpa caracteres monetários comuns do Brasil
      rawValue = rawValue.replace(/[R$\s]/g, '');
      // Se tiver pontos e vírgula, ex: 1.250,00 -> 1250.00
      if (rawValue.includes('.') && rawValue.includes(',')) {
        rawValue = rawValue.replace(/\./g, '').replace(/,/g, '.');
      } else if (rawValue.includes(',')) {
        // Apenas vírgula: 1250,00 -> 1250.00
        rawValue = rawValue.replace(/,/g, '.');
      }

      const numVal = parseFloat(rawValue) || 0;

      return {
        id: `csv-${index}-${Date.now()}`,
        originalRaw: cols,
        date: formattedDate,
        description: cols[descColIdx] || 'Sem descrição',
        value: Math.abs(numVal),
        type: numVal >= 0 ? 'receita' : 'despesa',
        importStatus: 'pending',
        category: numVal >= 0 ? '' : 'Mercado',
        subcategory: numVal >= 0 ? '' : 'Alimentação'
      };
    });

    setRowPreviews(list);
    setStep(3);
  };

  const handleUpdatePreview = (id: string, updates: Partial<RowPreview>) => {
    setRowPreviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleImportAll = () => {
    let count = 0;
    rowPreviews.forEach(item => {
      if (item.importStatus === 'success' || item.importStatus === 'ignored') return;

      const dateParts = item.date.split('-');
      const year = parseInt(dateParts[0]) || 2026;
      const month = parseInt(dateParts[1]) || 7;

      if (item.type === 'receita') {
        addSalary({
          description: item.description,
          payor: 'Importado por Extrato',
          value: item.value,
          date: item.date,
          year,
          month,
          observation: 'Importado do arquivo CSV de extrato bancário.'
        });
      } else {
        addVariableExpense({
          category: item.category,
          subcategory: item.subcategory,
          value: item.value,
          date: item.date,
          description: item.description,
          paymentMethod: 'Débito Automático'
        });
      }
      item.importStatus = 'success';
      count++;
    });

    setSuccessCount(prev => prev + count);
    setRowPreviews([...rowPreviews]);
  };

  const resetAll = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setRowPreviews([]);
    setSuccessCount(0);
    setStep(1);
  };

  return (
    <div id="csv-importer-panel" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-500">Conciliação Bancária via Extrato</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">Importe extratos CSV de bancos como Nubank, Itaú, Banco do Brasil, Sicredi e converta em lançamentos instantaneamente.</p>
        </div>
        {step > 1 && (
          <button
            onClick={resetAll}
            id="btn-csv-import-reset"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        )}
      </div>

      {step === 1 && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          id="csv-drag-drop-zone"
          className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-10 text-center cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex flex-col items-center group"
        >
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id="file-csv-uploader"
          />
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs group-hover:scale-105 transition-transform mb-4">
            <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Arraste seu extrato CSV aqui</p>
          <p className="text-xs text-zinc-400 mt-1">ou clique para procurar em seu computador</p>
          <span className="mt-6 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-500 font-mono rounded-lg">
            Apenas arquivos .csv são suportados
          </span>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex gap-3">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-400">Mapeamento de Colunas do CSV</p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-500 mt-0.5">Identificamos as colunas do seu arquivo. Por favor, confirme se os mapeamentos estão corretos antes de continuar.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Coluna de Data</label>
              <select
                value={dateColIdx}
                onChange={(e) => setDateColIdx(parseInt(e.target.value))}
                id="select-csv-date-col"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500"
              >
                {csvHeaders.map((header, idx) => (
                  <option key={idx} value={idx}>{header || `Coluna ${idx + 1}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Coluna de Descrição</label>
              <select
                value={descColIdx}
                onChange={(e) => setDescColIdx(parseInt(e.target.value))}
                id="select-csv-desc-col"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500"
              >
                {csvHeaders.map((header, idx) => (
                  <option key={idx} value={idx}>{header || `Coluna ${idx + 1}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Coluna de Valor (R$)</label>
              <select
                value={valColIdx}
                onChange={(e) => setValColIdx(parseInt(e.target.value))}
                id="select-csv-val-col"
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-hidden focus:border-indigo-500"
              >
                {csvHeaders.map((header, idx) => (
                  <option key={idx} value={idx}>{header || `Coluna ${idx + 1}`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-zinc-100 dark:border-zinc-850 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-850 text-xs font-semibold text-zinc-500">
              Amostra das 3 primeiras linhas de dados:
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {csvRows.slice(0, 3).map((row, rIdx) => (
                <div key={rIdx} className="p-3 text-xs flex flex-wrap gap-4 bg-white dark:bg-zinc-950 font-mono text-zinc-500">
                  <span className="text-zinc-800 dark:text-zinc-300 font-semibold">[Linha {rIdx + 1}]</span>
                  <span>Data: <strong className="text-indigo-600 dark:text-indigo-400">{row[dateColIdx] || 'Vazio'}</strong></span>
                  <span>Desc: <strong className="text-zinc-700 dark:text-zinc-300">{row[descColIdx] || 'Vazio'}</strong></span>
                  <span>Valor: <strong className="text-emerald-600 dark:text-emerald-400">{row[valColIdx] || 'Vazio'}</strong></span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={generatePreviews}
              id="btn-csv-preview-generate"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
            >
              Processar Extrato
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-850">
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Revisão dos Lançamentos ({rowPreviews.length} encontrados)</p>
              <p className="text-[11px] text-zinc-500">Selecione as categorias das despesas e confirme os registros.</p>
            </div>
            <div className="flex gap-2">
              {successCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg">
                  <Check className="w-3.5 h-3.5" />
                  {successCount} importados com sucesso!
                </span>
              )}
              <button
                onClick={handleImportAll}
                id="btn-csv-import-execute-all"
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-md transition-all cursor-pointer"
              >
                Importar Todos Pendentes
              </button>
            </div>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-850 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-[10px] font-semibold text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Categoria (Para Despesas)</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                {rowPreviews.map(row => (
                  <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="p-3 font-mono text-zinc-500">{new Date(row.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleUpdatePreview(row.id, { description: e.target.value })}
                        className="bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-hidden py-0.5 text-zinc-800 dark:text-zinc-200 w-full"
                      />
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                        row.type === 'receita' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                      }`}>
                        {row.type === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-zinc-850 dark:text-zinc-200">
                      R$ {row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      {row.type === 'despesa' ? (
                        <select
                          value={row.category}
                          onChange={(e) => handleUpdatePreview(row.id, { category: e.target.value })}
                          className="text-xs p-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                        >
                          {categories.map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-zinc-400">— (Importa como Salário)</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {row.importStatus === 'success' ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold text-xs">
                          <Check className="w-3.5 h-3.5" />
                          Salvo
                        </span>
                      ) : row.importStatus === 'ignored' ? (
                        <span className="text-zinc-400 text-xs">Ignorado</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              const dateParts = row.date.split('-');
                              const year = parseInt(dateParts[0]) || 2026;
                              const month = parseInt(dateParts[1]) || 7;

                              if (row.type === 'receita') {
                                addSalary({
                                  description: row.description,
                                  payor: 'Importação Extrato',
                                  value: row.value,
                                  date: row.date,
                                  year,
                                  month,
                                  observation: 'Importado de extrato bancário.'
                                });
                              } else {
                                addVariableExpense({
                                  category: row.category,
                                  subcategory: row.subcategory,
                                  value: row.value,
                                  date: row.date,
                                  description: row.description,
                                  paymentMethod: 'Débito Automático'
                                });
                              }
                              handleUpdatePreview(row.id, { importStatus: 'success' });
                              setSuccessCount(prev => prev + 1);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all"
                          >
                            Importar
                          </button>
                          <button
                            onClick={() => handleUpdatePreview(row.id, { importStatus: 'ignored' })}
                            className="px-2 py-1 text-[10px] font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded transition-all"
                          >
                            Ignorar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
