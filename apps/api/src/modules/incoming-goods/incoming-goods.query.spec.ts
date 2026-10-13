import {
  buildIncomingGoodsOrderBy,
  buildIncomingGoodsWhere,
  wibYear,
  wibYearRange,
} from './incoming-goods.query';

const CATEGORY_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const SUB_CATEGORY_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

describe('incoming-goods.query builder', () => {
  describe('wibYearRange', () => {
    it('bounds the year in Asia/Jakarta (UTC+7)', () => {
      const range = wibYearRange(2026);

      expect(range.gte.toISOString()).toBe('2025-12-31T17:00:00.000Z');
      expect(range.lt.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });
  });

  describe('wibYear', () => {
    it('maps late-December UTC timestamps into the WIB year', () => {
      expect(wibYear(new Date('2025-12-31T17:30:00.000Z'))).toBe(2026);
      expect(wibYear(new Date('2025-12-31T16:30:00.000Z'))).toBe(2025);
    });
  });

  describe('buildIncomingGoodsWhere', () => {
    it('keeps the role scope and adds no filter when query is empty', () => {
      const where = buildIncomingGoodsWhere({}, { operatorId: 'operator-id' });

      expect(where).toEqual({ AND: [{ operatorId: 'operator-id' }] });
    });

    it('locks category and sub category together (mismatched pair → empty)', () => {
      const where = buildIncomingGoodsWhere(
        { categoryId: CATEGORY_ID, subCategoryId: SUB_CATEGORY_ID },
        {},
      );

      expect(where).toEqual({
        AND: [
          {},
          { subCategory: { categoryId: CATEGORY_ID } },
          { subCategoryId: SUB_CATEGORY_ID },
        ],
      });
    });

    it('filters by WIB year range', () => {
      const where = buildIncomingGoodsWhere({ year: 2026 }, {});

      expect(where).toEqual({
        AND: [
          {},
          { transactionDate: wibYearRange(2026) },
        ],
      });
    });

    it('searches origin OR sub category name case-insensitively', () => {
      const where = buildIncomingGoodsWhere({ search: 'tulis' }, {});

      expect(where).toEqual({
        AND: [
          {},
          {
            OR: [
              { origin: { contains: 'tulis', mode: 'insensitive' } },
              { subCategory: { name: { contains: 'tulis', mode: 'insensitive' } } },
            ],
          },
        ],
      });
    });

    it('combines filters additively', () => {
      const where = buildIncomingGoodsWhere(
        { categoryId: CATEGORY_ID, year: 2026, search: 'sido' },
        { operatorId: 'operator-id' },
      );

      expect(where.AND).toHaveLength(4);
    });
  });

  describe('buildIncomingGoodsOrderBy', () => {
    it('sorts by the requested column with id tie-breaker', () => {
      expect(buildIncomingGoodsOrderBy('totalAmount', 'desc')).toEqual([
        { totalAmount: 'desc' },
        { id: 'asc' },
      ]);
      expect(buildIncomingGoodsOrderBy('origin', 'asc')).toEqual([
        { origin: 'asc' },
        { id: 'asc' },
      ]);
    });
  });
});
