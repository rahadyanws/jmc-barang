'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

export interface SearchInputProps {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value,
  onSearch,
  placeholder = 'Cari…',
  debounceMs = 400,
  className,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function commit(next: string, immediate: boolean): void {
    setDraft(next);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (immediate) {
      onSearch(next);
      return;
    }
    timerRef.current = setTimeout(() => {
      onSearch(next);
      timerRef.current = null;
    }, debounceMs);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    commit(event.target.value, false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(draft, true);
    }
    if (event.key === 'Escape' && draft !== '') {
      event.preventDefault();
      commit('', true);
    }
  }

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
        aria-hidden
      />
      <input
        type="search"
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-[6px] border border-[#E4E8EF] bg-white pl-9 pr-8 text-sm text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft !== '' ? (
        <button
          type="button"
          onClick={() => commit('', true)}
          aria-label="Hapus pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9CA3AF] transition hover:text-[#1F2937]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
