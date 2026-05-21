# MedSchedule

Sistema SaaS de agenda médica para clínicas pequenas — centraliza agendamentos, pacientes, status de consulta, observações clínicas e visão operacional do dia. Substitui processos manuais de papel/planilha/agenda física.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TanStack Query v5 · Tailwind v4 · Tiptap v3 |
| Backend | NestJS 10 · Prisma 6 · Zod · Passport-JWT (cookie httpOnly) · Helmet |
| Banco | PostgreSQL 16 com extensões `btree_gist` + `pg_trgm` |
| Monorepo | Turborepo 2 + pnpm 9 workspaces |

---

## Pré-requisitos

- **Node.js ≥ 22** (`nvm install 22`)
- **pnpm 9** (`corepack enable && corepack prepare pnpm@9 --activate`)
- **Docker Desktop** (Postgres local via `docker-compose.yml`)

---

## Setup local

```bash
git clone <repo-url> && cd bey
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @medschedule/api db:migrate:dev
pnpm --filter @medschedule/api db:seed
pnpm dev
```

| URL | Serviço |
|---|---|
| http://localhost:3000 | Web (Next.js) |
| http://localhost:3001 | API (NestJS) |
| http://localhost:3001/api/docs | Swagger |
| http://localhost:8080 | Adminer (Postgres GUI) |

**Login do seed**: `admin@medschedule.local` / `Admin@12345` (override via `SEED_ADMIN_PASSWORD`).

---

## Variáveis de ambiente

### `apps/api/.env`

| Var | Descrição |
|---|---|
| `DATABASE_URL` | Connection string Postgres |
| `NODE_ENV` | `development` · `test` |
| `PORT` | Porta HTTP (default 3001) |
| `CORS_ORIGIN` | Origem permitida pelo CORS (default `http://localhost:3000`) |
| `JWT_SECRET` | ≥ 32 caracteres — assina o access token |
| `JWT_REFRESH_SECRET` | ≥ 32 caracteres — assina o refresh token |

### `apps/web/.env.local`

| Var | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL da API (build-time + runtime) |
| `JWT_SECRET` | Mesmo valor da API — usado pelo middleware Next pra validar o cookie antes de servir páginas autenticadas |

---

## Comandos

```bash
pnpm dev              # web + api em paralelo (turbo)
pnpm build            # build de todos os workspaces
pnpm lint             # ESLint em todos
pnpm typecheck        # tsc --noEmit
pnpm test             # unit tests (jest)
pnpm format           # prettier --write
```

Por workspace:
```bash
pnpm -F @medschedule/api dev
pnpm -F @medschedule/web dev
pnpm -F @medschedule/api db:migrate:dev
pnpm -F @medschedule/api db:seed
pnpm -F @medschedule/api test:coverage
```

---

## Estrutura do monorepo

```
bey/
├── apps/
│   ├── api/                     NestJS — auth, patients, appointments, dashboard, notes
│   │   ├── src/modules/         um módulo por agregado de domínio
│   │   └── prisma/              schema, migrations, seed
│   └── web/                     Next.js App Router
│       ├── app/(app)/           rotas autenticadas (sidebar + topbar)
│       ├── app/(auth)/login/    rota pública
│       ├── components/          UI por domínio (appointments, patients, dashboard, notes, shared)
│       └── lib/                 clients HTTP, helpers
├── packages/
│   ├── shared/                  Zod schemas + tipos + regras de domínio puras (slot/FSM)
│   └── tsconfig/                tsconfigs compartilhadas
├── .github/workflows/ci.yml     lint + typecheck + test + build
├── docker-compose.yml           Postgres 16 + Adminer locais
└── turbo.json                   pipeline turbo
```

---

## Funcionalidades

### 11 telas do PDF

| # | Tela | Rota / Como acessar |
|---|---|---|
| 1 | Login | `/login` |
| 2 | Dashboard | `/dashboard` |
| 3 | Calendário mensal | `/calendario` |
| 4 | Agenda diária | `/agenda` |
| 5 | Modal Novo Agendamento | botão "Novo agendamento" na topbar/sidebar |
| 6 | Cadastro de Paciente | `/pacientes` — botão "Novo Paciente" |
| 7 | Detalhe da Consulta | drawer em `/consultas?id=<id>` |
| 8 | Modal Edição | botão "Editar" dentro do drawer |
| 9 | Modal Cancelamento | botão "Cancelar" dentro do drawer |
| 10 | Observações Clínicas | editor Tiptap inline no drawer de detalhe |
| 11 | Tela 404 | qualquer rota inexistente |

### Páginas adicionais

- `/historico` — lista de consultas REALIZADO + CANCELADO com filtro de data
- `/configuracoes` — info da conta autenticada + logout

### Regras de negócio

- Atendimento 07:00–18:30 em slots de 30 min (`packages/shared/src/domain/scheduling.ts`)
- FSM `agendado → confirmado → aguardando → em_atendimento → realizado`, com escape `agendado/confirmado → cancelado` (`packages/shared/src/domain/appointment-status.ts`)
- Exclusão de overlap por usuário via Postgres `EXCLUDE` constraint (`btree_gist`) — impossível persistir dois agendamentos no mesmo slot
- Slots passados são automaticamente filtrados do seletor de "novo agendamento"
- Estados terminais (REALIZADO, CANCELADO) não podem ser alterados, mas permanecem visíveis
- Visual "vencido" para consultas não-terminais com `startsAt < now` (apenas visual, não persistido)
- Observações clínicas append-only: cada save cria uma nova `ClinicalNoteRevision`, nada é mutado
- Autorização: notas só editáveis pelo autor; appointment e patient scope por `userId`

---

## CI

`.github/workflows/ci.yml` roda em PR e push para `main`:

```
pnpm install --frozen-lockfile
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
pnpm turbo build
```

---

## Testes

```bash
pnpm -F @medschedule/api test            # 95 testes
pnpm -F @medschedule/api test:coverage   # threshold 90% (statements + functions)
pnpm -F @medschedule/shared test         # 89 testes (domain puro)
```

Cobertura nos serviços principais: DashboardService 100%, NotesService 100%. Cobertura agregada da API ≥ 90% em statements e functions (threshold global do Jest).

---

## Decisões técnicas relevantes

- **Auth backend-owned**: NestJS é a autoridade de sessão. Access token (15 min) + refresh token rotativo (7 dias) em cookies `httpOnly`. Refresh detecta reuse e revoga toda a family.
- **Single-clinic por deploy**: `Clinic` não é entidade do banco. Cada deploy é uma clínica. Evita multi-tenancy que o PDF não pede.
- **TanStack Query + invalidação por chave**: zero reloads, optimistic UX. Drawers abrem via query param `?id=` (deep-linkável, server-component lê `searchParams` no Next 15).
- **Status FSM + visual "vencido"**: transições validadas no domain (`canTransition`) e no DB (optimistic lock em `transition()`). Vencido é UI-only.
- **Tiptap inline com revisões imutáveis**: editor sempre visível no drawer; `Salvar` gated em `status === REALIZADO`. Save chama `POST /appointments/:id/notes` ou `PATCH /notes/:id` que insere `ClinicalNoteRevision` em transação.
- **Postgres exclusion constraint**: `EXCLUDE USING gist (...)` no schema garante "nunca dois agendamentos no mesmo horário por usuário" no nível do banco. Mapeado pra `ConflictException` no service.

---

## Notas de segurança

Mitigações no código:

- Cookies `httpOnly` + `sameSite=lax` (e `secure` quando `NODE_ENV=production`)
- Helmet middleware (CSP básica, X-Frame-Options, etc.)
- CORS com `credentials: true` e origem explícita via env
- Zod validation em todo `@Body` e `@Query` via `ZodValidationPipe`
- Argon2id para hash de senha
- Refresh token rotation com detecção de reuse → revoga toda a family
- Optimistic lock no `cancel` endpoint (fecha race TOCTOU)
- Pino logger com redaction de `password`, `cpf`, `phone`, `email` em campos sensíveis
- ThrottlerGuard global (100 req/min) + throttler específico no `/auth/login` (5/min)

**`pnpm audit --prod` em 2026-05-21**: `No known vulnerabilities found` (0 vulnerabilidades em qualquer severidade).

- Resolvidos via `pnpm.overrides` em `package.json` raiz: `lodash` (`>=4.18.0`, fecha GHSA-r5fr-rjxr-66jc high + GHSA-f23m-r3pf-42rh + GHSA-xxjr-mmjv-4gpg moderates via `@nestjs/swagger`), `js-yaml` (`>=4.1.1`, GHSA-mh29-5h37-fv8m), `file-type` (`>=21.3.2`, GHSA-5v7r-6r5c-r473 + GHSA-j47w-4g3g-c36v via `@nestjs/common`), `postcss` (`>=8.5.10`, GHSA-qx2v-qp2m-jg93 via `next`).
- `@nestjs/*` atualizados para 11.x (`@nestjs/core@^11.1.21`, `@nestjs/common@^11.1.21`, `@nestjs/platform-express@^11.1.21`, `@nestjs/swagger@^11.4.3`, `@nestjs/throttler@^6.5.0`, `@nestjs/testing@^11.1.21`, `@nestjs/cli@^11.0.21`, `@nestjs/schematics@^11.1.0`), fechando GHSA-36xv-jgw5-4q75 (injection em output de erro de `@nestjs/core`). Sem breaking changes no código de aplicação — todos os testes unitários (95/95) e build verde.

---

## Licença

Projeto privado de avaliação.
