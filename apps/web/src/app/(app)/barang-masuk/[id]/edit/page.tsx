import type { Metadata } from 'next';

import { IncomingGoodsForm } from '@/features/incoming-goods/components/incoming-goods-form';

export const metadata: Metadata = {
  title: 'Edit Barang Masuk — Aplikasi Pengelolaan Barang',
};

export default async function EditIncomingGoodsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IncomingGoodsForm mode="edit" transactionId={id} />;
}
