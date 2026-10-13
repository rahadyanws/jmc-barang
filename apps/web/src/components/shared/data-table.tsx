import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  sortable?: boolean;
  sortKey?: string;
  render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  caption?: string;
}

const ALIGN_CLASSES: Record<NonNullable<DataTableColumn<never>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  skeletonRows = 10,
  emptyMessage = 'Belum ada data',
  sortBy,
  sortOrder,
  onSortChange,
  caption,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-[6px] border border-[#E4E8EF]">
        <table className="w-full border-collapse text-sm">
          {caption !== undefined ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-[#E4E8EF] bg-[#F8FAFC]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]',
                    ALIGN_CLASSES[column.align ?? 'left'],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-[#E4E8EF] last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-[#E4E8EF]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[6px] border border-[#E4E8EF] bg-white">
      <table className="w-full border-collapse text-sm">
        {caption !== undefined ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-[#E4E8EF] bg-[#F8FAFC]">
            {columns.map((column) => {
              const isSorted = column.sortable === true && sortBy === column.sortKey;
              const nextOrder = isSorted && sortOrder === 'asc' ? 'desc' : 'asc';
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]',
                    ALIGN_CLASSES[column.align ?? 'left'],
                  )}
                >
                  {column.sortable === true && onSortChange !== undefined ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.sortKey ?? column.key, nextOrder)}
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#337DA0]"
                    >
                      {column.header}
                      <span aria-hidden className="text-[10px]">
                        {isSorted ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-sm text-[#6B7280]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[#E4E8EF] transition-colors last:border-b-0 hover:bg-[#F8FAFC]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2.5 align-middle text-[#1F2937]',
                      ALIGN_CLASSES[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.render !== undefined ? column.render(row, index) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
