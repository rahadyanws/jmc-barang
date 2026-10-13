import { API_BASE_PATH } from './constants';
import { messages } from './messages';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

interface ApiResponseEnvelope {
  data?: unknown;
  error?: { code?: string; message?: string; details?: unknown };
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, timeoutMs = 60_000, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const isFormData = body instanceof FormData;

  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, {
      ...rest,
      credentials: 'same-origin',
      headers: {
        ...(body !== undefined && !isFormData
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...headers,
      },
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const envelope = (await response.json().catch(() => null)) as ApiResponseEnvelope | null;

    if (!response.ok) {
      throw new ApiError(
        response.status,
        envelope?.error?.code ?? 'INTERNAL_ERROR',
        envelope?.error?.message ?? messages.unexpected,
        envelope?.error?.details,
      );
    }

    return envelope as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', messages.serverSlow);
    }
    throw new ApiError(0, 'NETWORK_ERROR', messages.unexpected);
  } finally {
    clearTimeout(timer);
  }
}
