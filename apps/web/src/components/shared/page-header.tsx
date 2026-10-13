import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        {breadcrumb != null ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {breadcrumb}
          </p>
        ) : null}
        <h1 className="text-xl font-semibold text-[#1F2937]">{title}</h1>
        {description != null ? (
          <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
        ) : null}
      </div>
      {actions != null ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
