'use client';

import { type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
}

export function Select({
  options,
  placeholder,
  invalid = false,
  className,
  ...rest
}: SelectProps) {
  return (
    <select
      {...rest}
      className={cn(
        'h-10 w-full appearance-none rounded-[6px] border border-[#E4E8EF] bg-white bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%236B7280%27%3E%3Cpath%20fill-rule%3D%27evenodd%27%20d%3D%27M5.23%207.21a.75.75%200%20011.06.02L10%2011.17l3.71-3.94a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%27%20clip-rule%3D%27evenodd%27%2F%3E%3C%2Fsvg%3E")] bg-[length:16px_16px] bg-[right_0.6rem_center] bg-no-repeat pr-9 text-sm text-[#1F2937] outline-none transition focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 disabled:cursor-not-allowed disabled:bg-[#F4F6FA] aria-invalid:border-red-500',
        className,
      )}
      aria-invalid={invalid}
    >
      {placeholder != null ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
