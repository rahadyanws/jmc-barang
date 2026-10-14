'use client';

import { Download, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import type { IncomingGoodsDetailDto } from '@jmc/shared';

import { useSession } from '@/features/auth/hooks/use-session';
import { useCategoryOptions } from '@/features/categories/hooks';
import { useSubCategoryOptions } from '@/features/sub-categories/hooks';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/shared/select';
import { StatusToggle } from '@/components/shared/status-toggle';
import { formatDateTimeWib, formatRupiah } from '@/lib/format';
import { apiErrorMessage } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { useClampPage, useTableParams } from '@/lib/use-table-params';
import { incomingGoodsExportPath, incomingGoodsPrintPath } from '../api';
import {
  useDeleteIncomingGoods,
  useIncomingGoodsList,
  useIncomingGoodsYears,
  useVerifyIncomingGoods,
} from '../hooks';

const SORTABLE_KEYS: ReadonlySet<string> = new Set([
  'transactionDate',
  'origin',
  'totalAmount',
]);

const ACTION_BUTTON_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E4E8EF] bg-white text-[#1F2937] transition hover:bg-[#F4F6FA] disabled:cursor-not-allowed disabled:opacity-40';

const HEADER_CELL_CLASS =
  'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]';

interface ItemRow {
  tx: IncomingGoodsDetailDto;
  item: IncomingGoodsDetailDto['items'][number];
  isFirst: boolean;
  rowSpan: number;
}

export function IncomingGoodsTable() {
  const { page, search, sortBy, sortOrder, setParams, getParam } = useTableParams({
    sortBy: 'transactionDate',
    sortableKeys: SORTABLE_KEYS,
  });
  const categoryId = getParam('categoryId');
  const subCategoryId = getParam('subCategoryId');
  const yearParam = getParam('year');
  const year = yearParam === '' ? undefined : Number(yearParam);

  const { data: session } = useSession();
  const isAdmin = session?.role === 'ADMIN';

  const categories = useCategoryOptions();
  const subCategories = useSubCategoryOptions(
    categoryId === '' ? undefined : categoryId,
  );
  const years = useIncomingGoodsYears();

  const list = useIncomingGoodsList({
    page,
    search: search === '' ? undefined : search,
    categoryId: categoryId === '' ? undefined : categoryId,
    subCategoryId: subCategoryId === '' ? undefined : subCategoryId,
    year,
    sortBy,
    sortOrder,
  });
  const verify = useVerifyIncomingGoods();
  const remove = useDeleteIncomingGoods();

  const [deleting, setDeleting] = useState<IncomingGoodsDetailDto | null>(null);
  const [verifying, setVerifying] = useState<IncomingGoodsDetailDto | null>(null);

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  useClampPage(page, meta, list.isPending, setParams);

  async function confirmVerify(): Promise<void> {
    if (verifying === null) {
      return;
    }
    const next = !verifying.isVerified;
    try {
      await verify.mutateAsync({ id: verifying.id, verified: next });
      toast.success(messages.verifyOk);
      setVerifying(null);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setVerifying(null);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (deleting === null) {
      return;
    }
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(messages.deleteOk);
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setDeleting(null);
    }
  }

  function handleSort(nextSortBy: string, nextSortOrder: 'asc' | 'desc'): void {
    setParams({ sortBy: nextSortBy, sortOrder: nextSortOrder, page: null });
  }

  function handleExport(): void {
    const path = incomingGoodsExportPath({
      search: search === '' ? undefined : search,
      categoryId: categoryId === '' ? undefined : categoryId,
      subCategoryId: subCategoryId === '' ? undefined : subCategoryId,
      year,
      sortBy,
      sortOrder,
    });
    const anchor = window.document.createElement('a');
    anchor.href = path;
    anchor.download = '';
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function handlePrint(tx: IncomingGoodsDetailDto): void {
    window.open(incomingGoodsPrintPath(tx.id), '_blank', 'noopener,noreferrer');
  }

  const itemRows: ItemRow[] = rows.flatMap((tx) =>
    tx.items.map((item, index) => ({
      tx,
      item,
      isFirst: index === 0,
      rowSpan: tx.items.length,
    })),
  );

  const noBase = ((meta?.page ?? 1) - 1) * (meta?.pageSize ?? 10);

  return (
    <div>
      <PageHeader
        breadcrumb="Barang Masuk"
        title="Barang Masuk"
        description="Daftar transaksi barang masuk."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#E4E8EF] bg-white px-4 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F4F6FA]"
            >
              <Download className="h-4 w-4" aria-hidden />
              {messages.exportExcel}
            </button>
            <Link
              href="/barang-masuk/baru"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] bg-[#337DA0] px-4 text-sm font-semibold text-white transition hover:bg-[#2A6582]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {messages.addData}
            </Link>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter kategori"
          value={categoryId}
          onChange={(event) =>
            setParams({
              categoryId: event.target.value === '' ? null : event.target.value,
              subCategoryId: null,
              page: null,
            })
          }
          placeholder={messages.allCategories}
          className="h-9 w-full sm:w-44"
          options={(categories.data ?? []).map((option) => ({
            value: option.id,
            label: `${option.code} — ${option.name}`,
          }))}
        />
        <Select
          aria-label="Filter sub kategori"
          value={subCategoryId}
          onChange={(event) =>
            setParams({
              subCategoryId: event.target.value === '' ? null : event.target.value,
              page: null,
            })
          }
          placeholder={messages.allSubCategories}
          className="h-9 w-full sm:w-48"
          options={(subCategories.data ?? []).map((option) => ({
            value: option.id,
            label: option.name,
          }))}
        />
        <Select
          aria-label="Filter tahun"
          value={yearParam}
          onChange={(event) =>
            setParams({ year: event.target.value === '' ? null : event.target.value, page: null })
          }
          placeholder={messages.allYears}
          className="h-9 w-full sm:w-36"
          options={(years.data ?? []).map((value) => ({
            value: String(value),
            label: String(value),
          }))}
        />
        <SearchInput
          value={search}
          onSearch={(value) => setParams({ search: value, page: null })}
          placeholder={messages.searchPlaceholder}
        />
      </div>

      {list.isError ? (
        <ErrorState message={apiErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-[6px] border border-[#E4E8EF] bg-white">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Daftar barang masuk</caption>
              <thead>
                <tr className="border-b border-[#E4E8EF] bg-[#F8FAFC]">
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'w-12 text-center')}>
                    No
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'w-32 text-center')}>
                    Aksi
                  </th>
                  <th
                    scope="col"
                    className={cn(HEADER_CELL_CLASS, 'text-left')}
                    aria-sort={
                      sortBy === 'transactionDate'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleSort(
                          'transactionDate',
                          sortBy === 'transactionDate' && sortOrder === 'asc' ? 'desc' : 'asc',
                        )
                      }
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#337DA0]"
                    >
                      Tanggal
                      <span aria-hidden className="text-[10px]">
                        {sortBy === 'transactionDate' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    className={cn(HEADER_CELL_CLASS, 'text-left')}
                    aria-sort={
                      sortBy === 'origin'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleSort(
                          'origin',
                          sortBy === 'origin' && sortOrder === 'asc' ? 'desc' : 'asc',
                        )
                      }
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#337DA0]"
                    >
                      Asal Barang
                      <span aria-hidden className="text-[10px]">
                        {sortBy === 'origin' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-left')}>
                    Penerima
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-left')}>
                    Unit
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-left')}>
                    Kode
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-left')}>
                    Nama
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-right')}>
                    Harga (Rp.)
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-left')}>
                    Jumlah
                  </th>
                  <th
                    scope="col"
                    className={cn(HEADER_CELL_CLASS, 'text-right')}
                    aria-sort={
                      sortBy === 'totalAmount'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleSort(
                          'totalAmount',
                          sortBy === 'totalAmount' && sortOrder === 'asc' ? 'desc' : 'asc',
                        )
                      }
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#337DA0]"
                    >
                      Total (Rp.)
                      <span aria-hidden className="text-[10px]">
                        {sortBy === 'totalAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-center')}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.isPending ? (
                  Array.from({ length: 6 }).map((_, skeletonRow) => (
                    <tr key={skeletonRow} className="border-b border-[#E4E8EF] last:border-b-0">
                      {Array.from({ length: 12 }).map((__, skeletonCell) => (
                        <td key={skeletonCell} className="px-3 py-3">
                          <div className="h-4 animate-pulse rounded bg-[#E4E8EF]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : itemRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-3 py-10 text-center text-sm text-[#6B7280]"
                    >
                      {messages.empty}
                    </td>
                  </tr>
                ) : (
                  itemRows.map(({ tx, item, isFirst, rowSpan }) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-[#E4E8EF] last:border-b-0',
                        !isFirst && 'bg-[#F3F4F6]',
                      )}
                    >
                      {isFirst ? (
                        <>
                          <td
                            rowSpan={rowSpan}
                            className="px-3 py-2.5 align-top text-center text-[#6B7280]"
                          >
                            {noBase + rows.indexOf(tx) + 1}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-2.5 align-top">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handlePrint(tx)}
                                title={messages.printSurat}
                                aria-label={messages.printSurat}
                                className={ACTION_BUTTON_CLASS}
                              >
                                <Printer className="h-4 w-4" aria-hidden />
                              </button>
                              <Link
                                href={`/barang-masuk/${tx.id}/edit`}
                                aria-label="Edit transaksi"
                                title={
                                  tx.isVerified ? messages.verifiedLocked : 'Edit transaksi'
                                }
                                aria-disabled={tx.isVerified}
                                tabIndex={tx.isVerified ? -1 : undefined}
                                onClick={(event) => {
                                  if (tx.isVerified) {
                                    event.preventDefault();
                                  }
                                }}
                                className={cn(
                                  ACTION_BUTTON_CLASS,
                                  tx.isVerified && 'pointer-events-none opacity-40',
                                )}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setDeleting(tx)}
                                disabled={tx.isVerified}
                                title={
                                  tx.isVerified ? messages.verifiedLocked : 'Hapus transaksi'
                                }
                                aria-label="Hapus transaksi"
                                className={cn(ACTION_BUTTON_CLASS, 'text-red-600 hover:bg-red-50')}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="px-3 py-2.5 align-top whitespace-nowrap text-[#1F2937]"
                          >
                            {formatDateTimeWib(tx.transactionDate)}
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="px-3 py-2.5 align-top text-[#1F2937]"
                          >
                            {tx.origin}
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="px-3 py-2.5 align-top text-[#1F2937]"
                          >
                            {tx.operator.name}
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="px-3 py-2.5 align-top text-[#6B7280]"
                          >
                            {tx.unit}
                          </td>
                        </>
                      ) : null}
                      <td className="px-3 py-2.5 align-middle font-mono text-[#1F2937]">
                        {item.itemCode}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-[#1F2937]">{item.name}</td>
                      <td className="px-3 py-2.5 text-right align-middle text-[#1F2937]">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="px-3 py-2.5 align-middle whitespace-nowrap text-[#1F2937]">
                        {item.quantity} {item.uom}
                      </td>
                      <td className="px-3 py-2.5 text-right align-middle text-[#1F2937]">
                        {formatRupiah(item.lineTotal)}
                      </td>
                      {isFirst ? (
                        <td rowSpan={rowSpan} className="px-3 py-2.5 align-top text-center">
                          <StatusToggle
                            verified={tx.isVerified}
                            readOnly={!isAdmin}
                            isPending={verify.isPending && verifying?.id === tx.id}
                            title={isAdmin ? undefined : messages.operatorVerifyHint}
                            onClick={() => setVerifying(tx)}
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta != null ? (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(nextPage) => setParams({ page: String(nextPage) })}
              isDisabled={list.isFetching}
            />
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={verifying !== null}
        title={
          verifying?.isVerified === true
            ? messages.unverifyConfirmTitle
            : messages.verifyConfirmTitle
        }
        message={
          verifying?.isVerified === true
            ? messages.unverifyConfirmMessage
            : messages.verifyConfirmMessage
        }
        confirmLabel={verifying?.isVerified === true ? 'Batalkan Verifikasi' : 'Verifikasi'}
        isLoading={verify.isPending}
        onConfirm={() => void confirmVerify()}
        onClose={() => setVerifying(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={messages.deleteConfirmTitle}
        message={`Transaksi dari "${deleting?.origin ?? ''}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        isDanger
        isLoading={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
