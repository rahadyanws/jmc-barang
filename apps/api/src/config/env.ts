import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

const envFilePath = [resolve(process.cwd(), '.env'), resolve(__dirname, '../../.env')].find((filePath) =>
  existsSync(filePath),
);

if (envFilePath !== undefined) {
  process.loadEnvFile(envFilePath);
}

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().min(1).default('8h'),
    COOKIE_NAME: z.string().min(1).default('jmc_session'),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0),
      )
      .refine((origins) => origins.length > 0, 'CORS_ORIGINS must contain at least one origin'),
    STORAGE_DRIVER: z.enum(['supabase', 'local']),
    SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SUPABASE_BUCKET: z.string().min(1).default('attachments'),
    MAX_ATTACHMENT_MB: z.coerce.number().int().positive().default(4),
    SEED_ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SEED_OPERATOR_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER !== 'supabase') {
      return;
    }
    if (value.SUPABASE_URL === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message: 'SUPABASE_URL is required when STORAGE_DRIVER=supabase',
      });
    }
    if (value.SUPABASE_SERVICE_ROLE_KEY === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message: 'SUPABASE_SERVICE_ROLE_KEY is required when STORAGE_DRIVER=supabase',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment variables:\n${issues}`);
  process.exit(1);
}

export const env: Env = parsedEnv.data;
