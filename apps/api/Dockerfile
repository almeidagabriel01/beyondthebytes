# syntax=docker/dockerfile:1.6

# ─── Stage 1: install all deps with pnpm fetch ────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo

# Copy workspace manifest + package files (lockfile aware)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

RUN pnpm install --frozen-lockfile

# ─── Stage 2: build the API ──────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

# Prisma client generation needs the schema file at this point
RUN pnpm --filter @medschedule/api exec prisma generate

RUN pnpm --filter @medschedule/api build

# ─── Stage 3: runtime image ──────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate

ENV NODE_ENV=production
WORKDIR /app

# Copy built API + workspace deps it needs at runtime
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./node_modules/@medschedule/shared
COPY --from=build /repo/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

# Apply migrations on every boot (idempotent) then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
