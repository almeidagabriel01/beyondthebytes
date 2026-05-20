# MedSchedule

Medical scheduling SaaS for small clinics. Senior engineer evaluation project.

## Stack

| Layer | Technology |
|---|---|
| API | NestJS 10 + Prisma 6 + PostgreSQL 16 |
| Web | Next.js 15 App Router + React 19 + Tailwind v4 |
| Monorepo | Turborepo 2 + pnpm 9 |
| Auth | NestJS Passport-JWT + bcrypt (Phase 2) |
| Infra | Vercel (web) + Railway (api) + Neon (db) |

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm@9`)
- Docker Desktop

## Running Locally

```bash
git clone <repo-url> && cd medschedule
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @medschedule/api db:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs
- Adminer: http://localhost:8080

## Commands

```bash
pnpm dev          # start all apps
pnpm build        # build all
pnpm lint         # lint all
pnpm typecheck    # TS check
pnpm test         # unit tests
pnpm test:e2e     # e2e (requires DB)
pnpm format       # prettier
```

## Phases

| Phase | Status | Feature |
|---|---|---|
| 0 | ✅ | Foundation & Infrastructure |
| 1 | ⏳ | Design System (Stitch-driven) |
| 2 | ⏳ | Authentication & Sessions |
| 3 | ⏳ | Patient Management |
| 4 | ⏳ | Appointments: Calendar & Daily Agenda |
| 5 | ⏳ | Appointment Detail & Status FSM |
| 6 | ⏳ | Dashboard & Clinical Notes |
| 7 | ⏳ | Hardening & Production |
