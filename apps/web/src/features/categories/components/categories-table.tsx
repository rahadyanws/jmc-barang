'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { CategoryDto } from '@jmc/shared';

import { Button } from '@/components/shared/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchInput } from '@/components/shared/search-input';
import { apiErrorMessage } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { useClampPage, useTableParams } from '@/lib/use-table-params';
import { CategoryFormModal } from '../components/category-form-modal';
import { useCategoryList, useDeleteCategory } from '../hooks';

const SORTABLE_KEYS: ReadonlySet<string> = new Set(['code', 'name']);

const ACTION_BUTTON_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E4E8EF] bg-white text-[#1F2937] transition hover:bg-[#F4F6FA] disabled:cursor-not-allowed disabled:opacity-40';

export function CategoriesTable() {
  const { page, search, sortBy, sortOrder, setParams } = useTableParams({
    sortBy: 'code',
    sortableKeys: SORTABLE_KEYS,
  });
  const list = useCategoryList({ page, search: search === '' ? undefined : search, sortBy, sortOrder });
  const deleteCategory = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  useClampPage(page, meta, list.isPending, setParams);

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(category: CategoryDto): void {
    setEditing(category);
    setFormOpen(true);
  }

  async function confirmDelete(): Promise<void> {
    if (deleting === null) {
      return;
    }
    try {
      await deleteCategory.mutateAsync(deleting.id);
      toast.success(messages.deleteOk);
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setDeleting(null);
    }
  }

  const columns: DataTableColumn<CategoryDto>[] = [
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
      render: (category) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(category)}
            aria-label={`Edit kategori ${category.name}`}
            className={ACTION_BUTTON_CLASS}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setDeleting(category)}
            aria-label={`Hapus kategori ${category.name}`}
            className={cn(ACTION_BUTTON_CLASS, 'text-red-600 hover:bg-red-50')}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Kode',
      className: 'font-mono',
      sortable: true,
      sortKey: 'code',
      render: (category) => category.code,
    },
    {
      key: 'name',
      header: 'Nama',
      sortable: true,
      sortKey: 'name',
      render: (category) => category.name,
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb="Master Data"
        title="Kategori"
        description="Kelompokkan barang berdasarkan kategori induk."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Data
          </Button>
        }
      />

      <div className="mb-3">
        <SearchInput
          value={search}
          onSearch={(value) => setParams({ search: value, page: null })}
          placeholder="Cari kode / nama kategori…"
        />
      </div>

      {list.isError ? (
        <ErrorState message={apiErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Daftar kategori"
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

      <CategoryFormModal open={formOpen} category={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title={messages.deleteConfirmTitle}
        message={`Kategori "${deleting?.name ?? ''}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        isDanger
        isLoading={deleteCategory.isPending}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
