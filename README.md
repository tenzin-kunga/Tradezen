# TradeZen

A professional trading journal and analytics platform — log trades, track behavior, journal daily, and get AI-powered coaching and insights.

[![CI](https://github.com/tenzin-kunga/Tradezen/actions/workflows/ci.yml/badge.svg)](https://github.com/tenzin-kunga/Tradezen/actions/workflows/ci.yml)

## Tech Stack

| Layer        | Technology                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **Frontend** | Next.js 14.2, React 18.2, Tailwind CSS v3, shadcn/ui, Recharts, lightweight-charts, tRPC client   |
| **Backend**  | NestJS 11, tRPC, Socket.IO, BullMQ, Passport JWT + OAuth (Google/GitHub)                          |
| **Database** | PostgreSQL 16 + pgvector, Drizzle ORM, Redis 7                                                    |
| **AI**       | LangChain / LangGraph (API) + Python FastAPI ai-service; per-user API keys; optional local Ollama |
| **Monorepo** | Bun workspaces + Turborepo                                                                        |

## Features

- **Authentication** — JWT access tokens + HTTP-only refresh cookies, OAuth (Google/GitHub), and TOTP two-factor authentication
- **Trade logging** — Full CRUD with symbol, direction, entry/exit, lot size, stop loss, take profit, strategy, notes
- **Behavioral tracking** — FOMO check and revenge-trade flags, behavioral analytics
- **Analytics** — Win rate, profit factor, expectancy, drawdown, Sharpe ratio, day-of-week performance, equity curve, dashboard snapshots
- **CSV import/export** — Bulk export and async CSV import (BullMQ)
- **Daily journal** — Pre/post-market notes, mood, market conditions, lessons learned, streak tracking
- **Tags** — Color-coded tags with categories, attach to trades for filtering
- **Reports** — PDF reports (generated with `@react-pdf/renderer`)
- **Calendar** — Trade and journal entries by date
- **Checklists** — Reusable trading checklists
- **Position size calculator** — Risk-based sizing
- **AI assistant** — Streaming chat with per-user provider/model configuration
- **AI insights & coaching** — Deterministic behavioral coaching cards plus proactive real-time notifications
- **Knowledge base** — Document ingestion, RAG retrieval, memory (via ai-service)
- **Research** — AI-assisted research reports
- **Watchlist** — Track symbols of interest
- **News** — Symbol/economic-news events feed
- **Workspace system** — Modular workspace (`knowledge`, `memory`, `research`, `watchlist`)
- **Glass Depth UI** — Glass-morphism design system with cyan/emerald accents
- **Swagger** — Interactive API docs at `/api/docs` (dev only)

## Project Structure

```
tradezen/
├── apps/
│   ├── api/          # NestJS backend (auth, trades, analytics, chat, AI, WebSocket, tRPC, BullMQ)
│   ├── web/          # Next.js frontend (dashboard, trade log, analytics, journal, workspace)
│   └── ai-service/   # Python FastAPI AI service (chat, coaching, research, RAG, OpenAI-compat)
├── packages/
│   ├── db/           # @tradezen/db — Drizzle schema + connection + types
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   ├── eslint-config/# ESLint configs
│   └── typescript-config/ # TSConfig presets
├── docs/             # Project documentation (architecture, decisions, planning, specs)
├── infra/            # Docker Compose (Postgres, Redis, API, Web, AI service, Ollama)
├── scripts/          # Dev orchestrator, DB backup, utility scripts
├── .githooks/        # Git hooks (pre-commit secret scanning)
├── .env.docker.example # Docker Compose environment template
├── .env.dev.example  # Dev launcher overrides template
└── bun.lock          # Authoritative lockfile
```

## Getting Started

### Prerequisites

- **Bun 1.3+** — package manager; lockfile is `bun.lock` (see [Gotchas](#gotchas))
- Docker Desktop (for local PostgreSQL + Redis)

### Quick Start

```sh
bun install
bun run doctor      # verify your environment (Bun, Docker, Postgres, Redis, Python venv, ...)
bun run dev:all     # launch API (3001) + Web (3000) + AI (8000) with hot reload
```

`bun run dev:all` is the one-command, cross-platform launcher. It ensures Docker is up, starts infrastructure with health checks, builds `@tradezen/db`, and opens each service in its **own terminal window**. Close a window to stop that service; the database and Redis keep running between sessions.

The Windows `scripts/dev/start.bat` is a thin wrapper that calls `bun run dev:all`.

### Individual commands

```sh
bun run doctor        # diagnostic health check (exit 1 if anything critical is missing)
bun run infra:up      # start PostgreSQL + Redis (+ Ollama when enabled)
bun run infra:down    # stop the Docker infrastructure
bun run dev:api       # run only the API
bun run dev:web       # run only the Web app
bun run dev:ai        # run only the AI service (needs its Python venv)
bun run dev:all       # run everything
```

### Ollama (optional, local LLM)

Copy `.env.dev.example` to `.env.dev` and set `ENABLE_OLLAMA=true` to start the local Ollama LLM via the `ai` Docker Compose profile (needs ~4GB RAM+). Set `AUTO_PULL_OLLAMA=true` to have the launcher pull the default model (`qwen3:4b`) automatically; otherwise it prints the pull command. When disabled, the app uses cloud providers via per-user keys.

### Manual Setup (Docker only)

```sh
cp .env.docker.example .env.docker   # then edit with your values
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d postgres redis
bun run dev
```

## Environment Variables

### `.env.docker` (Docker Compose) — copy from `.env.docker.example`

| Variable                                             | Required | Description                                                       |
| ---------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `DB_PASSWORD`                                        | yes      | PostgreSQL password                                               |
| `JWT_SECRET`                                         | yes      | JWT signing secret (min 64 chars)                                 |
| `JWT_REFRESH_SECRET`                                 | yes      | Refresh-token secret (min 64 chars)                               |
| `KEY_ENCRYPTION_SECRET`                              | yes      | 64-hex-char key for encrypting per-user AI keys at rest           |
| `WEB_URL`                                            | local    | Frontend URL (CORS origin)                                        |
| `DATABASE_URL`                                       | opt      | Full connection string (takes precedence over individual DB vars) |
| `AI_PROVIDER`                                        | local    | AI provider (`ollama` or cloud)                                   |
| `DEFAULT_MODEL`                                      | local    | Default model name                                                |
| `OLLAMA_HOST`                                        | local    | Ollama endpoint (compose sets `http://ollama:11434`)              |
| `NESTJS_INTERNAL_API_KEY`                            | local    | Internal auth key between API and ai-service                      |
| `MAX_CONCURRENT_OLLAMA`                              | local    | Concurrent Ollama requests                                        |
| `DAILY_COST_BUDGET`                                  | local    | Daily AI spend budget (USD)                                       |
| `CLOUDINARY_*`                                       | opt      | Image storage credentials (Cloudinary)                            |
| `FINNHUB_API_KEY`                                    | opt      | Market-data/news provider key                                     |
| `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` | opt      | OAuth credentials + callback URLs                                 |

> Cloud AI keys are per-user (set in the Settings UI, encrypted in the DB) — no server-side key is required.

### `.env.dev` (dev launcher) — copy from `.env.dev.example`

| Variable           | Default | Description                                     |
| ------------------ | ------- | ----------------------------------------------- |
| `ENABLE_OLLAMA`    | `false` | Start local Ollama via the `ai` compose profile |
| `AUTO_PULL_OLLAMA` | unset   | Auto-pull the default Ollama model on launch    |

### API (`apps/api/.env`)

| Variable                                                                | Default                 | Description                          |
| ----------------------------------------------------------------------- | ----------------------- | ------------------------------------ |
| `DATABASE_URL`                                                          | _(unset)_               | Full connection string (prod)        |
| `DB_HOST`                                                               | `localhost`             | Database host                        |
| `DB_PORT`                                                               | `5432`                  | Database port                        |
| `DB_USER`                                                               | `postgres`              | Database user                        |
| `DB_PASSWORD`                                                           | —                       | Database password                    |
| `DB_NAME`                                                               | `tradezen`              | Database name                        |
| `JWT_SECRET`                                                            | —                       | JWT signing secret (min 64 chars)    |
| `JWT_REFRESH_SECRET`                                                    | —                       | Refresh-token secret (min 64 chars)  |
| `KEY_ENCRYPTION_SECRET`                                                 | —                       | Key-encryption secret (64 hex chars) |
| `PORT`                                                                  | `3001`                  | API listen port                      |
| `WEB_URL`                                                               | `http://localhost:3000` | Allowed CORS origin                  |
| `AI_SERVICE_URL`                                                        | `http://localhost:8000` | AI service base URL                  |
| `NODE_ENV`                                                              | `development`           | Environment mode                     |
| `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*`, `CLOUDINARY_*`, `FINNHUB_API_KEY` | —                       | Optional service credentials         |

### Web (`apps/web/.env`)

| Variable                       | Default                 | Description            |
| ------------------------------ | ----------------------- | ---------------------- |
| `NEXT_PUBLIC_API_URL`          | `http://localhost:3001` | Backend API URL        |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | —                       | Google OAuth client ID |

### AI service (`apps/ai-service/.env.example`)

| Variable                                                   | Default                       | Description                                                             |
| ---------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `AI_PROVIDER`                                              | `ollama`                      | Provider (ollama or cloud)                                              |
| `DEFAULT_MODEL`                                            | `qwen3:latest`                | Default model                                                           |
| `OLLAMA_HOST`                                              | `http://localhost:11434`      | Ollama endpoint                                                         |
| `CLOUD_BASE_URL` / `CLOUD_API_KEY` / `CLOUD_PROVIDER_NAME` | —                             | Optional OpenAI-compatible cloud provider (OpenRouter, NVIDIA, Groq, …) |
| `DATABASE_URL`                                             | _(unset)_                     | Postgres for RAG features (optional, graceful degradation)              |
| `EMBEDDING_*`                                              | `ollama` / `nomic-embed-text` | Embedding provider/model for retrieval                                  |
| `AUTH_SECRET`                                              | —                             | JWT verification secret (NestJS forwards JWT)                           |
| `NESTJS_INTERNAL_API_KEY`                                  | —                             | Internal auth key from the API                                          |
| `CHAT/RESEARCH/COACHING/EMBEDDING_RATE_LIMIT`              | —                             | Per-endpoint rate limits                                                |
| `MAX_*`                                                    | —                             | Concurrency, prompt size, tool-call limits                              |
| `ENABLE_RAG/MEMORY/TOOLS/STREAMING/CACHE`                  | `true`                        | Feature flags                                                           |
| `DAILY_COST_BUDGET`                                        | `20.0`                        | Daily AI spend budget                                                   |

> The AI service also reads per-request provider context forwarded by the API via `x-ai-provider`, `x-ai-provider-key`, and `x-ai-provider-base-url` headers.

## Docker Infrastructure

`infra/docker-compose.yml` provides the full local stack on the `tradezen-net` bridge network:

| Service      | Image / Build                | Ports             | Health Check       |
| ------------ | ---------------------------- | ----------------- | ------------------ |
| `postgres`   | `pgvector/pgvector:pg16`     | `127.0.0.1:5432`  | `pg_isready`       |
| `redis`      | `redis:7-alpine`             | `127.0.0.1:6379`  | `redis-cli ping`   |
| `api`        | `apps/api/Dockerfile`        | internal (3001)   | —                  |
| `web`        | `apps/web/Dockerfile`        | `127.0.0.1:3000`  | HTTP GET `/`       |
| `ai-service` | `apps/ai-service/Dockerfile` | internal (8000)   | HTTP GET `/health` |
| `ollama`     | `ollama/ollama:latest`       | `127.0.0.1:11434` | `ollama list`      |
| `backup`     | `alpine:latest`              | —                 | —                  |

Notes:

- `ollama` runs under the `ai` profile — only started when `ENABLE_OLLAMA=true`.
- `api` and `ai-service` expose no host ports by default (communicate over the internal network); `web` is the entry point.
- `backup` runs a cron-based Postgres dump into `../backups` (retention: 30 days) via `scripts/db/backup.sh`.
- Named volumes (`pgdata`, `redisdata`, `ollama_data`) and per-service CPU/memory limits are configured.
- Internal network uses static IPs (`172.28.1.x`); API connects to Postgres/Redis over the network, not `localhost`.

## AI Architecture

Two AI layers work together:

- **API-side LangChain/LangGraph** (`apps/api/src/ai`) — chat workflows, journal analysis, coaching triggers, formatting pipeline, reconciliation backstop. Uses `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`. BullMQ queues handle AI processing and nightly analytics snapshots.
- **Python FastAPI ai-service** (`apps/ai-service`) — LLM orchestration, streaming chat, coaching, research, journal analysis, and RAG (retrieval-augmented generation) over the knowledge base. Exposes:
  - `POST /chat`, `/chat/coach`, `/chat/research`, `/chat/journal` — streaming generation
  - `POST /ingest` — knowledge-base document ingestion
  - `POST /retrieval` — semantic retrieval
  - `/v1/...` — OpenAI-compatible endpoints + model listing
  - `/health`, `/traces` — health and trace observability
- **Per-user AI keys** — users configure their own provider/model in the Settings UI; keys are encrypted in the DB and forwarded per-request to the AI service. No server-side cloud key required.
- **Optional Ollama** — run a local model (`qwen3:4b` default) via the `ai` Docker Compose profile for fully local inference.

## API Surfaces

- **REST** — NestJS controllers for auth (register, login, refresh, OAuth, 2FA), trades (CRUD, analytics, CSV export/import), journals, tags, chat, knowledge, research, reports, watchlist, news, symbols, portfolio, and user settings. Representative endpoints: `POST /auth/login`, `GET /trades`, `GET /trades/analytics`, `GET /trades/export/csv`, `POST /chat`.
- **tRPC** — mounted at `/trpc` via Express middleware; web imports `api/trpc` for end-to-end typed calls.
- **WebSocket** — Socket.IO gateway (`apps/api/src/gateway`) for real-time notifications.
- **Swagger/OpenAPI** — at `/api/docs`, enabled only when `NODE_ENV !== 'production'`.

## Testing

| App            | Runner   | Command                         | Notes                                                                       |
| -------------- | -------- | ------------------------------- | --------------------------------------------------------------------------- |
| **API**        | Jest     | `bun run --filter=api test`     | Unit specs (`*.spec.ts` in `src/`); full suite needs Postgres/Redis running |
| **API (E2E)**  | Jest     | `bun run --filter=api test:e2e` | E2E specs (`test/`, config `test/jest-e2e.json`)                            |
| **Web**        | Bun test | `cd apps/web && bun run test`   | Unit tests for lib utilities                                                |
| **AI service** | pytest   | `cd apps/ai-service && pytest`  | Python test suite in `tests/` (configured via `[tool.pytest.ini_options]`)  |

> CI currently runs lint, typecheck, and build only — it does **not** run the test suites (see [CI/CD](#cicd)).

## CI/CD

Defined in `.github/workflows/ci.yml` (workflow name `CI`), triggered on push/PR to `main` and `develop`:

1. **changes** — `dorny/paths-filter` detects which apps changed (api vs web)
2. **lint** — `bun install --frozen-lockfile`, build `@tradezen/db`, ESLint (`bun run lint`), TypeScript check (`bun run check-types`)
3. **build** — `bun run --filter=api build` / `bun run --filter=web build`, skipped per changed-path filter

`deploy.yml` is **disabled** (manual trigger only) and kept as reference for self-hosted Docker Compose deploys. There is no automated deployment in CI.

### Branch workflow

- Work starts from `develop`
- Feature/task PRs target `develop`
- `main` is protected; changes reach it via a promotion PR (`develop` → `main`)

## Deployment

Deployment is currently **manual / self-hosted**, not automated by CI.

- **Docker Compose** — the supported local/container stack; `infra/docker-compose.yml` runs the full API + Web + AI service + Postgres + Redis stack.
- **Intended cloud targets** (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)) — Vercel for the Next.js frontend, Render/Railway for the API, and Neon for hosted PostgreSQL. These are documented options, not wired into CI.

## Gotchas

- **`bun run dev` auto-runs migrations** — `apps/api/src/main.ts` calls `runMigrations()` on startup. There is no separate migration step in local dev.
- **`@tradezen/db` must be built first** — the root `dev` script explicitly runs `bun run build --filter=@tradezen/db` before `turbo run dev`. The CI `lint`/`build` jobs do the same.
- **JWT secrets must be 64+ chars** — validated at startup in production (`main.ts`). Dev mode skips validation.
- **`bun.lock` is authoritative** — the package manager is `bun@1.3.13`; use `bun install` (CI uses `--frozen-lockfile`).
- **Swagger** at `/api/docs` — dev only, disabled in production.
- **tRPC** — API mounts `/trpc` via Express middleware; web imports `api/trpc` for end-to-end types.
- **Per-user AI keys** — there is no server-side AI key; keys are set per-user in the Settings UI and encrypted in the DB (`KEY_ENCRYPTION_SECRET`).
- **API tests need live services** — the full Jest suite and E2E suite require PostgreSQL and Redis; targeted specs can run without them.

## Documentation

| File                                                                          | Purpose                          |
| ----------------------------------------------------------------------------- | -------------------------------- |
| [Architecture.md](docs/Architecture.md) + [architecture/](docs/architecture/) | System design and design docs    |
| [decisions/](docs/decisions/)                                                 | Architecture Decision Records    |
| [SECURITY.md](docs/SECURITY.md)                                               | Security hardening guide         |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)                                           | Deployment options               |
| [DEV_QUICKSTART.md](docs/DEV_QUICKSTART.md)                                   | 5-minute developer onboarding    |
| [DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)                             | Development guide                |
| [AUDIT-REPORT.md](docs/AUDIT-REPORT.md)                                       | Infrastructure audit results     |
| [planning/](docs/planning/) and [specs/](docs/specs/)                         | Planning docs and specifications |

## License

Licensed under the [MIT License](./LICENSE).
