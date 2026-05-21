# MedSchedule

Sistema SaaS de agenda médica para clínicas pequenas e consultórios — substitui processos manuais de papel/planilha/agenda física centralizando agendamentos, pacientes, status de consulta, observações clínicas e visão operacional do dia.

Projeto de avaliação para vaga de Engenheiro de Software Senior. Spec em [`docs/9683a7ac-bb22-4df9-a88a-391a6ff5fb90_Desafio_MedSchedule_.pdf`](./docs).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 App Router · React 19 · TanStack Query v5 · Tailwind v4 · Tiptap v3 |
| Backend | NestJS 10 · Prisma 6 · Zod · Passport-JWT (httpOnly cookie) · Helmet |
| Banco | PostgreSQL 16 (local Docker · Neon em produção) com `btree_gist` + `pg_trgm` |
| Monorepo | Turborepo 2 + pnpm 9 workspaces |
| Deploy-ready | Dockerfile multi-stage para a API · `vercel.json` para o web no monorepo (ver seção [Deploy](#deploy)) |

---

## Pré-requisitos

- **Node.js ≥ 22** (`nvm install 22`)
- **pnpm 9** (`corepack enable && corepack prepare pnpm@9 --activate`)
- **Docker Desktop** (para Postgres local)

---

## Setup local

```bash
git clone <repo-url> && cd bey
pnpm install
docker compose up -d                     # Postgres + Adminer locais
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @medschedule/api db:migrate:dev
pnpm --filter @medschedule/api db:seed   # admin@medschedule.local / Admin@12345
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
| `NODE_ENV` | `development` · `production` · `test` |
| `PORT` | Porta HTTP (default 3001) |
| `CORS_ORIGIN` | Origem permitida (em prod: URL pública do web) |
| `JWT_SECRET` | Mínimo 32 caracteres — assina o access token |
| `JWT_REFRESH_SECRET` | Mínimo 32 caracteres — assina o refresh token |

### `apps/web/.env.local`

| Var | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública da API (build-time + runtime) |
| `JWT_SECRET` | Mesmo valor da API — usado pelo middleware Next pra validar cookie |

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
│   │   ├── prisma/              schema, migrations, seed
│   │   └── Dockerfile           imagem multi-stage pro Railway
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
├── vercel.json                  config de build pro monorepo
└── turbo.json                   pipeline turbo
```

---

## Funcionalidades entregues (11 telas do PDF)

| # | Tela | Rota |
|---|---|---|
| 1 | Login | `/login` |
| 2 | Dashboard | `/dashboard` |
| 3 | Calendário mensal | `/calendario` |
| 4 | Agenda diária | `/agenda` |
| 5 | Modal Novo Agendamento | sidebar/topbar CTA |
| 6 | Cadastro de Paciente | `/pacientes` |
| 7 | Detalhe da Consulta | drawer em `/consultas?id=<id>` |
| 8 | Modal Edição | dentro do drawer |
| 9 | Modal Cancelamento | dentro do drawer |
| 10 | Observações Clínicas | editor inline Tiptap no drawer |
| 11 | Tela 404 | `/qualquer-rota-inexistente` |

Extras: `/historico` (consultas REALIZADO+CANCELADO com filtro de data) e `/configuracoes` (info da conta + logout).

### Regras de negócio implementadas

- Atendimento 07:00–18:30 em slots de 30 min (`packages/shared/src/domain/scheduling.ts`)
- FSM `agendado → confirmado → aguardando → em_atendimento → realizado` com escape pra `cancelado` a partir de agendado/confirmado (`packages/shared/src/domain/appointment-status.ts`)
- Exclusão de overlap por usuário via Postgres `EXCLUDE` constraint (`btree_gist`)
- Slots anteriores ao horário atual filtrados automaticamente do seletor
- Cancelados e realizados permanecem visíveis; transições proibidas em estados terminais
- Observações clínicas append-only (revisões imutáveis em `ClinicalNoteRevision`)
- Autorização: notas só editáveis pelo autor; appointment scope por `userId`

---

## Deploy

> **Status atual**: o projeto está **deploy-ready** mas **não tem URL pública ativa**. A avaliação é feita rodando localmente via [Setup local](#setup-local) acima.
>
> Os artefatos abaixo (Dockerfile, vercel.json, env vars documentadas) demonstram que o projeto pode ser colocado em produção com mínimo esforço quando houver demanda real.

### Arquitetura de produção pretendida

- **Web** → qualquer provedor que rode Next.js 15 (Vercel é o caminho natural — `vercel.json` na raiz já configura o build no monorepo)
- **API** → qualquer plataforma que rode container persistente (Railway, Fly.io, Render, Cloud Run) usando `apps/api/Dockerfile`. **Não vai bem em serverless** por causa de cold start e connection pooling
- **DB** → qualquer Postgres 16+ com extensões `btree_gist` e `pg_trgm` habilitadas (Neon, Supabase, AWS RDS, etc.)

### O que está pronto no repo

| Artefato | O que faz |
|---|---|
| `apps/api/Dockerfile` | Multi-stage: deps (pnpm fetch) → build (`prisma generate` + `nest build`) → runtime (Node 22 alpine, ~150MB). Boot roda `prisma migrate deploy` antes de iniciar o servidor |
| `apps/api/.dockerignore` | Exclui `node_modules`, `dist`, `.env*`, `coverage` |
| `vercel.json` | `buildCommand` + `installCommand` apontando pro turbo filter do web. Funciona sem precisar configurar Root Directory no dashboard da Vercel |
| `apps/api/.env.example` · `apps/web/.env.example` | Todas as env vars necessárias documentadas |

### Quando for deployar

1. Provisionar Postgres com `btree_gist` + `pg_trgm` habilitados → copiar `DATABASE_URL`
2. Setar env vars no provedor da API (ver tabela acima). Gerar segredos com `openssl rand -hex 32`
3. Apontar a plataforma de container pro `apps/api/Dockerfile`
4. Deploy do web no provedor preferido — setar `NEXT_PUBLIC_API_URL` apontando pra URL da API e `JWT_SECRET` com o mesmo valor da API
5. Voltar e atualizar `CORS_ORIGIN` na API pra URL do web
6. Rodar seed uma vez: `pnpm --filter @medschedule/api db:seed` no container ou via CLI do provedor

---

## CI

Workflow único em `.github/workflows/ci.yml` rodando em PR e push para `main`:

```
pnpm install --frozen-lockfile
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
pnpm turbo build
```

---

## Decisões técnicas relevantes

- **Auth NestJS-owned, não Auth.js**: backend separado é a autoridade de sessão. Access token (15 min) + refresh token rotativo (7 dias) em cookies httpOnly. Documentado em `ADR-001` do código de auth.
- **Single-clinic por deploy**: `Clinic` não é uma entidade do banco — cada deploy é uma clínica. Evita complexidade desnecessária de multi-tenancy que o PDF não pede.
- **TanStack Query + invalidação por chave**: zero reloads, optimistic UX. Drawer abre via query param `?id=` (deep-linkável, server-component lê `searchParams`).
- **Status: FSM + visual "vencido"**: transições validadas tanto no domain quanto no Postgres. "Vencido" é estado visual (não persistido) quando consulta não-terminal passou do horário.
- **Tiptap inline com revisões imutáveis**: editor sempre visível no drawer, mas `Salvar` gated em `status === REALIZADO`. Cada save gera um registro em `ClinicalNoteRevision` — nada é mutado.
- **Postgres exclusion constraint** (`btree_gist`): garante "nunca dois agendamentos no mesmo horário" no nível do banco, não só na aplicação. Mapeado pra `ConflictException` no service.

---

## Notas de segurança

Mitigações em produção (Helmet + cookies + validation):

- HTTPS automático (Vercel + Railway)
- Cookies `httpOnly`, `secure` em prod, `sameSite=lax`
- CORS com `credentials: true` e origem explícita
- Zod validation em todo `@Body` e `@Query`
- Prisma parameterized queries (zero raw SQL com input do usuário em produção; raw em dashboard usa apenas constantes/IDs já validados)
- Argon2 para hash de senha
- Refresh token rotation com detecção de reuso → revoga toda a family
- Pino logger com redaction de `password`, `cpf`, `phone` em campos sensíveis

`pnpm audit` em 2026-05-21: nenhum high/critical em runtime deps.

---

## Licença

Projeto privado de avaliação.
