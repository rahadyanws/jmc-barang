import { z } from 'zod';

export const uuidSchema = z.string().uuid('ID tidak valid');

export const idParamSchema = z.object({
  id: uuidSchema,
});

export type IdParam = z.infer<typeof idParamSchema>;
