import { z } from 'zod';

import { MAX_PAGE_SIZE, PAGE_SIZE } from '../constants';

export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(PAGE_SIZE),
  search: z.string().trim().optional(),
  sortBy: z.string().min(1).optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
