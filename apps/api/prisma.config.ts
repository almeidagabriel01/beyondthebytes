import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * Replaces the deprecated `package.json#prisma` block (which fired a
 * deprecation warning on every Prisma command). The `migrations.seed`
 * field replaces `package.json#prisma.seed`. We keep `ts-node` (already a
 * devDependency) instead of adding `tsx` just for the seed runner.
 *
 * Important: when a `prisma.config.ts` is present, Prisma's CLI no longer
 * auto-loads `.env`. We import `dotenv/config` here so `DATABASE_URL`
 * (referenced by `env("DATABASE_URL")` in schema.prisma) is populated for
 * every CLI invocation.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'ts-node prisma/seed.ts',
  },
});
