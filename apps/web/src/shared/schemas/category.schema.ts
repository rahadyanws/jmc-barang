import { z } from 'zod';

import { MAX_CATEGORY_CODE_LENGTH, MAX_CATEGORY_NAME_LENGTH } from '../constants';
import { paginationQuerySchema } from './pagination.schema';

export const categoryCodeSchema = z
  .string()
  .trim()
  .min(1, 'Kode kategori wajib diisi')
  .max(MAX_CATEGORY_CODE_LENGTH, `Kode kategori maksimal ${MAX_CATEGORY_CODE_LENGTH} karakter`)
  .regex(/^[A-Za-z0-9_-]+$/, 'Kode kategori hanya boleh huruf, angka, strip, atau underscore')
  .transform((value) => value.toUpperCase());

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Nama kategori wajib diisi')
  .max(MAX_CATEGORY_NAME_LENGTH, `Nama kategori maksimal ${MAX_CATEGORY_NAME_LENGTH} karakter`);

export const categoryBaseSchema = z.object({
  code: categoryCodeSchema,
  name: categoryNameSchema,
});

export const createCategorySchema = categoryBaseSchema;
export const updateCategorySchema = categoryBaseSchema;

export const categoryListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(['code', 'name']).default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
