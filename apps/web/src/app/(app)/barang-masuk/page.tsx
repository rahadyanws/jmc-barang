import type { Metadata } from 'next';
import { Suspense } from 'react';

import { IncomingGoodsTable } from '@/features/incoming-goods/components/incoming-goods-table';

export const metadata: Metadata = {
  title: 'Barang Masuk — Aplikasi Pengelolaan Barang',
};

export default function IncomingGoodsPage() {
  return (
    <Suspense fallback={null}>
      <IncomingGoodsTable />
    </Suspense>
  );
}
