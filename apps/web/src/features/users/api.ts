import type {
  ApiSuccess,
  CreateUserInput,
  LockUserInput,
  PaginationMeta,
  Role,
  UpdateUserInput,
  UserOptionDto,
  UserDto,
} from '@jmc/shared';

import { apiFetch } from '@/lib/api-client';

export interface UserListResult {
  data: UserDto[];
  meta: PaginationMeta;
}

type UserListParams = {
  page?: number;
  pageSize?: number;
  search?: string | undefined;
  role?: Role | undefined;
  sortBy?: string;
  sortOrder?: string;
};

export async function listUsers(params: UserListParams): Promise<UserListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 10));
  if (params.search != null && params.search !== '') {
    query.set('search', params.search);
  }
  if (params.role != null) {
    query.set('role', params.role);
  }
  if (params.sortBy != null) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortOrder != null) {
    query.set('sortOrder', params.sortOrder);
  }

  const response = await apiFetch<ApiSuccess<UserDto[]>>(`/users?${query.toString()}`);
  return {
    data: response.data,
    meta: response.meta ?? { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
  };
}

export async function listUserOptions(role?: string): Promise<UserOptionDto[]> {
  const query = role != null && role !== '' ? `?role=${encodeURIComponent(role)}` : '';
  const response = await apiFetch<ApiSuccess<UserOptionDto[]>>(`/users/options${query}`);
  return response.data;
}

export async function createUser(input: CreateUserInput): Promise<UserDto> {
  const response = await apiFetch<ApiSuccess<UserDto>>('/users', {
    method: 'POST',
    body: input,
  });
  return response.data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserDto> {
  const response = await apiFetch<ApiSuccess<UserDto>>(`/users/${id}`, {
    method: 'PUT',
    body: input,
  });
  return response.data;
}

export async function lockUser(id: string, input: LockUserInput): Promise<UserDto> {
  const response = await apiFetch<ApiSuccess<UserDto>>(`/users/${id}/lock`, {
    method: 'PATCH',
    body: input,
  });
  return response.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}
