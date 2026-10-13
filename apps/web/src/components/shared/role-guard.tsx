'use client';

import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import type { Role } from '@jmc/shared';

import { messages } from '@/lib/messages';
import { useSession } from '@/features/auth/hooks/use-session';

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const { data: user, isPending, isError } = useSession();

  useEffect(() => {
    if (isError) {
      router.replace('/login');
    }
  }, [isError, router]);

  if (isPending) {
    return (
      <div
        role="status"
        className="flex min-h-[40vh] items-center justify-center text-sm text-[#6B7280]"
      >
        Memuat…
      </div>
    );
  }

  if (user == null) {
    return null;
  }

  if (user.role !== role) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[6px] border border-[#E4E8EF] bg-white p-10 text-center shadow-sm">
        <ShieldAlert className="h-10 w-10 text-[#E5484D]" aria-hidden />
        <h1 className="text-lg font-semibold text-[#1F2937]">Akses Ditolak</h1>
        <p className="text-sm text-[#6B7280]">{messages.forbidden}</p>
      </div>
    );
  }

  return children;
}
