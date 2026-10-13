'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

import { messages } from '@/lib/messages';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = messages.unexpected, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-10 text-center"
    >
      <AlertCircle className="h-8 w-8 text-red-500" aria-hidden />
      <p className="text-sm text-[#1F2937]">{message}</p>
      {onRetry !== undefined ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#E4E8EF] bg-white px-4 text-sm font-medium text-[#1F2937] transition hover:bg-[#F4F6FA]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Muat ulang
        </button>
      ) : null}
    </div>
  );
}
