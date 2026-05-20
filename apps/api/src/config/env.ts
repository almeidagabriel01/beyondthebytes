import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _validated: Env | undefined;

export function validateEnv(): Env {
  if (_validated) return _validated;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error('❌  Invalid environment variables:');
    for (const [key, messages] of Object.entries(errors)) {
      console.error(`   ${key}: ${messages?.join(', ')}`);
    }
    process.exit(1);
  }

  _validated = result.data;
  return _validated;
}

export function env(): Env {
  if (!_validated) return validateEnv();
  return _validated;
}
