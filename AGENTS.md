# TradeZen — Carbon Ledger

## Stack

- **Web:** Next.js 14.2, React 18.2, Tailwind v3.4, shadcn/ui
- **API:** NestJS 11, Drizzle ORM + pgvector, PostgreSQL 16, Redis 7, BullMQ
- **Auth:** JWT access + HTTP-only refresh cookies, OAuth (Google/GitHub)
- **AI:** LangChain/LangGraph (OpenRouter), BullMQ queues, nightly snapshots
- **Monorepo:** Bun workspaces + Turborepo v2
- **Deploy:** Vercel (web) + Render (api) + Neon (prod DB) / Docker Compose (local)

## Workspace layout

| Path                         | Package name              | Role                                     |
| ---------------------------- | ------------------------- | ---------------------------------------- |
| `apps/api`                   | `api`                     | NestJS backend (HTTP + WebSocket + tRPC) |
| `apps/web`                   | `web`                     | Next.js App Router frontend              |
| `packages/db`                | `@tradezen/db`            | Drizzle schema + connection + types      |
| `packages/types`             | `@tradezen/types`         | Shared TS types                          |
| `packages/ui`                | `@tradezen/ui`            | Shared UI components                     |
| `packages/eslint-config`     | `@repo/eslint-config`     | ESLint presets                           |
| `packages/typescript-config` | `@repo/typescript-config` | TSConfig presets                         |

## Critical commands

```bash
# Root
bun install                    # install everything
bun run dev                    # builds @tradezen/db first, then starts api+web
bun run build                  # turbo run build
bun run lint                   # turbo run lint
bun run check-types            # turbo run check-types -- each app has its own tsc --noEmit
bun run format                 # prettier --write "**/*.{ts,tsx,md}"

# API (apps/api)
bun run migrate                # drizzle migrations via ts-node src/migrate.ts
bun run test                   # jest (spec files in src/)
bun run test:e2e               # jest --config test/jest-e2e.json

# Docker
scripts/dev/start.bat          # one-click Docker Desktop + infra + api+web
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d postgres redis
```

## CI pipeline order (must-match)

**`changes → security → lint → test → e2e → build-api/build-web → deploy-staging|deploy-prod`**

`lint` and `check-types` both run before `test`. Path-filtering skips irrelevant jobs:

- `apps/api/**` or `packages/db/**` → runs API unit/e2e
- `apps/web/**` → runs web lint/typecheck only (no web tests exist)

## Gotchas

- **`bun run dev` auto-runs migrations** — `main.ts:144` calls `runMigrations()` on startup. There is no separate migration step in local dev.
- **@tradezen/db must be built first** — root `dev` script explicitly runs `bun run build --filter=@tradezen/db` before turbo.
- **JWT secrets must be 64+ chars** — validated at startup in production (`main.ts:33-42`). Dev mode skips validation.
- **tRPC:** API mounts `/trpc` via Express middleware. Web imports `api/trpc` for end-to-end types (path alias in web's tsconfig: `api/trpc -> ../../apps/api/src/trpc/index.ts`).
- **Swagger** at `/api/docs` — dev only, disabled in production (`main.ts:118`).
- **No web tests** configured — only API has Jest.
- **Next.js 14 specific** — `apps/web/AGENTS.md` warns about breaking changes. Check `node_modules/next/dist/docs/` before writing Next.js code.
- **Bun required** — packageManager is `bun@1.3.13`. Lockfile is `bun.lock`.

## Environment files

| File            | Purpose                                                  |
| --------------- | -------------------------------------------------------- |
| `.env.docker`   | Docker Compose secrets (copy from `.env.docker.example`) |
| `apps/api/.env` | API dev defaults (DB_HOST=localhost, etc.)               |
| `apps/web/.env` | Web dev defaults (NEXT_PUBLIC_API_URL)                   |

Required Docker secrets: `DB_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (all 64+ chars), `OPENROUTER_API_KEY` (if chat used), `WEB_URL`

## Key architecture

- **Drizzle:** Schema in `packages/db/src/schema/`, migrations in `apps/api/drizzle/`. ORM is drizzled directly — no Prisma.
- **API → DB:** Docker internal network `tradezen-net` (not localhost). Locally uses `DB_HOST=localhost`.
- **Web → API:** `NEXT_PUBLIC_API_URL=http://api:3001` (Docker) or `http://localhost:3001` (local).
- **Global NestJS module** (`app.module.ts`) registers JwtAuthGuard + ThrottlerEventsGuard globally, along with SnapshotService, AI services, notification services.
- **BullMQ** for queues (AI processing, analytics snapshots). Redis required.
- **WebSocket** via Socket.IO gateway module.

## References

- `docs/ARCHITECTURE.md` — system design
- `docs/DEPLOYMENT.md` — production steps
- `docs/SECURITY.md` — hardening guide
- `docs/DEV_QUICKSTART.md` — 5-min onboarding
- `docs/decisions/` — ADRs
