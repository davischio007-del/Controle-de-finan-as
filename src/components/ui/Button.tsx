/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'emerald' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ElementType;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  id?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  type = 'button',
  onClick,
  id,
  ...props
}: ButtonProps) {
  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-2xs',
    secondary:
      'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500 dark:hover:bg-rose-600 shadow-2xs',
    emerald:
      'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-2xs',
    ghost:
      'bg-transparent hover:bg-zinc-100 text-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-850',
    outline:
      'bg-transparent border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-200',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg',
    md: 'px-3.5 py-2 text-xs font-bold gap-2 rounded-xl',
    lg: 'px-5 py-2.5 text-sm font-bold gap-2.5 rounded-xl',
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-bold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
      {children && <span>{children}</span>}
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
    </button>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  color?: 'primary' | 'danger' | 'emerald' | 'warning' | 'ghost' | 'zinc';
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  id?: string;
}

export function IconButton({
  icon: Icon,
  color = 'ghost',
  size = 'md',
  className = '',
  title,
  onClick,
  id,
  ...props
}: IconButtonProps) {
  const colorStyles = {
    primary: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40',
    danger: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40',
    emerald: 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
    warning: 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40',
    ghost: 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-850',
    zinc: 'text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
  };

  const sizeStyles = {
    sm: 'p-1.5 rounded-lg text-xs',
    md: 'p-2 rounded-xl text-sm',
  };

  return (
    <button
      id={id}
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center cursor-pointer transition-colors ${colorStyles[color]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      <Icon className="w-4 h-4 shrink-0" />
    </button>
  );
}
