# TradeZen — Complete Project Rundown

A professional trading journal web application with a dark hacker/terminal aesthetic. Track trades, analyze performance, maintain daily journals, and organize trades with tags.

**Live:** [tradezen-web.vercel.app](https://tradezen-web.vercel.app)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Key Features](#key-features)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Environment Variables](#environment-variables)
9. [Setup & Local Development](#setup--local-development)
10. [Development Workflow](#development-workflow)
11. [Deployment](#deployment)
12. [Monorepo Management](#monorepo-management)
13. [Common Tasks](#common-tasks)
14. [Known Limitations & Future Work](#known-limitations--future-work)

---

## Project Overview

TradeZen is a full-stack trading journal application designed for traders to:

- **Log trades** with comprehensive details (symbol, direction, entry/exit prices, lot size, stop loss, take profit, strategy, notes)
- **Track behavior** with FOMO checks, trend alignment, and vengeance trade flags
- **Analyze performance** with advanced metrics (win rate, profit factor, expectancy, max drawdown, Sharpe ratio, day-of-week analysis)
- **Maintain daily journals** with pre/post-market notes, mood tracking, market conditions, and lessons learned
- **Organize trades** with color-coded, customizable tags
- **Export data** to CSV for further analysis

The app emphasizes:
- **Security**: JWT authentication with HTTP-only refresh cookies
- **Performance**: Optimized database queries with pagination and indexing
- **Developer experience**: Monorepo structure with shared types, ESLint configs, and UI components
- **Professional aesthetics**: Dark terminal-inspired UI with Tailwind CSS v4

---

## Tech Stack

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | **Next.js 16** with App Router |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS v4** |
| Charts | **Recharts 2** |
| React | **React 19** |
| Package Manager | **Bun 1.3.13** |

### Backend

| Component | Technology |
|-----------|------------|
| Framework | **NestJS 11** |
| Language | **TypeScript 5** |
| Authentication | **JWT (Passport.js)** |
| Database Driver | **pg** (node-postgres) |
| Input Validation | **class-validator** & **class-transformer** |
| Documentation | **Swagger/OpenAPI** |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Database | **PostgreSQL** (Neon serverless in production) |
| Cache | **Redis** (optional, for future real-time features) |
| Monorepo | **Turborepo** with **Bun workspaces** |
| Deployment (Web) | **Vercel** |
| Deployment (API) | **Render** or **Railway** |
| Deployment (Database) | **Neon** (PostgreSQL serverless) |
| Containerization | **Docker** + **Docker Compose** |

### Developer Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Jest** | Testing framework |
| **Swagger UI** | API documentation |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│              (React Components, Pages, API Client)           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (NestJS)                           │
│  (Controllers, Services, Middleware, Guards, Interceptors)  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐    ┌─────────────┐   ┌────────┐
   │PostgreSQL│    │   Redis     │   │  APIs  │
   │ (Neon)  │    │  (optional) │   │ (Ext.) │
   └─────────┘    └─────────────┘   └────────┘
```

### Data Flow

1. **Frontend** → Sends HTTP requests to backend API
2. **Backend** → Routes requests through NestJS modules (Auth, Trades, Journals, Tags)
3. **Services** → Execute business logic (validation, calculations)
4. **Database** → Persists data in PostgreSQL
5. **Response** → Backend sends JSON back to frontend with auth tokens in HTTP-only cookies

### Authentication Flow

1. User registers/logs in via `/auth/register` or `/auth/login`
2. Backend returns **access token** (15 min) + **HTTP-only refresh token cookie** (7 days)
3. Frontend stores access token in memory (never localStorage)
4. All API requests include `Authorization: Bearer <token>` header
5. When access token expires, frontend uses refresh cookie to get a new one
6. All data is scoped by `user_id` at the database level

---

## Project Structure

```
tradezen/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts               # App entry point
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── app.controller.ts     # Root routes
│   │   │   ├── app.service.ts        # Root service
│   │   │   ├── db.ts                 # Database connection
│   │   │   ├── migrate.ts            # Migration runner
│   │   │   ├── auth/                 # Authentication module
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   ├── public.decorator.ts
│   │   │   │   └── dto/
│   │   │   ├── trades/               # Trades module
│   │   │   ├── journals/             # Journals module
│   │   │   ├── tags/                 # Tags module
│   │   │   ├── chat/                 # Chat module
│   │   │   ├── common/               # Shared filters/interceptors
│   │   │   │   ├── filters/
│   │   │   │   └── interceptors/
│   │   ├── migrations/               # Database migrations (numbered SQL files)
│   │   │   ├── 001_initial_trades.sql
│   │   │   ├── 002_users_table.sql
│   │   │   ├── 003_trades_add_user_id.sql
│   │   │   ├── 004_journals_table.sql
│   │   │   ├── 005_tags_tables.sql
│   │   │   ├── 006_trades_add_trade_date.sql
│   │   │   ├── 007_user_settings.sql
│   │   │   └── 008_trades_add_commission.sql
│   │   ├── Dockerfile               # Production Docker image
│   │   ├── docker-compose.yml       # Local dev services
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nest-cli.json
│   │
│   └── web/                          # Next.js Frontend
│       ├── app/
│       │   ├── layout.tsx            # Root layout wrapper
│       │   ├── page.tsx              # Home page (dashboard)
│       │   ├── globals.css           # Global styles
│       │   ├── add-trade/            # Add trade page
│       │   ├── analytics/            # Analytics dashboard
│       │   ├── journal/              # Daily journal
│       │   ├── login/                # Login page
│       │   ├── register/             # Registration page
│       │   ├── settings/             # User settings
│       │   └── trades/               # Trades log
│       ├── components/
│       │   ├── AppShell.tsx          # Main app wrapper
│       │   ├── ChatPanel.tsx         # Chat interface
│       │   ├── EquityChart.tsx       # Equity curve visualization
│       │   ├── Sidebar.tsx           # Navigation sidebar
│       │   ├── StatCard.tsx          # Stat card component
│       │   └── ...                   # Other components
│       ├── lib/
│       │   ├── api.ts                # API client utilities
│       │   ├── auth-context.tsx      # Auth state management
│       │   └── theme-context.tsx     # Theme management
│       ├── public/                   # Static assets
│       ├── package.json
│       ├── tsconfig.json
│       └── next.config.ts
│
├── packages/                         # Shared workspace packages
│   ├── types/                        # Shared TypeScript types
│   │   ├── index.ts                  # Type definitions
│   │   └── package.json
│   ├── ui/                           # Shared UI components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── code.tsx
│   │   │   └── ...
│   │   └── package.json
│   ├── eslint-config/                # Shared ESLint configs
│   │   ├── base.js
│   │   ├── next.js
│   │   ├── react-internal.js
│   │   └── package.json
│   └── typescript-config/            # Shared TypeScript configs
│       ├── base.json
│       ├── nextjs.json
│       ├── react-library.json
│       └── package.json
│
├── docker-compose.yml                # Local PostgreSQL + Redis
├── turbo.json                        # Monorepo config
├── package.json                      # Root workspace
├── tsconfig.json                     # Root TypeScript config
├── start.bat                         # Windows startup script
├── PLAN.md                           # Development roadmap
├── tradezen_architecture.md          # Architecture deep-dive
├── README.md                         # Quick start guide
└── PROJECT_RUNDOWN.md               # This file
```

---

## Key Features

### 1. **Trade Logging & Management**

- **Create**: Log a trade with symbol, direction (buy/sell), entry, exit, lot size, stop loss, take profit, strategy, and notes
- **Read**: View all trades in a paginated list with filtering and sorting
- **Update**: Edit existing trades, automatically recalculates PnL on price changes
- **Delete**: Remove trades from the journal
- **Fields tracked**:
  - Symbol (e.g., EURUSD, AAPL)
  - Direction (Buy/Sell)
  - Entry Price & Exit Price
  - Lot Size
  - Stop Loss & Take Profit
  - Profit/Loss calculation
  - Strategy used
  - Custom notes

### 2. **Behavioral Tracking**

Trades capture psychological patterns:
- **FOMO Check**: Did FOMO influence this trade?
- **Trend Alignment**: Was trade aligned with overall trend?
- **Vengeance Trade**: Was this a revenge trade after a loss?

### 3. **Advanced Analytics Dashboard**

Real-time calculated metrics:
- **Win Rate**: % of profitable trades
- **Profit Factor**: Gross profit / Gross loss
- **Expectancy**: Average profit per trade
- **Max Drawdown**: Largest peak-to-trough decline
- **Sharpe Ratio**: Risk-adjusted returns
- **Equity Curve**: Visual line chart of account balance over time
- **Day-of-Week Performance**: Win rate breakdown by day
- **Monthly Summary**: P&L by month

### 4. **Daily Journal**

Qualitative trade notes:
- Pre-market analysis and expectations
- Post-market reflections
- Mood tracking (confidence, discipline, patience)
- Market conditions (trending, sideways, volatile)
- Lessons learned
- Streak tracking (consecutive winning/losing days)

### 5. **Tags & Organization**

- Create custom color-coded tags (e.g., "Scalp", "Swing", "News Trade")
- Attach multiple tags to each trade
- Filter trades by tag
- Category-based tag organization

### 6. **Data Export**

- Export trades to CSV for external analysis
- Compatible with Excel, Google Sheets, etc.

### 7. **Authentication & Security**

- User registration and login
- JWT access tokens (15 minutes expiry)
- HTTP-only refresh token cookies (7 days expiry)
- Password hashing with bcrypt
- All data scoped per user at database level
- Protected routes and endpoints

### 8. **API Documentation**

- Interactive Swagger UI available at `/api/docs`
- Full OpenAPI specifications
- Real-time documentation of all endpoints

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Trades Table

```sql
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price DECIMAL(20,6) NOT NULL,
  exit_price DECIMAL(20,6),
  lot_size DECIMAL(20,6) NOT NULL,
  stop_loss DECIMAL(20,6),
  take_profit DECIMAL(20,6),
  profit_loss DECIMAL(20,6) GENERATED ALWAYS AS
    ((exit_price - entry_price) * lot_size * CASE WHEN direction='buy' THEN 1 ELSE -1 END) STORED,
  strategy TEXT,
  notes TEXT,
  fomo_check BOOLEAN DEFAULT FALSE,
  trend_aligned BOOLEAN DEFAULT FALSE,
  vengeance_trade BOOLEAN DEFAULT FALSE,
  trade_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trades_user_id_created_at ON trades(user_id, created_at);
CREATE INDEX idx_trades_user_id_symbol ON trades(user_id, symbol);
CREATE INDEX idx_trades_user_id_strategy ON trades(user_id, strategy);
```

### Journals Table

```sql
CREATE TABLE journals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  pre_market_notes TEXT,
  post_market_notes TEXT,
  mood TEXT,
  market_conditions TEXT,
  lessons_learned TEXT,
  winning_streak INTEGER DEFAULT 0,
  losing_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);
```

### Tags Table

```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE trade_tags (
  trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, tag_id)
);
```

### User Settings Table

```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Schema Migrations Tracking

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

Base URL: `http://localhost:3001` (local) or `https://api.tradezen.com` (production)

### Authentication Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Create new user | `{ email, username, password }` |
| `POST` | `/auth/login` | Login user | `{ email, password }` |
| `POST` | `/auth/refresh` | Get new access token | — |
| `POST` | `/auth/logout` | Logout user | — |
| `GET` | `/auth/me` | Get current user info | — |

### Trade Endpoints

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/trades` | List all trades | `page`, `limit`, `sort`, `order`, `symbol`, `direction`, `strategy`, `from`, `to` |
| `GET` | `/trades/:id` | Get single trade | — |
| `POST` | `/trades` | Create new trade | Body: `CreateTradeDto` |
| `PUT` | `/trades/:id` | Update trade | Body: `UpdateTradeDto` |
| `DELETE` | `/trades/:id` | Delete trade | — |
| `GET` | `/trades/export/csv` | Export trades to CSV | — |
| `POST` | `/trades/import/csv` | Import trades from CSV | File upload |
| `GET` | `/trades/daily-pnl` | Daily P&L summary | — |
| `GET` | `/trades/analytics` | Analytics metrics | — |

### Journal Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/journals` | List all journal entries |
| `GET` | `/journals/:date` | Get journal for specific date |
| `POST` | `/journals` | Create journal entry |
| `PUT` | `/journals/:date` | Update journal entry |
| `DELETE` | `/journals/:date` | Delete journal entry |

### Tags Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tags` | List all tags |
| `POST` | `/tags` | Create new tag |
| `PUT` | `/tags/:id` | Update tag |
| `DELETE` | `/tags/:id` | Delete tag |
| `POST` | `/tags/:id/trades/:tradeId` | Attach tag to trade |
| `DELETE` | `/tags/:id/trades/:tradeId` | Remove tag from trade |

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Send chat message |
| `GET` | `/chat/history` | Get chat history |

### API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/docs` | Swagger UI (interactive documentation) |
| `GET` | `/api/docs-json` | OpenAPI JSON specification |

---

## Environment Variables

### Backend (`apps/api/.env`)

All have sensible defaults for local development:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the API server runs on |
| `DATABASE_URL` | — | Full PostgreSQL connection string (overrides individual DB vars) |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `pass` | Database password |
| `DB_NAME` | `tradezen` | Database name |
| `JWT_SECRET` | `tradezen-dev-secret` | Secret for signing JWT tokens |
| `JWT_EXPIRY` | `15m` | Access token expiry time |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token expiry time |
| `WEB_URL` | `http://localhost:3000` | Frontend URL (for CORS) |
| `NODE_ENV` | `development` | Environment (development/production) |

### Frontend (`apps/web/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |

### Production Environment Variables

**Vercel (Web):**
- `NEXT_PUBLIC_API_URL` → Production API URL

**Render/Railway (API):**
- `DATABASE_URL` → Neon PostgreSQL connection string
- `JWT_SECRET` → Strong random secret (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `WEB_URL` → Production frontend URL (e.g., `https://tradezen-web.vercel.app`)
- `NODE_ENV` → `production`

---

## Setup & Local Development

### Prerequisites

- **Node.js**: 20+ (check with `node --version`)
- **Bun**: 1.3+ (check with `bun --version`)
- **Docker**: Required for PostgreSQL + Redis (download from [docker.com](https://www.docker.com))
- **Git**: For version control

### Quick Start

#### 1. Clone the Repository

```bash
git clone https://github.com/tampered-sin/Tradezen.git
cd Tradezen
```

#### 2. Install Dependencies

```bash
bun install
```

This installs packages for the root, all `apps/`, and all `packages/` using Bun workspaces.

#### 3. Start Local Services

**Option A: Using Docker Compose (Recommended)**

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432` (user: `postgres`, password: `pass`, db: `tradezen`)
- Redis on `localhost:6379` (optional, for future real-time features)

**Option B: Using Windows Batch Script**

```bash
start.bat
```

This is a wrapper around `docker-compose up -d` for Windows users.

#### 4. Run Migrations

```bash
bun run migrate
```

This runs numbered migration files from `apps/api/migrations/` to initialize the database schema.

#### 5. Start Development Servers

**Option A: Both apps (API + Web) together**

```bash
bun run dev
```

Turbo runs both in parallel:
- **API**: Watches `apps/api/src/` → `http://localhost:3001`
- **Web**: Watches `apps/web/app/` → `http://localhost:3000`

**Option B: Individual apps**

```bash
# Terminal 1: API
cd apps/api && bun run start:dev

# Terminal 2: Web
cd apps/web && bun run dev
```

#### 6. Access the Application

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

#### 7. Test Authentication

- Go to [http://localhost:3000/register](http://localhost:3000/register)
- Create a test account (any email/password)
- Log in and test the trade logging interface

### Stopping Services

```bash
# Stop Docker services
docker-compose down

# Or (if using start.bat)
docker-compose down
```

---

## Development Workflow

### Project Organization

This is a **monorepo** using **Turborepo** and **Bun workspaces**. Shared code lives in `packages/`, apps in `apps/`.

### Working with the Monorepo

**Running scripts across all packages:**

```bash
bun run build        # Build all packages
bun run dev          # Start dev mode for all
bun run lint         # Lint all packages
bun run format       # Format all files with Prettier
bun run check-types  # TypeScript check across all
```

**Working on a specific app:**

```bash
cd apps/api
bun run start:dev    # Start API in watch mode

cd apps/web
bun run dev          # Start web in dev mode
```

### Code Standards

#### ESLint

Lint your code:

```bash
bun run lint         # Lint all packages
cd apps/api && bun run lint         # Lint just API
cd apps/web && bun run lint         # Lint just web
```

#### Prettier

Format your code:

```bash
bun run format       # Format all files
```

#### TypeScript

Type check all packages:

```bash
bun run check-types
```

### Testing

#### Unit Tests (API)

```bash
cd apps/api
bun run test          # Run tests once
bun run test:watch    # Watch mode
bun run test:cov      # With coverage
bun run test:e2e      # End-to-end tests
```

### Making Changes

1. **Create a branch** for your feature/fix
2. **Make changes** in relevant files
3. **Run tests** and lint checks: `bun run lint && bun run check-types`
4. **Commit** with clear, descriptive message
5. **Push** and create a pull request

### Adding Dependencies

**To a specific app:**

```bash
cd apps/api
bun install package-name
```

**To shared packages:**

```bash
cd packages/types
bun install package-name
```

**To root (dev dependencies only):**

```bash
bun install --save-dev package-name
```

---

## Deployment

### Frontend Deployment (Vercel)

The frontend is automatically deployed to **Vercel** on every push to `main` branch.

**Manual deployment:**

```bash
cd apps/web
bun run build
bun run start
```

**Environment variables needed on Vercel:**
- `NEXT_PUBLIC_API_URL` → Production API URL

### Backend Deployment (Render or Railway)

The backend runs in Docker on **Render** or **Railway**.

**Build Docker image:**

```bash
cd apps/api
docker build -t tradezen-api .
```

**Run locally:**

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host/db" \
  -e JWT_SECRET="your-secret-key" \
  tradezen-api
```

**Environment variables needed:**
- `DATABASE_URL` → Neon PostgreSQL connection string
- `JWT_SECRET` → Strong random secret
- `WEB_URL` → Production frontend URL
- `NODE_ENV` → `production`

**Migrations run automatically** on startup via `db.ts` migration runner.

### Database Deployment (Neon)

PostgreSQL is hosted on **Neon** (serverless, cold-start friendly).

**To migrate production database:**

```bash
export DATABASE_URL="postgresql://..."
bun run migrate
```

### CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:
1. Install dependencies
2. Run linting
3. Type-check TypeScript
4. Run tests
5. Build production bundles

---

## Monorepo Management

### Workspace Structure

```
tradezen/
├── apps/                    # Deployable applications
│   ├── api/                # NestJS backend
│   └── web/                # Next.js frontend
├── packages/               # Shared/internal packages
│   ├── types/             # Shared TypeScript types
│   ├── ui/                # Shared React components
│   ├── eslint-config/     # Shared ESLint configs
│   └── typescript-config/ # Shared TypeScript configs
└── turbo.json             # Monorepo settings
```

### Workspaces Configuration

In root `package.json`:

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

This means:
- All subdirectories in `apps/` are workspaces
- All subdirectories in `packages/` are workspaces
- Dependencies are hoisted to root `node_modules/`
- Cross-workspace imports work directly

### Using Shared Packages

**From API (import shared types):**

```typescript
import { Trade } from '@repo/types';
```

**From Web (import shared UI components):**

```typescript
import { Button, Card } from '@repo/ui';
```

**From Web (use shared ESLint config):**

```javascript
// eslint.config.mjs
import baseConfig from '@repo/eslint-config/base';
export default [...baseConfig];
```

### Workspace Dependencies

In `apps/web/package.json`:

```json
{
  "devDependencies": {
    "@repo/eslint-config": "*",
    "@repo/typescript-config": "*"
  }
}
```

The `"*"` means "use whatever version is in the workspace".

---

## Common Tasks

### Adding a New Feature

1. **Create a new module in the API:**

```bash
cd apps/api/src
mkdir my-feature
touch my-feature/my-feature.module.ts
touch my-feature/my-feature.service.ts
touch my-feature/my-feature.controller.ts
```

2. **Create the module:**

```typescript
// apps/api/src/my-feature/my-feature.module.ts
import { Module } from '@nestjs/common';
import { MyFeatureService } from './my-feature.service';
import { MyFeatureController } from './my-feature.controller';

@Module({
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
})
export class MyFeatureModule {}
```

3. **Add it to `app.module.ts`:**

```typescript
import { MyFeatureModule } from './my-feature/my-feature.module';

@Module({
  imports: [
    AuthModule,
    TradesModule,
    MyFeatureModule,  // Add here
  ],
})
export class AppModule {}
```

### Adding a Database Migration

1. Create a numbered SQL file in `apps/api/migrations/`:

```bash
touch apps/api/migrations/009_my_new_table.sql
```

2. Write your SQL:

```sql
CREATE TABLE my_table (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

3. Run migrations:

```bash
bun run migrate
```

### Creating a New API Endpoint

1. Add a method to the service:

```typescript
// apps/api/src/trades/trades.service.ts
async getTradesByStrategy(userId: string, strategy: string) {
  return await this.db.query(
    'SELECT * FROM trades WHERE user_id = $1 AND strategy = $2',
    [userId, strategy]
  );
}
```

2. Add a route to the controller:

```typescript
// apps/api/src/trades/trades.controller.ts
@Get('/by-strategy/:strategy')
async getByStrategy(@Param('strategy') strategy: string, @CurrentUser() user) {
  return this.tradesService.getTradesByStrategy(user.id, strategy);
}
```

3. Test it: `curl http://localhost:3001/trades/by-strategy/scalping`

### Creating a New Frontend Page

1. Create a new directory in `apps/web/app/`:

```bash
mkdir apps/web/app/my-page
touch apps/web/app/my-page/page.tsx
```

2. Create the page component:

```typescript
// apps/web/app/my-page/page.tsx
export default function MyPage() {
  return <div>My Page Content</div>;
}
```

3. Add link in sidebar: Navigate to `/my-page`

### Debugging API Endpoints

Enable debug logging by setting `NODE_ENV=debug`:

```bash
NODE_ENV=debug bun run start:dev
```

Or add console logs in services:

```typescript
console.log('DEBUG: Processing trade', trade);
```

---

## Known Limitations & Future Work

### Current Phase: Foundation

Based on the `PLAN.md` roadmap, TradeZen is completing Phase 0-1 (Infrastructure & Security):

✅ **Completed:**
- Database with migrations
- JWT authentication
- Core trade CRUD
- User authentication flows
- Swagger documentation

🚧 **In Progress:**
- Input validation & error handling
- Global exception filters
- Behavioral tracking flags

❌ **Planned (Phase 2-3):**
- Calendar heatmap view
- CSV import/export
- Advanced analytics (Sharpe ratio, max drawdown, day-of-week breakdown)
- Daily journal with streak tracking
- Real-time market price integration
- WebSocket support for live updates
- Multi-strategy analytics
- Performance benchmarking

### Known Issues

- **Real-time prices**: Not yet integrated; exit prices must be manually entered
- **PDF reports**: Not yet supported
- **Mobile UI**: Not fully optimized for small screens
- **Offline mode**: Not supported

### Performance Considerations

- Database queries use indexed columns (`user_id`, `created_at`, `symbol`, `strategy`)
- Pagination is implemented for trade lists (default: 20 per page)
- No N+1 queries (eager load related data)
- Redis caching layer prepared but not yet activated

### Security Notes

- Passwords hashed with bcrypt (cost factor: 10)
- JWT tokens signed with `JWT_SECRET` (randomize in production)
- HTTP-only cookies prevent XSS attacks
- All queries parameterized to prevent SQL injection
- CORS restricted to `WEB_URL` environment variable
- Input validation via `class-validator` on all DTOs

---

## Troubleshooting

### Docker won't start

```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs postgres
docker-compose logs redis

# Restart services
docker-compose down
docker-compose up -d
```

### Database migrations fail

```bash
# Check migration runner output
bun run migrate

# Manually check database
psql -h localhost -U postgres -d tradezen -c "\dt"
```

### API won't start

```bash
# Check if port 3001 is in use
lsof -i :3001

# Or on Windows:
netstat -ano | findstr :3001

# Kill the process or use a different port:
PORT=3002 bun run start:dev
```

### Frontend can't reach API

1. Check API is running: `curl http://localhost:3001/auth/me`
2. Check `NEXT_PUBLIC_API_URL` is correct in `.env.local`
3. Check CORS headers in API response
4. Clear browser cache: `Ctrl+Shift+Delete`

### TypeScript errors

```bash
bun run check-types      # Full check
cd apps/api && bun run start:dev # Watch mode type errors
```

---

## Getting Help

- **API Docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Project Roadmap**: See `PLAN.md`
- **Architecture**: See `tradezen_architecture.md`
- **Code Comments**: Each module has inline documentation

---

**Happy trading! 📈**
