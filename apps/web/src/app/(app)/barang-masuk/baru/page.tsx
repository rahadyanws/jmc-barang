import type { Metadata } from 'next';

import { IncomingGoodsForm } from '@/features/incoming-goods/components/incoming-goods-form';

export const metadata: Metadata = {
  title: 'Tambah Barang Masuk — Aplikasi Pengelolaan Barang',
};

export default function NewIncomingGoodsPage() {
  return <IncomingGoodsForm mode="create" />;
}
