# TradeZen — Software Development Guide

> The "how we build software here" manual for contributors.
> Covers the full development loop: setup, day-to-day workflow, code quality,
> database changes, git/PR flow, testing, async work, and deployment.
>
> This is the **entry point**. It links to deeper docs instead of duplicating them.

## Document Map

| Doc | Purpose | Read when |
| --- | --- | --- |
| **This guide** | Day-to-day development workflow | Always |
| `docs/rules.md` | Engineering Constitution — non-negotiable rules | Before any design work |
| `docs/DEV_QUICKSTART.md` | 5-minute setup & troubleshooting | First-time setup, broken env |
| `docs/Architecture.md` | System design deep-dive | Broad architecture questions |
| `docs/decisions/` | ADRs | "Why was this built this way?" |
| `docs/DEPLOYMENT.md` | Production deployment (Render/Neon/Vercel) | Shipping |
| `docs/SECURITY.md` | Hardening guide | Security-sensitive work |
| `docs/git-workflow-enforcement.md` | Branch/commit/PR conventions (TZ-090) | Git questions |
| `AGENTS.md` | Agent-oriented repo conventions & gotchas | Any automated work |

---

## 1. Stack & Architecture (30-Second Tour)

TradeZen is a professional trading journal + behavioral analytics + AI
coaching platform. It is a **modular monolith** — do not microservice until
bottlenecks are proven (rules.md §19-20).

| Layer | Tech | Role |
| --- | --- | --- |
| `apps/web` | Next.js 14.2 (App Router), React 18, Tailwind v3, shadcn/ui | Frontend |
| `apps/api` | NestJS 11, Drizzle ORM, Socket.IO, tRPC | Backend HTTP + WS + RPC |
| `apps/ai-service` | Python 3.11, FastAPI, LangChain/LangGraph | AI providers, chat, embeddings |
| `packages/db` | Drizzle schema + connection + types | Single DB source of truth |
| `packages/types` | Shared TS types | Cross-app types |
| `packages/ui` | Shared UI components | Cross-app UI |
| infra | PostgreSQL 16, Redis 7, BullMQ | Persistence, cache, queues |

### Non-negotiable principles (full detail in `rules.md`)

- **Backend is the source of truth.** Frontend must never compute
  authoritative PnL/analytics/risk. All critical logic lives server-side
  (rules.md §5).
- **Determinism.** Every calculation must be reproducible and versioned.
  PnL/Risk/Reward formulas are frozen in rules.md §4.
- **Data integrity.** Trades must never be silently modified or deleted.
  Destructive actions require explicit user intent (rules.md §3).
- **Time.** All timestamps stored in UTC; conversion only at presentation.
- **Numbers.** Raw numerics, no rounding at storage, decimal-safe math.
- **Authz.** Every query enforces `WHERE user_id = ?`. Users only touch their
  own data.
- **AI boundaries.** AI coaches psychology, never financial advice/signals
  (rules.md §12).

---

## 2. Environment Setup

Requirements: **Bun 1.3.13** (repo packageManager), **Docker Desktop**,
**Git**.

```bash
bun install                       # install monorepo workspaces

cp .env.docker.example .env.docker  # Docker infra secrets
# Edit .env.docker with: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
# (JWT secrets must be 64+ chars in prod; simple defaults OK for localhost)
```

Environment files:

| File | Purpose |
| --- | --- |
| `.env.docker` | Docker Compose secrets (never commit) |
| `apps/api/.env` | API dev defaults (`DB_HOST=localhost`) |
| `apps/web/.env` | Web dev defaults (`NEXT_PUBLIC_API_URL`) |
| `apps/ai-service/.env` | AI service settings |

Start everything:

```bash
bun run infra:up    # start PostgreSQL + Redis via orchestrator
bun run dev:all     # API + Web + AI service with hot reload
# or `bun run dev` (builds @tradezen/db first, then turbo starts api+web)
```

Verify:
- Web: http://localhost:3000
- API health: http://localhost:3001/
- Swagger (dev only): http://localhost:3001/api/docs
- AI service: `PORT` shown in orchestrator output

> **Note:** `apps/api` auto-runs migrations on startup (`main.ts` →
> `runMigrations()`), so a fresh DB is migrated for you. There is no separate
> migration step in local dev.

---

## 3. Day-to-Day Development Loop

1. `git checkout develop` → create feature branch (see §6).
2. `bun run dev:all` for full stack, or run slices:
   - `bun run dev:api` — NestJS only
   - `bun run dev:web` — Next.js only
   - `bun run dev:ai` — Python AI service only
3. Make changes. The API is hot-reloaded; Web hot-reloads via Next.js.
4. If you changed the schema → generate a migration (see §4).
5. Run quality gates before pushing (see §5).
6. Push → open PR to `develop` (see §6).

### Path conventions

- API feature modules: `apps/api/src/<module>/` (e.g. `trades/`,
  `knowledge/`, `auth/`, `chat/`).
- Shared DB schema lives ONLY in `packages/db/src/schema/` — never edit
  `apps/api/drizzle/` by hand.
- Web routes: `apps/web/app/`, shared components `apps/web/components/`,
  API clients `apps/web/lib/`.
- AI service: `apps/ai-service/app/`.

---

## 4. Database & Migrations

**Schema is the single source of truth** in `packages/db/src/schema/`
(plus connection + types in the same package). Migrations are Drizzle SQL in
`apps/api/drizzle/`.

### Adding a schema change

1. Edit `packages/db/src/schema/` (and export from `schema/index.ts`).
2. Generate the migration:
   ```bash
   cd apps/api && bun run migrate   # uses drizzle via src/migrate.ts
   ```
3. Review the generated SQL in `apps/api/drizzle/`.
4. On next API boot, `runMigrations()` applies it automatically.

### Rules (rules.md §8)

- Every migration must be **reversible**.
- Destructive migrations require backups + rollback plans.
- Critical writes (trade CRUD, imports, analytics snapshots, AI memory) must
  use transactions.
- Keep hot paths indexed (`user_id`, `symbol_id`, `created_at`); avoid N+1
  queries and unindexed scans.

> If a migration fails locally, check `apps/api/drizzle/` ordering and the
> `__drizzle_migrations` table via the DB logs. See DEV_QUICKSTART →
> Troubleshooting → "Migrations Fail".

---

## 5. Code Quality Gates

Run all three before pushing:

```bash
bun run lint          # turbo run lint (ESLint across workspaces)
bun run check-types   # turbo run check-types (tsc --noEmit per app)
bun run format        # prettier --write "**/*.{ts,tsx,md}"
```

CI (`.github/workflows/ci.yml`) enforces, in order:

1. **Detect Changes** — path-filter: `apps/api/**` or `packages/db/**` → API;
   `apps/web/**` → Web.
2. **Lint & Typecheck** — always runs (`bun install --frozen-lockfile`,
   builds `@tradezen/db` first, then ESLint + tsc).
3. **Build** — builds API/Web if their paths changed.

> **Current CI gap:** the pipeline was simplified to lint + typecheck + build.
> Unit/e2e tests and security audits no longer run in CI. Treat local
> `bun run test` and dependency audits (`bun pm audit`) as your responsibility
> until re-added.

Reviewers also check against the constitution: backend authority, validation
at every boundary, no secrets, UTC timestamps, decimal-safe money math.

---

## 6. Git Workflow

Workflow details live in `docs/git-workflow-enforcement.md`. Summary:

### Branches

| Pattern | Purpose |
| --- | --- |
| `feature/TZ-XXX-description` | New features |
| `fix/TZ-XXX-description` | Bug fixes |
| `chore/description` | Maintenance |
| `docs/description` | Documentation |
| `release/vX.Y.Z` | Releases |

Branch from `develop`, PR back into `develop`. Direct pushes to `main` are
forbidden.

### Commits (Conventional Commits)

```
type(scope): description

[optional body]
```

`feat` `fix` `docs` `style` `refactor` `test` `chore` — scope = area, e.g.
`feat(api): add rate limiting (TZ-010)`. Keep commits atomic and
self-contained.

### PR flow

1. Feature branch from `develop` with conventional commits.
2. `bun run lint && bun run check-types && bun run test` locally.
3. Push, open PR to `develop`, fill template.
4. CI green → review → squash or rebase merge → delete branch.

---

## 7. Testing

- **API only** has Jest. Spec files live alongside source in
  `apps/api/src/**/*.spec.ts`.
- No web tests are configured.

```bash
bun run test            # unit tests (API)
bun run test:e2e --filter=api   # e2e (requires Postgres + Redis up)
```

Constitution §17: auth, calculations, analytics, imports, permissions, and AI
memory persistence are critical systems and require testing. If your change
touches those, add a spec.

---

## 8. Queues, AI & Async Work

- **BullMQ** on Redis handles async work: AI processing, embeddings, analytics
  snapshots, imports, notifications.
- Every job must be **idempotent, retry-safe, observable, recoverable**
  (rules.md §10).
- Redis is for cache/queues/pubsub **only** — never a source of truth
  (rules.md §9).
- **AI service** (`apps/ai-service`, Python) owns provider abstraction —
  OpenRouter/cloud providers via a factory — plus LangGraph chat and the
  embedding pipeline. The NestJS API talks to it as a client.
- Nightly analytics snapshots run via cron (`0 23 * * *`) in `main.ts`.
- Realtime (WebSocket) must authenticate users, isolate subscriptions, and
  use Redis pub/sub — never direct DB polling.

---

## 9. Security Checklist

Non-negotiable for every change (full detail in `rules.md` §6, `SECURITY.md`):

- All endpoints authenticated except explicit auth endpoints.
- Sessions expire; refresh tokens rotate; HTTP-only cookies.
- Passwords: bcrypt+, never logged/returned.
- JWT secrets: 64+ chars, no fallback secrets, never logged. Validated at API
  startup in production.
- Validate every request body, query param, route param, WS payload, import.
  Reject unknown fields.
- Never commit secrets; env vars or secret managers only; never in frontend
  bundles or logs.
- Production: HTTPS, HSTS, CSP, rate limiting, audit logging, security scans.

---

## 10. Deploying

Full playbook: `docs/DEPLOYMENT.md`.

- **Web:** Vercel · **API:** Render · **DB:** Neon (prod) / Docker (local).
- Deploys require rollback strategy, health checks, monitoring, backup
  verification, and secrets rotated (rules.md §21).
- Keep dev/staging/prod environments similar (environment parity).

---

## 11. Troubleshooting Quick Reference

| Symptom | Fix |
| --- | --- |
| Port 3000/3001 busy | Find + kill: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F` |
| Docker daemon not running | Start Docker Desktop first |
| DB connection refused | `bun run infra:up`; check Postgres container + logs; first boot takes 20-30s |
| Migrations fail | Check `apps/api/drizzle/` order + `__drizzle_migrations` table |
| Node out of memory (Next dev) | Raise `NODE_OPTIONS=--max-old-space-size=4096` in `apps/web` dev script |
| `@tradezen/db` types missing | `bun run build --filter=@tradezen/db` (must be built before lint/typecheck) |

More in `DEV_QUICKSTART.md`.

---

## Quick Reference — Commands

| Goal | Command |
| --- | --- |
| Install | `bun install` |
| Full stack dev | `bun run dev:all` (or `bun run dev`) |
| Slice dev | `bun run dev:api` / `dev:web` / `dev:ai` |
| Infra (PG+Redis) | `bun run infra:up` / `infra:down` |
| Migrate | `cd apps/api && bun run migrate` (auto-runs on API boot) |
| Lint / types / format | `bun run lint` / `bun run check-types` / `bun run format` |
| Test | `bun run test` · `bun run test:e2e --filter=api` |
| Build | `bun run build` |
