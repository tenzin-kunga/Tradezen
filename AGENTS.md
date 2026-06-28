# TradeZen — OpenCode Agent

## Project Context
- **Stack:** Next.js 14 (web) + NestJS 11 (api), PostgreSQL 16 + pgvector, Redis 7, Turborepo (Bun)
- **Apps:** `apps/api` (NestJS), `apps/web` (Next.js App Router)
- **Packages:** `packages/db` (Drizzle ORM + pgvector), `packages/types`, `packages/ui`, `packages/eslint-config`, `packages/typescript-config`
- **Auth:** JWT access + HTTP-only refresh cookies, OAuth (Google/GitHub)
- **AI:** OpenRouter integration (LangChain/LangGraph)
- **Deploy:** Vercel (web) + Render (api) + Neon (prod DB) / Docker Compose (local)

## Developer Commands
```bash
# Root (Turborepo)
bun install                 # install all deps
bun run dev                 # build @tradezen/db then start api+web (turborepo)
bun run build               # build all packages
bun run lint                # lint all packages
bun run check-types         # typecheck all packages
bun run format              # prettier write

# API (apps/api)
bun run migrate             # drizzle migrations (ts-node src/migrate.ts)
bun run test                # unit tests (jest)
bun run test:e2e            # e2e tests (jest --config test/jest-e2e.json)

# Web (apps/web)
bun run dev                 # next dev -p 3000
bun run build               # next build
bun run start               # next start -p 3000

# Docker (root)
scripts/dev/start.bat       # one-click: Docker Desktop + postgres/redis + api+web in separate windows
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d postgres redis  # infra only
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d                 # full stack
```

## Required Order
`lint → check-types → test` (CI pipeline order)

## Environment Files
| File | Purpose |
|------|---------|
| `.env.docker` | Docker Compose secrets (copy from `.env.docker.example`) |
| `apps/api/.env` | API dev defaults (DB_HOST=localhost, etc.) |
| `apps/web/.env` | Web dev defaults (NEXT_PUBLIC_API_URL) |

**Required Docker secrets:** `DB_PASSWORD`, `JWT_SECRET` (64+ chars), `JWT_REFRESH_SECRET` (64+ chars), `OPENROUTER_API_KEY` (optional), `WEB_URL`

## Database
- **ORM:** Drizzle + pgvector (schema in `packages/db/src/schema/`)
- **Migrations:** `apps/api/drizzle/` (run via `bun run migrate` in api)
- **Local:** `pgvector/pgvector:pg16` on port 5432 (Docker)
- **Prod:** Neon PostgreSQL

## Key Architecture Notes
- **Monorepo:** Bun workspaces + Turborepo (`turbo.json` defines build/lint/typecheck/dev tasks)
- **API → DB:** Internal Docker network `tradezen-net` (static IPs), not localhost
- **Web → API:** `NEXT_PUBLIC_API_URL=http://api:3001` (Docker) or `http://localhost:3001` (local)
- **tRPC:** API exports `@tradezen/api/trpc` for end-to-end types
- **Shared types:** `@tradezen/types` package
- **Swagger:** `/api/docs` (dev only, disabled in production)

## Testing
- **Unit:** Jest + ts-jest (API: `test/`, Web: none configured)
- **E2E:** NestJS supertest against real Postgres+Redis (CI uses sidecar containers)
- **CI order:** security → lint → typecheck → test → e2e → build → deploy

## CI/CD (`.github/workflows/ci.yml`)
- **Branches:** `develop` → staging, `main` → prod (requires approval)
- **Concurrency:** cancels stale runs on PRs/develop, never on main
- **Required secrets:** `RENDER_API_KEY`, `RENDER_SERVICE_ID`, `VERCEL_TOKEN`, `CODECOV_TOKEN`, etc.

## Context-Mode Rules (MANDATORY)
- **Shell (>20 lines):** Use `ctx_batch_execute` or `ctx_execute(language: "shell")`
- **File analysis:** Use `ctx_execute_file` (not Read)
- **grep/search:** Use `ctx_execute(language: "shell", code: "grep ...")`
- **Web fetch:** `ctx_fetch_and_index` → `ctx_search` (no direct fetch)
- **Think in Code:** Write JS in sandbox, `console.log()` only answer
- **Parallel I/O:** `concurrency: 4-8` for network calls

## References
- `README.md` — full project overview, endpoints, deployment
- `docs/ARCHITECTURE.md` — system architecture
- `docs/SECURITY.md` — hardening
- `docs/DEPLOYMENT.md` — production steps
- `docs/DEV_QUICKSTART.md` — 5-min onboarding