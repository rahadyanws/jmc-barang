import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from './api-client';
import { messages } from './messages';

export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || error.details == null || Array.isArray(error.details)) {
    return false;
  }

  let applied = false;
  for (const [field, value] of Object.entries(error.details as Record<string, unknown>)) {
    if (typeof value === 'string') {
      setError(field as Path<T>, { type: 'server', message: value });
      applied = true;
    }
  }
  return applied;
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return messages.unexpected;
}
