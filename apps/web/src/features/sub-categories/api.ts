import type {
  ApiSuccess,
  CreateSubCategoryInput,
  PaginationMeta,
  SubCategoryDto,
  SubCategoryOptionDto,
  UpdateSubCategoryInput,
} from '@/shared';

import { apiFetch } from '@/lib/api-client';

export interface SubCategoryListResult {
  data: SubCategoryDto[];
  meta: PaginationMeta;
}

type SubCategoryListParams = {
  page?: number;
  pageSize?: number;
  search?: string | undefined;
  categoryId?: string | undefined;
  sortBy?: string;
  sortOrder?: string;
};

export async function listSubCategories(
  params: SubCategoryListParams,
): Promise<SubCategoryListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 10));
  if (params.search != null && params.search !== '') {
    query.set('search', params.search);
  }
  if (params.categoryId != null && params.categoryId !== '') {
    query.set('categoryId', params.categoryId);
  }
  if (params.sortBy != null) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortOrder != null) {
    query.set('sortOrder', params.sortOrder);
  }

  const response = await apiFetch<ApiSuccess<SubCategoryDto[]>>(
    `/sub-categories?${query.toString()}`,
  );
  return {
    data: response.data,
    meta: response.meta ?? { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
  };
}

export async function listSubCategoryOptions(
  categoryId?: string,
): Promise<SubCategoryOptionDto[]> {
  const query =
    categoryId != null && categoryId !== '' ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  const response = await apiFetch<ApiSuccess<SubCategoryOptionDto[]>>(
    `/sub-categories/options${query}`,
  );
  return response.data;
}

export async function createSubCategory(input: CreateSubCategoryInput): Promise<SubCategoryDto> {
  const response = await apiFetch<ApiSuccess<SubCategoryDto>>('/sub-categories', {
    method: 'POST',
    body: input,
  });
  return response.data;
}

export async function updateSubCategory(
  id: string,
  input: UpdateSubCategoryInput,
): Promise<SubCategoryDto> {
  const response = await apiFetch<ApiSuccess<SubCategoryDto>>(`/sub-categories/${id}`, {
    method: 'PUT',
    body: input,
  });
  return response.data;
}

export async function deleteSubCategory(id: string): Promise<void> {
  await apiFetch<void>(`/sub-categories/${id}`, { method: 'DELETE' });
}
