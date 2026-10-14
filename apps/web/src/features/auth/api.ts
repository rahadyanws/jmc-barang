import type { ApiSuccess, SessionUser } from '@/shared';

import { apiFetch } from '@/lib/api-client';

export interface LoginPayload {
  username: string;
  password: string;
}

export async function loginRequest(payload: LoginPayload): Promise<SessionUser> {
  const response = await apiFetch<ApiSuccess<{ user: SessionUser }>>('/auth/login', {
    method: 'POST',
    body: payload,
  });
  return response.data.user;
}

export async function logoutRequest(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' });
}

export async function getSessionRequest(): Promise<SessionUser> {
  const response = await apiFetch<ApiSuccess<{ user: SessionUser }>>('/auth/me');
  return response.data.user;
}
