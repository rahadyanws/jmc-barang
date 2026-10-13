'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { formatRupiah } from '@/lib/format';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';

export interface PriceLimitSummaryProps {
  total: number;
  priceLimit: number | null;
  errorMessage?: string | null;
  className?: string;
}

export function PriceLimitSummary({
  total,
  priceLimit,
  errorMessage,
  className,
}: PriceLimitSummaryProps) {
  const isOverLimit = priceLimit != null && total > priceLimit;
  const hasError = isOverLimit || errorMessage != null;

  const detailMessage =
    errorMessage ??
    (isOverLimit && priceLimit != null
      ? messages.priceLimitExceeded(formatRupiah(total), formatRupiah(priceLimit))
      : null);

  return (
    <div
      role={hasError ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-[6px] border px-4 py-3 text-sm',
        hasError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-[#E4E8EF] bg-[#F8FAFC] text-[#1F2937]',
        className,
      )}
    >
      <p className="font-medium">
        Total keseluruhan:{' '}
        <span className={cn('tabular-nums', hasError && 'font-semibold text-red-700')}>
          Rp {formatRupiah(total)}
        </span>
        {priceLimit != null ? (
          <>
            {' / '}Batas: <span className="tabular-nums">Rp {formatRupiah(priceLimit)}</span>
          </>
        ) : null}
      </p>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
        {hasError ? (
          <>
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Melebihi batas
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            Dalam batas
          </>
        )}
      </span>
      {detailMessage != null ? (
        <p className="w-full text-xs font-medium text-red-600">{detailMessage}</p>
      ) : null}
    </div>
  );
}
