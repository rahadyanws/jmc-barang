'use client';

import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#337DA0] text-white hover:bg-[#2A6582] focus-visible:outline-[#337DA0] disabled:bg-[#337DA0]/50',
  secondary:
    'border border-[#E4E8EF] bg-white text-[#1F2937] hover:bg-[#F4F6FA] focus-visible:outline-[#337DA0]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-600/50',
  ghost: 'text-[#1F2937] hover:bg-[#F4F6FA] focus-visible:outline-[#337DA0]',
  icon: 'border border-[#E4E8EF] bg-white text-[#1F2937] hover:bg-[#F4F6FA] focus-visible:outline-[#337DA0]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', isLoading = false, className, children, disabled, type, ...rest },
  ref,
) {
  const iconOnly = variant === 'icon';
  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled === true || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[6px] text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        iconOnly ? 'h-8 w-8' : 'h-9 px-4',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
