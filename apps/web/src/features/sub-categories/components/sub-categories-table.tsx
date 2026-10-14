'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { SubCategoryDto } from '@jmc/shared';

import { Button } from '@/components/shared/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/shared/select';
import { formatRupiah } from '@/lib/format';
import { apiErrorMessage } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { useClampPage, useTableParams } from '@/lib/use-table-params';
import { useCategoryOptions } from '@/features/categories/hooks';
import { SubCategoryFormModal } from './sub-category-form-modal';
import { useDeleteSubCategory, useSubCategoryList } from '../hooks';

const SORTABLE_KEYS: ReadonlySet<string> = new Set(['name', 'priceLimit']);

const ACTION_BUTTON_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E4E8EF] bg-white text-[#1F2937] transition hover:bg-[#F4F6FA] disabled:cursor-not-allowed disabled:opacity-40';

export function SubCategoriesTable() {
  const { page, search, sortBy, sortOrder, setParams, getParam } = useTableParams({
    sortBy: 'name',
    sortableKeys: SORTABLE_KEYS,
  });
  const categoryId = getParam('categoryId');
  const categories = useCategoryOptions();
  const list = useSubCategoryList({
    page,
    search: search === '' ? undefined : search,
    categoryId: categoryId === '' ? undefined : categoryId,
    sortBy,
    sortOrder,
  });
  const deleteSubCategory = useDeleteSubCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubCategoryDto | null>(null);
  const [deleting, setDeleting] = useState<SubCategoryDto | null>(null);

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  useClampPage(page, meta, list.isPending, setParams);

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(subCategory: SubCategoryDto): void {
    setEditing(subCategory);
    setFormOpen(true);
  }

  async function confirmDelete(): Promise<void> {
    if (deleting === null) {
      return;
    }
    try {
      await deleteSubCategory.mutateAsync(deleting.id);
      toast.success(messages.deleteOk);
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setDeleting(null);
    }
  }

  const columns: DataTableColumn<SubCategoryDto>[] = [
    {
      key: 'no',
      header: 'No',
      align: 'center',
      className: 'w-12 text-[#6B7280]',
      render: (_row, index) => ((meta?.page ?? 1) - 1) * (meta?.pageSize ?? 10) + index + 1,
    },
    {
      key: 'action',
      header: 'Aksi',
      align: 'center',
      className: 'w-24',
      render: (subCategory) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(subCategory)}
            aria-label={`Edit sub kategori ${subCategory.name}`}
            className={ACTION_BUTTON_CLASS}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setDeleting(subCategory)}
            aria-label={`Hapus sub kategori ${subCategory.name}`}
            className={cn(ACTION_BUTTON_CLASS, 'text-red-600 hover:bg-red-50')}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (subCategory) => `${subCategory.category.code} — ${subCategory.category.name}`,
    },
    {
      key: 'name',
      header: 'Nama',
      sortable: true,
      sortKey: 'name',
      render: (subCategory) => subCategory.name,
    },
    {
      key: 'priceLimit',
      header: 'Batas Harga',
      align: 'right',
      sortable: true,
      sortKey: 'priceLimit',
      render: (subCategory) => (
        <span className="tabular-nums">Rp {formatRupiah(subCategory.priceLimit)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb="Master Data"
        title="Sub Kategori"
        description="Setiap sub kategori memiliki batas harga per transaksi."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Data
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onSearch={(value) => setParams({ search: value, page: null })}
          placeholder="Cari nama sub kategori…"
        />
        <Select
          aria-label="Filter kategori"
          value={categoryId}
          onChange={(event) =>
            setParams({ categoryId: event.target.value === '' ? null : event.target.value, page: null })
          }
          placeholder="Semua kategori"
          className="h-9 w-full sm:w-56"
          options={(categories.data ?? []).map((category) => ({
            value: category.id,
            label: `${category.code} — ${category.name}`,
          }))}
        />
      </div>

      {list.isError ? (
        <ErrorState message={apiErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Daftar sub kategori"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            isLoading={list.isPending}
            emptyMessage={messages.empty}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(nextSortBy, nextSortOrder) =>
              setParams({ sortBy: nextSortBy, sortOrder: nextSortOrder, page: null })
            }
          />
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

      <SubCategoryFormModal
        open={formOpen}
        subCategory={editing}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={messages.deleteConfirmTitle}
        message={`Sub kategori "${deleting?.name ?? ''}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        isDanger
        isLoading={deleteSubCategory.isPending}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
