'use client';

import { Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { Role, UserDto } from '@jmc/shared';

import { useSession } from '@/features/auth/hooks/use-session';

import { Button } from '@/components/shared/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/shared/select';
import { roleLabel } from '@/lib/format';
import { apiErrorMessage } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { useClampPage, useTableParams } from '@/lib/use-table-params';
import { useDeleteUser, useLockUser, useUserList } from '../hooks';
import { UserFormModal } from './user-form-modal';

const SORTABLE_KEYS: ReadonlySet<string> = new Set(['username', 'name']);

const ACTION_BUTTON_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E4E8EF] bg-white text-[#1F2937] transition hover:bg-[#F4F6FA] disabled:cursor-not-allowed disabled:opacity-40';

export function UsersTable() {
  const { page, search, sortBy, sortOrder, setParams, getParam } = useTableParams({
    sortBy: 'username',
    sortableKeys: SORTABLE_KEYS,
  });
  const roleFilter = getParam('role');
  const { data: session } = useSession();
  const list = useUserList({
    page,
    search: search === '' ? undefined : search,
    role: roleFilter === '' ? undefined : (roleFilter as Role),
    sortBy,
    sortOrder,
  });
  const lockUser = useLockUser();
  const deleteUser = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [deleting, setDeleting] = useState<UserDto | null>(null);

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  useClampPage(page, meta, list.isPending, setParams);
  const currentUserId = session?.id;

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(user: UserDto): void {
    setEditing(user);
    setFormOpen(true);
  }

  async function toggleLock(user: UserDto): Promise<void> {
    try {
      await lockUser.mutateAsync({ id: user.id, locked: !user.isLocked });
      toast.success(messages.lockOk);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function confirmDelete(): Promise<void> {
    if (deleting === null) {
      return;
    }
    try {
      await deleteUser.mutateAsync(deleting.id);
      toast.success(messages.deleteOk);
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setDeleting(null);
    }
  }

  const columns: DataTableColumn<UserDto>[] = [
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
      className: 'w-32',
      render: (user) => {
        const isSelf = user.id === currentUserId;
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => openEdit(user)}
              aria-label={`Edit user ${user.username}`}
              className={ACTION_BUTTON_CLASS}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void toggleLock(user)}
              disabled={isSelf || lockUser.isPending}
              title={
                isSelf
                  ? 'Tidak dapat mengunci akun sendiri'
                  : user.isLocked
                    ? 'Buka kunci'
                    : 'Kunci akun'
              }
              aria-label={
                user.isLocked
                  ? `Buka kunci user ${user.username}`
                  : `Kunci user ${user.username}`
              }
              className={cn(
                ACTION_BUTTON_CLASS,
                user.isLocked ? 'text-amber-600 hover:bg-amber-50' : 'text-[#337DA0] hover:bg-[#F4F6FA]',
              )}
            >
              {user.isLocked ? (
                <Lock className="h-4 w-4" aria-hidden />
              ) : (
                <LockOpen className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeleting(user)}
              disabled={isSelf}
              title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus user'}
              aria-label={`Hapus user ${user.username}`}
              className={cn(ACTION_BUTTON_CLASS, 'text-red-600 hover:bg-red-50')}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      },
    },
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      sortKey: 'username',
      render: (user) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{user.username}</span>
          {user.isLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <Lock className="h-3 w-3" aria-hidden />
              Terkunci
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nama',
      sortable: true,
      sortKey: 'name',
      render: (user) => user.name,
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => <span className="text-[#6B7280]">{user.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      align: 'center',
      render: (user) => (
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
            user.role === 'ADMIN'
              ? 'bg-[#337DA0]/10 text-[#337DA0]'
              : 'bg-[#E4E8EF] text-[#6B7280]',
          )}
        >
          {roleLabel(user.role)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb="Pengaturan"
        title="Manajemen User"
        description="Kelola akun Administrator dan Operator."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah User
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onSearch={(value) => setParams({ search: value, page: null })}
          placeholder="Cari username / nama…"
        />
        <Select
          aria-label="Filter role"
          value={roleFilter}
          onChange={(event) =>
            setParams({ role: event.target.value === '' ? null : event.target.value, page: null })
          }
          placeholder="Semua role"
          className="h-9 w-full sm:w-44"
          options={[
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'OPERATOR', label: 'Operator' },
          ]}
        />
      </div>

      {list.isError ? (
        <ErrorState message={apiErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Daftar user"
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

      <UserFormModal open={formOpen} user={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title={messages.deleteConfirmTitle}
        message={`User "${deleting?.username ?? ''}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        isDanger
        isLoading={deleteUser.isPending}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
