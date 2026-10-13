import type {
  ApiSuccess,
  CreateIncomingGoodsInput,
  IncomingGoodsDetailDto,
  PaginationMeta,
  UpdateIncomingGoodsInput,
} from '@jmc/shared';

import { API_BASE_PATH } from '@/lib/constants';
import { apiFetch } from '@/lib/api-client';

export type IncomingGoodsListParams = {
  page: number;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  year?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export interface VerificationResultDto {
  id: string;
  isVerified: boolean;
  verifiedAt: string | null;
}

export interface AttachmentDto {
  url: string;
  fileName: string;
  expiresInSeconds: number;
}

export interface AttachmentUploadResult {
  fileName: string;
  size: number;
}

export async function listIncomingGoods(
  params: IncomingGoodsListParams,
): Promise<{ data: IncomingGoodsDetailDto[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  query.set('page', String(params.page));
  query.set('sortBy', params.sortBy);
  query.set('sortOrder', params.sortOrder);
  if (params.search != null && params.search !== '') {
    query.set('search', params.search);
  }
  if (params.categoryId != null && params.categoryId !== '') {
    query.set('categoryId', params.categoryId);
  }
  if (params.subCategoryId != null && params.subCategoryId !== '') {
    query.set('subCategoryId', params.subCategoryId);
  }
  if (params.year != null) {
    query.set('year', String(params.year));
  }

  const response = await apiFetch<ApiSuccess<IncomingGoodsDetailDto[]>>(
    `/incoming-goods?${query.toString()}`,
  );
  return {
    data: response.data,
    meta: response.meta ?? {
      page: params.page,
      pageSize: 10,
      totalItems: response.data.length,
      totalPages: 1,
    },
  };
}

export async function listIncomingGoodsYears(): Promise<number[]> {
  const response = await apiFetch<ApiSuccess<number[]>>('/incoming-goods/years');
  return response.data;
}

export async function setIncomingGoodsVerification(
  id: string,
  verified: boolean,
): Promise<VerificationResultDto> {
  const response = await apiFetch<ApiSuccess<VerificationResultDto>>(
    `/incoming-goods/${encodeURIComponent(id)}/verification`,
    { method: 'PATCH', body: { verified } },
  );
  return response.data;
}

export async function createIncomingGoods(
  input: CreateIncomingGoodsInput,
): Promise<IncomingGoodsDetailDto> {
  const response = await apiFetch<ApiSuccess<IncomingGoodsDetailDto>>('/incoming-goods', {
    method: 'POST',
    body: input,
  });
  return response.data;
}

export async function getIncomingGoods(id: string): Promise<IncomingGoodsDetailDto> {
  const response = await apiFetch<ApiSuccess<IncomingGoodsDetailDto>>(
    `/incoming-goods/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function updateIncomingGoods(
  id: string,
  input: UpdateIncomingGoodsInput,
): Promise<IncomingGoodsDetailDto> {
  const response = await apiFetch<ApiSuccess<IncomingGoodsDetailDto>>(
    `/incoming-goods/${encodeURIComponent(id)}`,
    { method: 'PUT', body: input },
  );
  return response.data;
}

export async function deleteIncomingGoods(id: string): Promise<void> {
  await apiFetch<void>(`/incoming-goods/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

function appendListFilters(
  query: URLSearchParams,
  params: Omit<IncomingGoodsListParams, 'page'>,
): void {
  query.set('sortBy', params.sortBy);
  query.set('sortOrder', params.sortOrder);
  if (params.search != null && params.search !== '') {
    query.set('search', params.search);
  }
  if (params.categoryId != null && params.categoryId !== '') {
    query.set('categoryId', params.categoryId);
  }
  if (params.subCategoryId != null && params.subCategoryId !== '') {
    query.set('subCategoryId', params.subCategoryId);
  }
  if (params.year != null) {
    query.set('year', String(params.year));
  }
}

/** BR-20: export mengikuti filter/search/sort aktif (path untuk unduh browser). */
export function incomingGoodsExportPath(
  params: Omit<IncomingGoodsListParams, 'page'>,
): string {
  const query = new URLSearchParams();
  appendListFilters(query, params);
  return `${API_BASE_PATH}/incoming-goods/export?${query.toString()}`;
}

export function incomingGoodsPrintPath(id: string): string {
  return `${API_BASE_PATH}/incoming-goods/${encodeURIComponent(id)}/print`;
}

export async function uploadIncomingGoodsAttachment(
  id: string,
  file: File,
): Promise<AttachmentUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiFetch<ApiSuccess<AttachmentUploadResult>>(
    `/incoming-goods/${encodeURIComponent(id)}/attachment`,
    { method: 'POST', body: formData },
  );
  return response.data;
}

export async function getIncomingGoodsAttachment(id: string): Promise<AttachmentDto> {
  const response = await apiFetch<ApiSuccess<AttachmentDto>>(
    `/incoming-goods/${encodeURIComponent(id)}/attachment`,
  );
  return response.data;
}

export async function deleteIncomingGoodsAttachment(id: string): Promise<void> {
  await apiFetch<void>(`/incoming-goods/${encodeURIComponent(id)}/attachment`, {
    method: 'DELETE',
  });
}

/** URL absolut untuk window.open (driver local relatif base API, supabase absolut). */
export function resolveAttachmentUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE_PATH}${url}`;
}
