'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isDisabled?: boolean;
}

function buildPageWindow(page: number, totalPages: number): number[] {
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }
  return pages;
}

export function Pagination({ page, totalPages, onPageChange, isDisabled = false }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex items-center justify-end gap-1 pt-3 text-sm"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={isDisabled || page <= 1}
        aria-label="Halaman sebelumnya"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E4E8EF] bg-white text-[#1F2937] transition hover:bg-[#F4F6FA] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      {buildPageWindow(page, totalPages).map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          disabled={isDisabled}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={cn(
            'inline-flex h-8 min-w-8 items-center justify-center rounded-[6px] px-2 transition disabled:cursor-not-allowed',
            pageNumber === page
              ? 'bg-[#337DA0] font-semibold text-white'
              : 'border border-[#E4E8EF] bg-white text-[#1F2937] hover:bg-[#F4F6FA]',
          )}
        >
          {pageNumber}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={isDisabled || page >= totalPages}
        aria-label="Halaman berikutnya"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E4E8EF] bg-white text-[#1F2937] transition hover:bg-[#F4F6FA] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
