import type { Prisma } from '@prisma/client';

import type { SessionUser } from '@jmc/shared';

/**
 * BR-18: Operator hanya mengakses transaksi miliknya; Admin tanpa batas.
 * Dipakai di semua query Barang Masuk (detail, update, delete, dll).
 */
export function scopeByUser(user: SessionUser): Prisma.IncomingGoodsWhereInput {
  return user.role === 'OPERATOR' ? { operatorId: user.id } : {};
}
