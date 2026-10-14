import { z } from 'zod';

import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MIN_EMAIL_LENGTH,
  MIN_NAME_LENGTH,
} from '../constants';
import { Role } from '../enums';
import { passwordSchema, usernameSchema } from './auth.schema';
import { paginationQuerySchema } from './pagination.schema';

export const userNameSchema = z
  .string()
  .trim()
  .min(MIN_NAME_LENGTH, `Nama minimal ${MIN_NAME_LENGTH} karakter`)
  .max(MAX_NAME_LENGTH, `Nama maksimal ${MAX_NAME_LENGTH} karakter`);

export const userEmailSchema = z
  .string()
  .trim()
  .min(MIN_EMAIL_LENGTH, `Email minimal ${MIN_EMAIL_LENGTH} karakter`)
  .max(MAX_EMAIL_LENGTH, `Email maksimal ${MAX_EMAIL_LENGTH} karakter`)
  .email('Format email tidak valid')
  .transform((value) => value.toLowerCase());

export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  name: userNameSchema,
  email: userEmailSchema,
  role: Role,
});

export const updateUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema.optional(),
  name: userNameSchema,
  email: userEmailSchema,
  role: Role,
});

export const userListQuerySchema = paginationQuerySchema.extend({
  role: Role.optional(),
  sortBy: z.enum(['username', 'name']).default('username'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const userOptionsQuerySchema = z.object({
  role: Role.optional(),
});

export const lockUserSchema = z.object({
  locked: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UserOptionsQuery = z.infer<typeof userOptionsQuerySchema>;
export type LockUserInput = z.infer<typeof lockUserSchema>;
