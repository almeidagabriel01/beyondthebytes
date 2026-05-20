import { z } from 'zod';

const serverSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
});

const result = serverSchema.safeParse({
  JWT_SECRET: process.env['JWT_SECRET'],
});

if (!result.success) {
  const errors = result.error.flatten().fieldErrors;
  throw new Error(
    `Invalid server environment variables:\n${Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n')}`,
  );
}

export const serverEnv = result.data;
