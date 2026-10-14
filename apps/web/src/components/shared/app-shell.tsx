'use client';

import { ChevronDown, Loader2, LogOut, Menu, Package, FolderTree, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { SessionUser } from '@/shared';

import { cn } from '@/lib/utils';
import { useLogout, useSession } from '@/features/auth/hooks/use-session';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  icon: ReactNode;
  href?: string;
  adminOnly?: boolean;
  children?: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: 'Barang Masuk',
    icon: <Package className="h-4 w-4" aria-hidden />,
    href: '/barang-masuk',
  },
  {
    label: 'Master Data',
    icon: <FolderTree className="h-4 w-4" aria-hidden />,
    adminOnly: true,
    children: [
      { href: '/master-data/kategori', label: 'Kategori', icon: null },
      { href: '/master-data/sub-kategori', label: 'Sub Kategori', icon: null },
    ],
  },
  {
    label: 'Manajemen User',
    icon: <Users className="h-4 w-4" aria-hidden />,
    href: '/manajemen-user',
    adminOnly: true,
  },
];

const ROLE_LABELS: Record<SessionUser['role'], string> = {
  ADMIN: 'Administrator',
  OPERATOR: 'Operator',
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleLogout(): Promise<void> {
    try {
      await logout.mutateAsync();
      router.replace('/login');
      router.refresh();
    } catch {
      // biarkan menu terbuka; percobaan berikutnya bisa diulang
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-left transition hover:bg-white/10"
      >
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#337DA0] text-xs font-semibold text-white"
        >
          {initialsOf(user.name)}
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-medium text-white">{user.name}</span>
          <span className="text-xs text-[#C9D1DE]">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-[#C9D1DE]" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-52 rounded-[6px] border border-[#E4E8EF] bg-white py-1 shadow-lg"
        >
          <div className="border-b border-[#E4E8EF] px-3 py-2">
            <p className="truncate text-sm font-medium text-[#1F2937]">{user.username}</p>
            <p className="text-xs text-[#6B7280]">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#E5484D] transition hover:bg-[#F4F6FA] disabled:opacity-60"
          >
            {logout.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isPending, isError } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Master Data']);

  useEffect(() => {
    if (isError) {
      router.replace('/login');
    }
  }, [isError, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#337DA0]" aria-hidden />
        <span className="sr-only">Memuat sesi…</span>
      </div>
    );
  }

  if (user == null) {
    return null;
  }

  const visibleNav = NAV.filter((item) => item.adminOnly !== true || user.role === 'ADMIN');

  function isGroupActive(group: NavGroup): boolean {
    if (group.href !== undefined) {
      return pathname === group.href || pathname.startsWith(`${group.href}/`);
    }
    return (group.children ?? []).some(
      (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F6FA]">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#1B2638] transition-transform lg:static lg:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#337DA0] text-xs font-bold text-white"
            >
              JMC
            </span>
            <span className="text-sm font-semibold text-white">Pengelolaan Barang</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Tutup menu"
            className="rounded p-1 text-[#C9D1DE] hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Menu utama" className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNav.map((group) => {
            const active = isGroupActive(group);
            const isExpanded = openGroups.includes(group.label);

            if (group.children !== undefined) {
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((current) =>
                        current.includes(group.label)
                          ? current.filter((label) => label !== group.label)
                          : [...current, group.label],
                      )
                    }
                    aria-expanded={isExpanded}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-sm transition',
                      active
                        ? 'bg-[#337DA0] font-medium text-white'
                        : 'text-[#C9D1DE] hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {group.icon}
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown
                      className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {isExpanded ? (
                    <div className="mt-1 space-y-1 pl-4">
                      {group.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block rounded-[6px] px-3 py-2 text-sm transition',
                            pathname === child.href
                              ? 'bg-[#337DA0] font-medium text-white'
                              : 'text-[#C9D1DE] hover:bg-white/10 hover:text-white',
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={group.href}
                href={group.href ?? '/barang-masuk'}
                className={cn(
                  'flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm transition',
                  active
                    ? 'bg-[#337DA0] font-medium text-white'
                    : 'text-[#C9D1DE] hover:bg-white/10 hover:text-white',
                )}
              >
                {group.icon}
                {group.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[#E4E8EF] bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Buka menu navigasi"
            className="rounded-[6px] p-2 text-[#1F2937] hover:bg-[#F4F6FA] lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <p className="hidden text-xs uppercase tracking-wide text-[#6B7280] lg:block">
            PT JMC Indonesia — Aplikasi Pengelolaan Barang
          </p>
          <UserMenu user={user} />
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
