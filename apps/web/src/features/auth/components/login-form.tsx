'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { loginSchema } from '@jmc/shared';

import { ApiError } from '@/lib/api-client';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { useLogin } from '../hooks/use-session';

type LoginFormValues = z.infer<typeof loginSchema>;

const SLOW_HINT_MS = 3_000;

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [slowHint, setSlowHint] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
    mode: 'onTouched',
  });

  const isLoading = login.isPending || isSubmitting;

  useEffect(() => {
    if (!isLoading) {
      setSlowHint(false);
      return;
    }
    const timer = setTimeout(() => setSlowHint(true), SLOW_HINT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      router.replace('/barang-masuk');
      router.refresh();
    } catch {
      // error ditampilkan lewat login.error di bawah
    }
  });

  const formError =
    login.error instanceof ApiError
      ? login.error.message
      : login.isError
        ? messages.unexpected
        : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[360px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          autoFocus
          aria-invalid={errors.username !== undefined}
          className={cn(
            'h-10 w-full rounded-[6px] border bg-white px-3 text-sm text-slate-900 outline-none transition',
            'placeholder:text-slate-400 focus:ring-2 focus:ring-[#337DA0] focus:ring-offset-2',
            errors.username !== undefined ? 'border-[#E5484D]' : 'border-[#E4E8EF]',
          )}
          {...register('username')}
        />
        {errors.username !== undefined ? (
          <p role="alert" className="text-xs text-[#E5484D]">
            {errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={errors.password !== undefined}
            className={cn(
              'h-10 w-full rounded-[6px] border bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition',
              'placeholder:text-slate-400 focus:ring-2 focus:ring-[#337DA0] focus:ring-offset-2',
              errors.password !== undefined ? 'border-[#E5484D]' : 'border-[#E4E8EF]',
            )}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password !== undefined ? (
          <p role="alert" className="text-xs text-[#E5484D]">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {formError !== null ? (
        <div
          role="alert"
          className="rounded-[6px] border border-[#E5484D]/40 bg-[#E5484D]/10 px-3 py-2 text-sm text-[#B4232A]"
        >
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'h-10 w-full rounded-[6px] bg-[#337DA0] text-sm font-semibold uppercase tracking-wide text-white transition',
          'hover:bg-[#2A6A89] focus:ring-2 focus:ring-[#337DA0] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70',
        )}
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Memproses…
          </span>
        ) : (
          'Masuk'
        )}
      </button>

      {slowHint ? (
        <p role="status" className="text-center text-xs text-slate-500">
          {messages.serverSlow}
        </p>
      ) : null}
    </form>
  );
}
