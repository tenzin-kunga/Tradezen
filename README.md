# TradeZen — Carbon Ledger

A professional trading journal web app with a Glass Depth design system. Track trades, analyze performance, maintain a daily journal, and tag trades for organization.

**Live:** [tradezen-tampered-sins-projects.vercel.app](https://tradezen-tampered-sins-projects.vercel.app)

[![CI/CD Pipeline](https://github.com/tampered-sin/Tradezen/actions/workflows/ci.yml/badge.svg)](https://github.com/tampered-sin/Tradezen/actions/workflows/ci.yml)

## Tech Stack

| Layer          | Technology                                                       |
| -------------- | ---------------------------------------------------------------- |
| **Frontend**   | Next.js 14.2.25, React 18.2.0, Tailwind CSS v3.4, Recharts       |
| **Backend**    | NestJS 11, PostgreSQL (raw `pg`), Passport JWT, Redis            |
| **Database**   | PostgreSQL 16-alpine (Docker) / Neon (production)                |
| **Monorepo**   | Bun workspaces (Turborepo)                                       |
| **Deployment** | Vercel (web) + Render (API) + Neon (DB) / Docker Compose (local) |

## Features

- **Authentication** — JWT access tokens + HTTP-only refresh cookies
- **Trade Logging** — Full CRUD with symbol, direction, entry/exit, lot size, stop loss, take profit, strategy, notes
- **Behavioral Tracking** — FOMO check, trend alignment, vengeance trade flags
- **Analytics Dashboard** — Win rate, profit factor, expectancy, max drawdown, Sharpe ratio, day-of-week performance, equity curve
- **Daily Journal** — Pre/post market notes, mood tracking, market conditions, lessons learned, streak tracking
- **Tags** — Color-coded tags with categories, attach to trades for filtering
- **CSV Export** — Export trades to CSV
- **AI Chat** — OpenRouter integration for trade analysis assistance
- **Glass Depth UI** — Modern glass morphism design with cyan/emerald accents
- **Swagger Docs** — Interactive API docs at `/api/docs` (dev only)

## Project Structure

```
tradezen/
├── apps/
│   ├── api/          # NestJS backend (auth, trades, journals, tags, chat)
│   └── web/          # Next.js frontend (dashboard, trade log, analytics, journal, calendar)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   ├── eslint-config/# ESLint configs
│   └── typescript-config/ # TSConfig presets
├── docs/             # Project documentation
├── infra/            # Infrastructure configs (Docker, Render)
├── scripts/          # Utility scripts (dev, db, security, monitoring)
├── .githooks/        # Git hooks (pre-commit secret scanning)
└── .env.docker.example # Environment template
```

## Getting Started

### Prerequisites

- **Bun 1.3+** (recommended) or Node.js 20+
- Docker Desktop (for local PostgreSQL + Redis)

### Quick Start (One-Click)

```sh
scripts/dev/start.bat
```

This script handles:

1. Docker Desktop startup (if not running)
2. Cleaning stale containers
3. Starting PostgreSQL + Redis with health checks
4. Launching API (`localhost:3001`) and Web (`localhost:3000`) in separate windows

### Manual Setup

```sh
# Clone and install
git clone https://github.com/tampered-sin/Tradezen.git
cd Tradezen
bun install

# Configure environment
cp .env.docker.example .env.docker
# Edit .env.docker with your values

# Start infrastructure
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d postgres redis

# Start both apps
bun run dev
```

### Environment Variables

**Docker** (`.env.docker`) — copy from `.env.docker.example`:

| Variable             | Default                 | Description                         |
| -------------------- | ----------------------- | ----------------------------------- |
| `DB_PASSWORD`        | _(required)_            | PostgreSQL password                 |
| `JWT_SECRET`         | _(required)_            | JWT signing secret (min 64 chars)   |
| `JWT_REFRESH_SECRET` | _(required)_            | Refresh token secret (min 64 chars) |
| `OPENROUTER_API_KEY` | _(optional)_            | OpenRouter API key for AI chat      |
| `WEB_URL`            | `http://localhost:3000` | Frontend URL (CORS origin)          |

**API** (`apps/api/.env`) — development defaults:

| Variable   | Default       | Description      |
| ---------- | ------------- | ---------------- |
| `DB_HOST`  | `localhost`   | Database host    |
| `DB_PORT`  | `5432`        | Database port    |
| `DB_USER`  | `postgres`    | Database user    |
| `DB_NAME`  | `tradezen`    | Database name    |
| `NODE_ENV` | `development` | Environment mode |

**Web** (`apps/web/`):

| Variable              | Default                 | Description     |
| --------------------- | ----------------------- | --------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |

## Docker Infrastructure

The `infra/docker-compose.yml` provides a production-ready local stack:

| Service    | Image              | Port | Health Check     |
| ---------- | ------------------ | ---- | ---------------- |
| `postgres` | postgres:16-alpine | 5432 | `pg_isready`     |
| `redis`    | redis:7-alpine     | 6379 | `redis-cli ping` |
| `api`      | Built from source  | 3001 | HTTP endpoint    |
| `web`      | Built from source  | 3000 | HTTP endpoint    |

**Features:**

- Custom bridge network (`tradezen-net`) with static IPs
- Named volumes for data persistence (`pgdata`, `redisdata`)
- Resource limits (CPU/memory) per service
- Non-root container users
- Multi-stage builds with security hardening

## Security

- **JWT Validation**: Secrets validated at startup, no fallback defaults
- **Container Hardening**: Non-root users, minimal base images, `dumb-init` signal handling
- **Secret Management**: `.env.docker.example` template, rotation scripts, pre-commit hooks
- **Production Mode**: Swagger disabled, env validation enforced
- **CI/CD Security**: Trivy scanning, `bun pm audit`, secret detection

See [SECURITY.md](docs/SECURITY.md) for full hardening guide.

## API Endpoints

| Method   | Endpoint               | Description                 |
| -------- | ---------------------- | --------------------------- |
| `POST`   | `/auth/register`       | Register new user           |
| `POST`   | `/auth/login`          | Login                       |
| `POST`   | `/auth/refresh`        | Refresh access token        |
| `POST`   | `/auth/logout`         | Logout                      |
| `GET`    | `/auth/me`             | Get current user            |
| `POST`   | `/trades`              | Create trade                |
| `GET`    | `/trades`              | List trades (paginated)     |
| `GET`    | `/trades/analytics`    | Trade analytics             |
| `GET`    | `/trades/export/csv`   | Export CSV                  |
| `GET`    | `/trades/:id`          | Get trade                   |
| `PUT`    | `/trades/:id`          | Update trade                |
| `DELETE` | `/trades/:id`          | Delete trade                |
| `POST`   | `/journals`            | Create/upsert journal entry |
| `GET`    | `/journals`            | List journal entries        |
| `GET`    | `/journals/streak`     | Get journal streak stats    |
| `GET`    | `/journals/date/:date` | Get entry by date           |
| `POST`   | `/tags`                | Create tag                  |
| `GET`    | `/tags`                | List tags                   |
| `PUT`    | `/tags/:id`            | Update tag                  |
| `DELETE` | `/tags/:id`            | Delete tag                  |
| `POST`   | `/chat`                | AI chat message             |

Full interactive docs at `/api/docs` (development only).

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Security Audit** — `bun pm audit`, Trivy filesystem scan, secret detection
2. **Lint & Type Check** — ESLint + TypeScript validation
3. **Unit Tests** — Jest test suite
4. **Build & Deploy** — Docker Buildx with caching, auto-deploy on `main`

## Documentation

| File                                        | Purpose                       |
| ------------------------------------------- | ----------------------------- |
| [SECURITY.md](docs/SECURITY.md)             | Security hardening guide      |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)         | Production deployment steps   |
| [DEV_QUICKSTART.md](docs/DEV_QUICKSTART.md) | 5-minute developer onboarding |
| [AUDIT-REPORT.md](docs/AUDIT-REPORT.md)     | Infrastructure audit results  |
| [decisions/](docs/decisions/)               | Architecture Decision Records |

## Deployment

| Service                      | Purpose               |
| ---------------------------- | --------------------- |
| [Vercel](https://vercel.com) | Frontend (`apps/web`) |
| [Render](https://render.com) | Backend (`apps/api`)  |
| [Neon](https://neon.tech)    | PostgreSQL database   |

Auto-deploys on push to `main`.

## CI/CD Pipeline

Defined in `.github/workflows/ci.yml`. Two environments, gated by branch:

| Branch    | Deploys to                                                     | Trigger                                                |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| `develop` | `deploy-staging` env (Render preview service + Vercel preview) | auto on push                                           |
| `main`    | `deploy-prod` env (Render + Vercel)                            | auto on push, requires approval via GitHub Environment |

> The env names `deploy-staging` / `deploy-prod` are scoped away from Vercel's auto-created `Production`/`Preview` envs to avoid settings collisions.

### Pipeline jobs

1. **changes** — `dorny/paths-filter` to detect which apps changed; downstream jobs skip when irrelevant
2. **security** — `bun pm audit`, Trivy filesystem scan (CRITICAL/HIGH), hardcoded-secret grep
3. **lint** — ESLint + TypeScript type check
4. **test** — unit tests with Postgres+Redis sidecars, coverage → Codecov
5. **e2e** — full NestJS E2E suite against Postgres+Redis
6. **build-api / build-web** — multi-arch (amd64+arm64) Docker images pushed to `ghcr.io/$repo/{api,web}`, Trivy image scan on API
7. **deploy-staging** — Render API + Vercel preview; polls deploy status, then smoke-tests `/health` and web URL
8. **deploy-prod** — same, on Render prod + Vercel prod; **auto-rollback** via Render API if smoke tests fail

### Concurrency

- `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` — cancels stale runs on PRs and develop, never on main
- `concurrency: deploy-prod` and `concurrency: deploy-staging` — only one deploy runs at a time per env

### Required GitHub Secrets

Set in repo **Settings → Secrets and variables → Actions**:

| Secret                                                 | Scope                | Purpose                                                           |
| ------------------------------------------------------ | -------------------- | ----------------------------------------------------------------- |
| `GITHUB_TOKEN`                                         | auto                 | GHCR push, SARIF upload                                           |
| `CODECOV_TOKEN`                                        | repo                 | upload coverage on main                                           |
| `RENDER_API_KEY`                                       | both envs            | Render API authentication                                         |
| `RENDER_STAGING_SERVICE_ID`                            | `deploy-staging` env | staging Render service                                            |
| `STAGING_API_URL`                                      | `deploy-staging` env | e.g. `https://api-staging.tradezen.app` — for staging smoke tests |
| `RENDER_SERVICE_ID`                                    | `deploy-prod` env    | production Render service                                         |
| `PRODUCTION_API_URL`                                   | `deploy-prod` env    | e.g. `https://api.tradezen.app` — for prod smoke tests            |
| `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` | both envs            | Vercel deploy                                                     |

> **Required reviewer on `deploy-prod`**: must be set via the GitHub web UI (Settings → Environments → deploy-prod → Required reviewers). GitHub's API doesn't expose a way to enable the Required Reviewers rule programmatically.

### Local validation

```bash
# Install actionlint to check workflow syntax locally
curl -fsSL https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash | bash
./actionlint .github/workflows/*.yml
```

## License

UNLICENSED — Private project.
