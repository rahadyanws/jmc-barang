'use client';

import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react';

import { MAX_MONEY } from '@jmc/shared';

import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface RupiahInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null;
  onChange: (value: number | null) => void;
  invalid?: boolean;
}

function countDigits(text: string): number {
  let count = 0;
  for (const character of text) {
    if (character >= '0' && character <= '9') {
      count += 1;
    }
  }
  return count;
}

function setCaretToDigit(input: HTMLInputElement, digitTarget: number): void {
  let digits = 0;
  let position = input.value.length;
  for (let index = 0; index < input.value.length; index += 1) {
    const character = input.value[index];
    if (character !== undefined && character >= '0' && character <= '9') {
      digits += 1;
      if (digits >= digitTarget) {
        position = index + 1;
        break;
      }
    }
  }
  input.setSelectionRange(position, position);
}

export function RupiahInput({ value, onChange, invalid = false, className, ...rest }: RupiahInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caretDigitsRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input !== null && caretDigitsRef.current !== null) {
      setCaretToDigit(input, caretDigitsRef.current);
      caretDigitsRef.current = null;
    }
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.currentTarget;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBefore = countDigits(input.value.slice(0, caret));

    const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (digits === '') {
      onChange(null);
      caretDigitsRef.current = 0;
      return;
    }

    const parsed = Number(digits);
    const next = Number.isFinite(parsed) ? Math.min(parsed, MAX_MONEY) : MAX_MONEY;
    onChange(next);
    caretDigitsRef.current = digitsBefore;
  }

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]"
      >
        Rp
      </span>
      <input
        {...rest}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatRupiah(value)}
        onChange={handleChange}
        aria-invalid={invalid}
        onFocus={(event) => {
          event.currentTarget.select();
        }}
        className={cn(
          'h-10 w-full rounded-[6px] border border-[#E4E8EF] bg-white pl-10 pr-3 text-right text-sm text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 disabled:cursor-not-allowed disabled:bg-[#F4F6FA] aria-invalid:border-red-500',
          className,
        )}
      />
    </div>
  );
}
