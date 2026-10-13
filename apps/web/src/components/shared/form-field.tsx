import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface FormFieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': boolean;
}

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: FormFieldControlProps) => ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy = error != null ? errorId : hint != null ? hintId : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]"
      >
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children({
        id: htmlFor,
        'aria-describedby': describedBy,
        'aria-invalid': error != null,
      })}
      {hint != null && error == null ? (
        <p id={hintId} className="text-xs text-[#6B7280]">
          {hint}
        </p>
      ) : null}
      {error != null ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
