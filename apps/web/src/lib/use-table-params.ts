'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface TableParams {
  page: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  raw: URLSearchParams;
  setParams: (entries: Record<string, string | null>) => void;
  getParam: (key: string) => string;
}

export function useTableParams(defaults: {
  sortBy: string;
  sortableKeys: ReadonlySet<string>;
}): TableParams {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const search = searchParams.get('search') ?? '';
  const sortByParam = searchParams.get('sortBy') ?? defaults.sortBy;
  const sortBy = defaults.sortableKeys.has(sortByParam) ? sortByParam : defaults.sortBy;
  const sortOrderParam = searchParams.get('sortOrder') ?? 'asc';
  const sortOrder: 'asc' | 'desc' = sortOrderParam === 'desc' ? 'desc' : 'asc';

  function setParams(entries: Record<string, string | null>): void {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(entries)) {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    const queryString = next.toString();
    router.replace(queryString === '' ? pathname : `${pathname}?${queryString}`);
  }

  function getParam(key: string): string {
    return searchParams.get(key) ?? '';
  }

  return { page, search, sortBy, sortOrder, raw: searchParams, setParams, getParam };
}

export function useClampPage(
  page: number,
  meta: { totalPages: number } | undefined,
  isPending: boolean,
  setParams: TableParams['setParams'],
): void {
  useEffect(() => {
    if (isPending || meta === undefined || page <= meta.totalPages) {
      return;
    }
    setParams({ page: meta.totalPages > 1 ? String(meta.totalPages) : null });
  }, [isPending, meta, page, setParams]);
}
