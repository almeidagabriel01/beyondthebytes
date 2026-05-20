import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .default('http://localhost:3001'),
});

const result = clientSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
});

if (!result.success) {
  const errors = result.error.flatten().fieldErrors;
  throw new Error(
    `Invalid environment variables:\n${Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n')}`,
  );
}

export const clientEnv = result.data;
