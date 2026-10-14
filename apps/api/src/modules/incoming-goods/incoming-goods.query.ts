import type { Prisma } from '@prisma/client';

import type { IncomingGoodsListQuery } from '../../shared';

/** Batas tahun dihitung di WIB (UTC+7): [YYYY-01-01T00:00+07:00, YYYY+1-01-01T00:00+07:00). */
const WIB_UTC_OFFSET = '+07:00';

export function wibYear(date: Date): number {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).getUTCFullYear();
}

export function wibYearRange(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(`${year}-01-01T00:00:00${WIB_UTC_OFFSET}`),
    lt: new Date(`${year + 1}-01-01T00:00:00${WIB_UTC_OFFSET}`),
  };
}

type ListFilters = Pick<
  IncomingGoodsListQuery,
  'categoryId' | 'subCategoryId' | 'year' | 'search'
>;

/**
 * Builder `where` tunggal untuk list & export (BR-20).
 * `categoryId` + `subCategoryId` saling mengunci: sub dari kategori lain → hasil kosong.
 */
export function buildIncomingGoodsWhere(
  query: ListFilters,
  scope: Prisma.IncomingGoodsWhereInput,
): Prisma.IncomingGoodsWhereInput {
  const filters: Prisma.IncomingGoodsWhereInput[] = [scope];

  if (query.categoryId !== undefined) {
    filters.push({ subCategory: { categoryId: query.categoryId } });
  }
  if (query.subCategoryId !== undefined) {
    filters.push({ subCategoryId: query.subCategoryId });
  }
  if (query.year !== undefined) {
    filters.push({ transactionDate: wibYearRange(query.year) });
  }

  const search = query.search?.trim();
  if (search !== undefined && search.length > 0) {
    filters.push({
      OR: [
        { origin: { contains: search, mode: 'insensitive' } },
        { subCategory: { name: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  return { AND: filters };
}

/** Sort stabil: kolom whitelist + tie-breaker `id`. */
export function buildIncomingGoodsOrderBy(
  sortBy: IncomingGoodsListQuery['sortBy'],
  sortOrder: IncomingGoodsListQuery['sortOrder'],
): Prisma.IncomingGoodsOrderByWithRelationInput[] {
  return [{ [sortBy]: sortOrder }, { id: 'asc' }];
}
