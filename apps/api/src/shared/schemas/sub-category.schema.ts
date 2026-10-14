import { z } from 'zod';

import { MAX_MONEY, MAX_SUB_CATEGORY_NAME_LENGTH, MIN_MONEY } from '../constants';
import { uuidSchema } from './id.schema';
import { paginationQuerySchema } from './pagination.schema';

export const subCategoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Nama sub kategori wajib diisi')
  .max(
    MAX_SUB_CATEGORY_NAME_LENGTH,
    `Nama sub kategori maksimal ${MAX_SUB_CATEGORY_NAME_LENGTH} karakter`,
  );

export const priceLimitSchema = z
  .number({ invalid_type_error: 'Batas harga harus berupa angka' })
  .int('Batas harga harus bilangan bulat')
  .min(MIN_MONEY, 'Batas harga minimal Rp 1')
  .max(MAX_MONEY, 'Batas harga terlalu besar');

export const subCategoryBaseSchema = z.object({
  categoryId: uuidSchema,
  name: subCategoryNameSchema,
  priceLimit: priceLimitSchema,
});

export const createSubCategorySchema = subCategoryBaseSchema;
export const updateSubCategorySchema = subCategoryBaseSchema;

export const subCategoryListQuerySchema = paginationQuerySchema.extend({
  categoryId: uuidSchema.optional(),
  sortBy: z.enum(['name', 'priceLimit']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const subCategoryOptionsQuerySchema = z.object({
  categoryId: uuidSchema.optional(),
});

export type CreateSubCategoryInput = z.infer<typeof createSubCategorySchema>;
export type UpdateSubCategoryInput = z.infer<typeof updateSubCategorySchema>;
export type SubCategoryListQuery = z.infer<typeof subCategoryListQuerySchema>;
export type SubCategoryOptionsQuery = z.infer<typeof subCategoryOptionsQuerySchema>;
