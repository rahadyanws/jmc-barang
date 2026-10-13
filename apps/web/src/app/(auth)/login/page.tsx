import type { Metadata } from 'next';

import { LoginForm } from '@/features/auth/components/login-form';
import { WarehouseIllustration } from '@/components/shared/warehouse-illustration';

export const metadata: Metadata = {
  title: 'Login — Aplikasi Pengelolaan Barang',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      <section className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2 lg:w-[45%]">
        <div className="flex w-full max-w-[360px] flex-col gap-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-[#1B2638] text-sm font-bold text-white"
            >
              JMC
            </span>
            <div>
              <p className="text-base font-semibold text-slate-900">
                Aplikasi Pengelolaan Barang
              </p>
              <p className="text-sm text-slate-500">PT JMC Indonesia</p>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-[#337DA0]">LOGIN</h1>
            <p className="mt-2 text-sm text-slate-600">
              Selamat Datang, silahkan masukkan username dan password anda!
            </p>
          </div>

          <LoginForm />
        </div>
      </section>

      <aside
        aria-hidden
        className="hidden flex-1 items-center justify-center bg-[#1B2638] p-10 md:flex"
      >
        <WarehouseIllustration className="h-auto w-full max-w-[520px]" />
      </aside>
    </main>
  );
}
