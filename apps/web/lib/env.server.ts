import { z } from 'zod';

/**
 * Server-side env schema.
 *
 * IMPORTANT: validated LAZILY inside `serverEnv()` rather than at module
 * top-level. Reasons:
 *
 *  1. Next.js evaluates middleware imports during `next build`. If we
 *     validate eagerly, builds in CI / Docker without runtime secrets would
 *     fail. Lazy validation defers the check to actual request time.
 *  2. Middleware runs in the Edge runtime, which does not support
 *     `server-only` (it works by throwing on client bundling — Edge bundling
 *     produces false positives in some setups). Keeping this file
 *     framework-neutral and importing it only from middleware preserves
 *     server-boundary intent without the runtime risk.
 *
 * Result on misconfigured deploys: the FIRST authenticated request fails
 * fast with a clear error, instead of silently never verifying tokens.
 */
const serverSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(
      32,
      'JWT_SECRET must be at least 32 characters — middleware needs this to verify access cookies',
    ),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let _validated: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (_validated) return _validated;

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

  _validated = result.data;
  return _validated;
}
