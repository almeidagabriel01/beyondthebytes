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
| Deploy | Vercel (web) · Railway (API container) · Neon (DB serverless) |

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

A aplicação está em 3 provedores. Tudo gratuito ou ~$5/mês.

### 1. Banco — Neon

1. Criar projeto em https://neon.tech
2. Habilitar extensões: `btree_gist`, `pg_trgm` (Settings → Extensions)
3. Copiar a connection string (formato `postgresql://user:pass@host/db?sslmode=require`)
4. (Opcional) Criar branch `dev` separada da `main` pra preview deploys

### 2. API — Railway

1. Criar projeto em https://railway.app, conectar o repo
2. Apontar pra `apps/api/Dockerfile` (Settings → Build → Dockerfile path)
3. Set env vars no dashboard:
   ```
   DATABASE_URL   = <connection string da Neon>
   NODE_ENV       = production
   PORT           = 3001
   CORS_ORIGIN    = https://<seu-domínio-vercel>
   JWT_SECRET     = <32+ chars, openssl rand -hex 32>
   JWT_REFRESH_SECRET = <outro 32+ chars>
   ```
4. Deploy. O container roda `npx prisma migrate deploy && node dist/main.js` no boot
5. Anotar a URL pública gerada (formato `https://<projeto>.up.railway.app`)
6. (Primeira vez) Rodar o seed via Railway CLI: `railway run pnpm --filter @medschedule/api db:seed`

### 3. Web — Vercel

1. Importar o repo em https://vercel.com
2. **Não** mexer em Root Directory (deixar a raiz) — o `vercel.json` na raiz já configura o build pro monorepo
3. Set env vars:
   ```
   NEXT_PUBLIC_API_URL = <URL pública da API no Railway>
   JWT_SECRET          = <mesmo valor da API>
   ```
4. Deploy. URL gerada no formato `https://<projeto>.vercel.app`
5. Voltar no Railway e atualizar `CORS_ORIGIN` para a URL da Vercel

### Checklist pós-deploy

- [ ] Web abre, redireciona para `/login`
- [ ] Login com `admin@medschedule.local` funciona (cookie `access_token` setado)
- [ ] `/dashboard` carrega com dados do seed
- [ ] Criar consulta, avançar status, adicionar nota — todas as ações funcionam sem reload
- [ ] Logout limpa cookies e redireciona pra `/login`

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
