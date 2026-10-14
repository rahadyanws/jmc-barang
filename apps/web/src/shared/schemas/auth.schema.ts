import { z } from 'zod';

import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
} from '../constants';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Username wajib diisi')
    .max(MAX_USERNAME_LENGTH, `Username maksimal ${MAX_USERNAME_LENGTH} karakter`)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, 'Password wajib diisi')
    .max(MAX_PASSWORD_LENGTH, `Password maksimal ${MAX_PASSWORD_LENGTH} karakter`),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password minimal ${MIN_PASSWORD_LENGTH} karakter`)
  .max(MAX_PASSWORD_LENGTH, `Password maksimal ${MAX_PASSWORD_LENGTH} karakter`)
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[0-9]/, 'Password harus mengandung angka');

export const usernameSchema = z
  .string()
  .trim()
  .min(MIN_USERNAME_LENGTH, `Username minimal ${MIN_USERNAME_LENGTH} karakter`)
  .max(MAX_USERNAME_LENGTH, `Username maksimal ${MAX_USERNAME_LENGTH} karakter`)
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'Username hanya boleh huruf, angka, titik, underscore, atau strip',
  )
  .transform((value) => value.toLowerCase());
