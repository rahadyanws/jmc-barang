'use client';

import { Circle, CircleCheck, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface StatusToggleProps {
  verified: boolean;
  /** Operator: ikon saja, tidak interaktif. */
  readOnly?: boolean;
  isPending?: boolean;
  title?: string;
  onClick?: () => void;
}

export function StatusToggle({
  verified,
  readOnly = false,
  isPending = false,
  title,
  onClick,
}: StatusToggleProps) {
  const icon = verified ? (
    <CircleCheck className="h-5 w-5 text-emerald-600" aria-hidden />
  ) : (
    <Circle className="h-5 w-5 text-[#9CA3AF]" aria-hidden />
  );
  const label = verified ? 'Terverifikasi' : 'Belum terverifikasi';

  if (readOnly) {
    return (
      <span title={title} aria-label={label} className="inline-flex items-center justify-center">
        {icon}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      title={title ?? label}
      aria-label={label}
      aria-pressed={verified}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[#F4F6FA] disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      {isPending ? <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" aria-hidden /> : icon}
    </button>
  );
}
