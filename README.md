# TradeZen — Carbon Ledger

A professional trading journal web app with a dark hacker/terminal aesthetic. Track trades, analyze performance, maintain a daily journal, and tag trades for organization.

**Live:** [tradezen-web.vercel.app](https://tradezen-web.vercel.app)

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, Recharts |
| **Backend** | NestJS 11, PostgreSQL (raw `pg`), Passport JWT |
| **Database** | PostgreSQL (Neon serverless) |
| **Monorepo** | Turborepo with npm workspaces |
| **Deployment** | Vercel (web) + Render (API) + Neon (DB) |

## Features

- **Authentication** — JWT access tokens + HTTP-only refresh cookies
- **Trade Logging** — Full CRUD with symbol, direction, entry/exit, lot size, stop loss, take profit, strategy, notes
- **Behavioral Tracking** — FOMO check, trend alignment, vengeance trade flags
- **Analytics Dashboard** — Win rate, profit factor, expectancy, max drawdown, Sharpe ratio, day-of-week performance, equity curve
- **Daily Journal** — Pre/post market notes, mood tracking, market conditions, lessons learned, streak tracking
- **Tags** — Color-coded tags with categories, attach to trades for filtering
- **CSV Export** — Export trades to CSV
- **Swagger Docs** — Interactive API docs at `/api/docs`

## Project Structure

```
apps/
  api/          — NestJS backend (auth, trades, journals, tags)
  web/          — Next.js frontend (dashboard, trade log, analytics, journal)
packages/
  types/        — Shared TypeScript types
  ui/           — Shared UI components
  eslint-config/— ESLint configs
  typescript-config/ — TSConfig presets
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL + Redis)

### Local Development

```sh
# Clone and install
git clone https://github.com/tampered-sin/Tradezen.git
cd Tradezen
npm install

# Start database
docker-compose up -d

# Start both apps (API on :3001, Web on :3000)
npx turbo dev
```

Or use the batch script:

```sh
start.bat
```

### Environment Variables

**API** (`apps/api/`) — all have sensible defaults for local dev:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Full Postgres connection string (overrides individual DB vars) |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `pass` | Database password |
| `DB_NAME` | `tradezen` | Database name |
| `JWT_SECRET` | `tradezen-dev-secret` | Secret for signing JWTs |
| `WEB_URL` | `http://localhost:3000` | Frontend URL (CORS origin) |
| `PORT` | `3001` | API server port |

**Web** (`apps/web/`):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/trades` | Create trade |
| `GET` | `/trades` | List trades (paginated) |
| `GET` | `/trades/analytics` | Trade analytics |
| `GET` | `/trades/export/csv` | Export CSV |
| `GET` | `/trades/:id` | Get trade |
| `PUT` | `/trades/:id` | Update trade |
| `DELETE` | `/trades/:id` | Delete trade |
| `POST` | `/journals` | Create/upsert journal entry |
| `GET` | `/journals` | List journal entries |
| `GET` | `/journals/streak` | Get journal streak stats |
| `GET` | `/journals/date/:date` | Get entry by date |
| `POST` | `/tags` | Create tag |
| `GET` | `/tags` | List tags |
| `PUT` | `/tags/:id` | Update tag |
| `DELETE` | `/tags/:id` | Delete tag |

Full interactive docs at `/api/docs` (Swagger).

## Deployment

| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com) | Frontend (`apps/web`) |
| [Render](https://render.com) | Backend (`apps/api`) |
| [Neon](https://neon.tech) | PostgreSQL database |

Auto-deploys on push to `main`.

## License

UNLICENSED — Private project.
