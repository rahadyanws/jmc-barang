import type { Metadata } from 'next';
import { Suspense } from 'react';

import { RoleGuard } from '@/components/shared/role-guard';
import { SubCategoriesTable } from '@/features/sub-categories/components/sub-categories-table';

export const metadata: Metadata = {
  title: 'Sub Kategori — Aplikasi Pengelolaan Barang',
};

export default function SubCategoryPage() {
  return (
    <RoleGuard role="ADMIN">
      <Suspense fallback={null}>
        <SubCategoriesTable />
      </Suspense>
    </RoleGuard>
  );
}
