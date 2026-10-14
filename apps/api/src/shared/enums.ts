import { z } from 'zod';

export const ROLES = ['ADMIN', 'OPERATOR'] as const;

export const Role = z.enum(ROLES);
export type Role = z.infer<typeof Role>;
