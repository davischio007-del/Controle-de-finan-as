/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  className?: string;
  containerClassName?: string;
  id?: string;
  required?: boolean;
  type?: string;
  value?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
}

export function TextField({
  label,
  error,
  icon: Icon,
  className = '',
  containerClassName = '',
  id,
  required,
  type = 'text',
  value,
  onChange,
  ...props
}: TextFieldProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
            Icon ? 'pl-9' : ''
          } ${error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
}
