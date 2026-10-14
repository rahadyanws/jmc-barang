import { z } from 'zod';

import {
  MAX_ITEM_NAME_LENGTH,
  MAX_LETTER_NUMBER_LENGTH,
  MAX_MONEY,
  MAX_ORIGIN_LENGTH,
  MAX_UNIT_LENGTH,
  MAX_ITEMS,
  MIN_ITEMS,
  MIN_MONEY,
} from '../constants';
import { uuidSchema } from './id.schema';
import { paginationQuerySchema, sortOrderSchema } from './pagination.schema';

const MAX_QUANTITY = 2_147_483_647; // batas Prisma Int / kolom integer Postgres

export const incomingGoodsOriginSchema = z
  .string()
  .trim()
  .min(1, 'Asal barang wajib diisi')
  .max(MAX_ORIGIN_LENGTH, `Asal barang maksimal ${MAX_ORIGIN_LENGTH} karakter`);

export const incomingGoodsLetterNumberSchema = z
  .string()
  .trim()
  .max(MAX_LETTER_NUMBER_LENGTH, `Nomor surat maksimal ${MAX_LETTER_NUMBER_LENGTH} karakter`);

export const incomingGoodsItemNameSchema = z
  .string()
  .trim()
  .min(1, 'Nama barang wajib diisi')
  .max(MAX_ITEM_NAME_LENGTH, `Nama barang maksimal ${MAX_ITEM_NAME_LENGTH} karakter`);

export const unitPriceSchema = z
  .number({ invalid_type_error: 'Harga satuan wajib diisi' })
  .int('Harga satuan harus bilangan bulat')
  .min(MIN_MONEY, 'Harga satuan minimal Rp 1')
  .max(MAX_MONEY, 'Harga satuan terlalu besar');

export const quantitySchema = z
  .number({ invalid_type_error: 'Jumlah wajib diisi' })
  .int('Jumlah harus bilangan bulat')
  .min(MIN_ITEMS, 'Jumlah minimal 1')
  .max(MAX_QUANTITY, 'Jumlah terlalu besar');

export const uomSchema = z
  .string()
  .trim()
  .min(1, 'Satuan wajib diisi')
  .max(MAX_UNIT_LENGTH, `Satuan maksimal ${MAX_UNIT_LENGTH} karakter`);

export const expiredDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal expired harus format YYYY-MM-DD');

const itemFields = {
  name: incomingGoodsItemNameSchema,
  unitPrice: unitPriceSchema,
  quantity: quantitySchema,
  uom: uomSchema,
  expiredDate: expiredDateSchema.nullable().optional(),
};

type ItemFields = z.infer<z.ZodObject<typeof itemFields>>;

function guardLineTotal(item: ItemFields, ctx: z.RefinementCtx): void {
  if (item.unitPrice * item.quantity > MAX_MONEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['unitPrice'],
      message: 'Total baris melebihi batas maksimal',
    });
  }
}

export const incomingGoodsItemInputSchema = z.object(itemFields).superRefine(guardLineTotal);

export const incomingGoodsItemPayloadSchema = z
  .object({ ...itemFields, id: uuidSchema.optional() })
  .superRefine(guardLineTotal);

export const incomingGoodsItemsSchema = z
  .array(incomingGoodsItemInputSchema)
  .min(MIN_ITEMS, `Minimal ${MIN_ITEMS} item`)
  .max(MAX_ITEMS, `Maksimal ${MAX_ITEMS} item`);

export const incomingGoodsItemPayloadsSchema = z
  .array(incomingGoodsItemPayloadSchema)
  .min(MIN_ITEMS, `Minimal ${MIN_ITEMS} item`)
  .max(MAX_ITEMS, `Maksimal ${MAX_ITEMS} item`);

export const createIncomingGoodsSchema = z
  .object({
    operatorId: uuidSchema,
    subCategoryId: uuidSchema,
    origin: incomingGoodsOriginSchema,
    letterNumber: incomingGoodsLetterNumberSchema.nullable().optional(),
    items: incomingGoodsItemsSchema,
  })
  .strict();

export const updateIncomingGoodsSchema = createIncomingGoodsSchema.extend({
  items: incomingGoodsItemPayloadsSchema,
});

export const incomingGoodsListQuerySchema = paginationQuerySchema.extend({
  categoryId: uuidSchema.optional(),
  subCategoryId: uuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(3000).optional(),
  sortBy: z.enum(['transactionDate', 'origin', 'totalAmount']).default('transactionDate'),
  sortOrder: sortOrderSchema.default('desc'),
});

export const verificationSchema = z.object({
  verified: z.boolean(),
});

/** Query export Excel = list tanpa page/pageSize (BR-20: builder where/orderBy identik). */
export const incomingGoodsExportQuerySchema = incomingGoodsListQuerySchema.omit({
  page: true,
  pageSize: true,
});

export function calcLineTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

export function calcGrandTotal(items: ReadonlyArray<{ unitPrice: number; quantity: number }>): number {
  return items.reduce(
    (sum, item) => sum + calcLineTotal(item.unitPrice, item.quantity),
    0,
  );
}

export type IncomingGoodsItemInput = z.infer<typeof incomingGoodsItemInputSchema>;
export type IncomingGoodsItemPayload = z.infer<typeof incomingGoodsItemPayloadSchema>;
export type CreateIncomingGoodsInput = z.infer<typeof createIncomingGoodsSchema>;
export type UpdateIncomingGoodsInput = z.infer<typeof updateIncomingGoodsSchema>;
export type IncomingGoodsListQuery = z.infer<typeof incomingGoodsListQuerySchema>;
export type IncomingGoodsExportQuery = z.infer<typeof incomingGoodsExportQuerySchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;
