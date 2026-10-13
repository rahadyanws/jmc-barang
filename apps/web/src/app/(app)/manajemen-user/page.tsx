import type { Metadata } from 'next';
import { Suspense } from 'react';

import { RoleGuard } from '@/components/shared/role-guard';
import { UsersTable } from '@/features/users/components/users-table';

export const metadata: Metadata = {
  title: 'Manajemen User — Aplikasi Pengelolaan Barang',
};

export default function ManajemenUserPage() {
  return (
    <RoleGuard role="ADMIN">
      <Suspense fallback={null}>
        <UsersTable />
      </Suspense>
    </RoleGuard>
  );
}
