import type { CookieOptions } from 'express';

import { env } from '../../config/env';

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
};

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const DEFAULT_MAX_AGE_MS = 8 * 3_600_000;

export function parseExpiresInMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (match === null) {
    return DEFAULT_MAX_AGE_MS;
  }
  const amount = Number.parseInt(match[1], 10);
  const unitMs = UNIT_MS[match[2]];
  return amount * unitMs;
}
