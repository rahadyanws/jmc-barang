import type {
  ApiSuccess,
  CategoryDto,
  CategoryOptionDto,
  CreateCategoryInput,
  PaginationMeta,
  UpdateCategoryInput,
} from '@/shared';

import { apiFetch } from '@/lib/api-client';

export interface CategoryListResult {
  data: CategoryDto[];
  meta: PaginationMeta;
}

type CategoryListParams = {
  page?: number;
  pageSize?: number;
  search?: string | undefined;
  sortBy?: string;
  sortOrder?: string;
};

export async function listCategories(params: CategoryListParams): Promise<CategoryListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 10));
  if (params.search != null && params.search !== '') {
    query.set('search', params.search);
  }
  if (params.sortBy != null) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortOrder != null) {
    query.set('sortOrder', params.sortOrder);
  }

  const response = await apiFetch<ApiSuccess<CategoryDto[]>>(`/categories?${query.toString()}`);
  return {
    data: response.data,
    meta: response.meta ?? { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
  };
}

export async function listCategoryOptions(): Promise<CategoryOptionDto[]> {
  const response = await apiFetch<ApiSuccess<CategoryOptionDto[]>>('/categories/options');
  return response.data;
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryDto> {
  const response = await apiFetch<ApiSuccess<CategoryDto>>('/categories', {
    method: 'POST',
    body: input,
  });
  return response.data;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDto> {
  const response = await apiFetch<ApiSuccess<CategoryDto>>(`/categories/${id}`, {
    method: 'PUT',
    body: input,
  });
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}
