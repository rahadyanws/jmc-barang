import type { Metadata } from 'next';
import { Suspense } from 'react';

import { RoleGuard } from '@/components/shared/role-guard';
import { CategoriesTable } from '@/features/categories/components/categories-table';

export const metadata: Metadata = {
  title: 'Kategori — Aplikasi Pengelolaan Barang',
};

export default function CategoryPage() {
  return (
    <RoleGuard role="ADMIN">
      <Suspense fallback={null}>
        <CategoriesTable />
      </Suspense>
    </RoleGuard>
  );
}
