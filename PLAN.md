# TradeZen — Top-Tier Trading Journal Overhaul Plan

## TL;DR

Transform TradeZen from an early MVP into a production-grade trading journal that rivals TraderSync/TradeZella. Lock down the foundation (auth, validation, full CRUD), layer on power features (calendar heatmap, CSV import/export, advanced analytics, daily journal), then polish UX (responsive design, themes, keyboard shortcuts, toast notifications).

---

## Phase 0: Infrastructure (do first, enables everything)

### 0.1 Numbered SQL Migration System
- Replace inline `runMigrations()` in `db.ts` with a file-based migration runner
- Create `apps/api/migrations/` directory with numbered SQL files:
  - `001_initial_trades.sql` — existing trades table creation (extracted from current db.ts)
  - `002_users_table.sql` — users table for auth
  - `003_trades_add_user_id.sql` — add user_id FK + updated_at to trades
  - `004_journals_table.sql` — journals table
  - `005_tags_tables.sql` — tags + trade_tags junction
- Add `schema_migrations` tracking table: `(id SERIAL, filename TEXT UNIQUE, executed_at TIMESTAMP DEFAULT NOW())`
- Migration runner: reads `migrations/` dir, sorts by number, skips already-executed, runs new ones in a transaction
- Add `npm run migrate` script for manual runs

### 0.2 Deployment Configuration
- **Web (Vercel)**: `apps/web/vercel.json` with nextjs preset; `NEXT_PUBLIC_API_URL` env var for prod API
- **API (Railway)**: multi-stage `apps/api/Dockerfile` (node:20-alpine), `.dockerignore`, `railway.toml`; migrations run on startup
- **Docker Compose (local)**: root `docker-compose.yml` with postgres + redis services; update `start.bat` to use `docker-compose up -d`
- **CI/CD**: `.github/workflows/ci.yml` — on push/PR → install → lint → type-check → test → build
- **Env docs**: `.env.example` at root documenting all required env vars

---

## Phase 1: Foundation & Security (blocks all other phases)

### 1.1 Authentication System (Backend)
- Add `users` table: `id UUID PK, email TEXT UNIQUE, username TEXT UNIQUE, password_hash TEXT, created_at TIMESTAMP`
- Add `user_id UUID` FK column to `trades` table, scope all queries by user
- Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`
- Create `AuthModule` with `AuthService`, `AuthController`, `JwtStrategy`
- Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- JWT access token (15min) + HTTP-only refresh token cookie (7d)
- Global `JwtAuthGuard` on all routes except auth endpoints

### 1.2 Frontend Auth Flow
- Create login/register pages at `/login` and `/register`
- Auth context provider wrapping the app for token management
- Protected route wrapper — redirect to `/login` if unauthenticated
- Store access token in memory (not localStorage), refresh via HTTP-only cookie
- Update `lib/api.ts` to attach `Authorization: Bearer` header

### 1.3 Input Validation & Error Handling
- Install `class-validator`, `class-transformer`
- Create DTOs: `CreateTradeDto`, `UpdateTradeDto`, `LoginDto`, `RegisterDto`
- Enable global `ValidationPipe` in `main.ts`
- Add global `HttpExceptionFilter` for consistent error responses
- Add `LoggingInterceptor` for request/response logging

### 1.4 Swagger/OpenAPI Documentation
- Install `@nestjs/swagger`
- Add `SwaggerModule.setup()` in `main.ts`
- Available at `/api/docs`

---

## Phase 2: Core Feature Completion

### 2.1 Full Trade CRUD
- Add endpoints: `GET /trades/:id`, `PUT /trades/:id`, `DELETE /trades/:id`
- `PUT` recalculates PnL on price changes
- `DELETE` also removes associated chart image from disk
- Add `updated_at TIMESTAMP` column to trades table

### 2.2 API Pagination, Filtering & Sorting
- `GET /trades?page=1&limit=20&sort=created_at&order=desc&symbol=EURUSD&direction=buy&strategy=breakout&from=...&to=...`
- Return shape: `{ data: Trade[], meta: { total, page, limit, totalPages } }`
- Add database indexes: `(user_id, created_at)`, `(user_id, symbol)`, `(user_id, strategy)`

### 2.3 Frontend Edit/Delete Trades
- Edit modal on trade log — pre-filled form with current trade data
- Delete with confirmation dialog
- Optimistic UI updates with rollback on failure

### 2.4 Fix Hardcoded Placeholders
- Replace static "EXECUTION QUALITY: AA+" with calculated grade
- Replace "ACTIVE RISK: 1.50% LIMIT EXCEEDED" with actual calculation
- Replace "DETECTION PENDING" with real exit analysis
- Compute Protocol Score from behavioral flags across trades

---

## Phase 3: Power Features

### 3.1 Calendar Heatmap View
- New `/calendar` page with monthly grid
- Days colored by P&L (green = profit, red = loss, gray = no trades)
- Click a day to see that day's trades in a side panel
- Daily P&L summary endpoint: `GET /trades/daily-pnl`

### 3.2 CSV Import/Export
- Export: `GET /trades/export/csv` — stream download
- Import: `POST /trades/import/csv` — validate, insert, return error report
- Frontend: export button + drag-and-drop import modal with preview

### 3.3 Advanced Analytics Engine
- Win rate by strategy / day of week / session (Asian/London/NY)
- Expectancy, max consecutive wins/losses, max drawdown with recovery
- Tabbed analytics: Overview, Strategy, Time, Behavioral, Risk

### 3.4 Daily Journal
- Journals table: date, pre/post market notes, mood, market conditions, lessons
- New `/journal` page with date picker, mood selector, linked trades

### 3.5 Tags & Strategy Management
- Tags + trade_tags tables; custom colored tags per trade
- Tag picker in add/edit form; filter by tags in trade log

---

## Phase 4: UX Polish

### 4.1 Responsive Design
- Sidebar → hamburger on mobile; stat cards → 1-col; table → card layout

### 4.2 Toast Notifications
- Success/error/warning toasts for all user actions

### 4.3 Loading States & Skeletons
- Skeleton loaders for cards, tables, charts; Next.js `loading.tsx`

### 4.4 Theme System (Dark/Light)
- CSS variables, class-based toggle, localStorage persistence

### 4.5 Keyboard Shortcuts & Command Palette
- `Ctrl+N` → Add Trade, `Ctrl+K` → Command palette, `Escape` → Close modals

---

## Phase 5: Real-Time & Advanced

### 5.1 WebSocket Live Market Prices
- Socket.IO gateway + Redis cache (5s TTL) + Twelve Data API
- Live price ticker on dashboard with flash animations

### 5.2 Risk Management Dashboard
- Position size calculator, daily loss limit tracker

### 5.3 Performance Reports
- Weekly/monthly auto-generated reports, PDF export

### 5.4 Achievement System
- Milestones & badges to gamify consistent journaling

---

## Decisions

- **Auth**: JWT + HTTP-only refresh cookie — stateless, scales well
- **No ORM**: Keep raw SQL with `pg` — established pattern
- **No external component library**: Custom components maintain the hacker/terminal aesthetic
- **Deployment**: Vercel (web) + Railway (API + Postgres)
- **Migration system**: File-based numbered SQL — simple, no ORM dependency
- **Docker Compose**: Local dev with postgres + redis
- **CI**: GitHub Actions on `develop` pushes + PRs to `main`
