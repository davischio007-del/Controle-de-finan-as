/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Card({ children, className = '', id, ...props }: CardProps) {
  return (
    <div
      id={id}
      className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-xs transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Section({
  title,
  description,
  icon: Icon,
  headerAction,
  children,
  className = '',
  id,
}: SectionProps) {
  return (
    <section id={id} className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-850">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
          </div>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
