# TradeZen Development Plan

> **Generated:** 2026-05-31
> **Source:** Codebase audit + prior dev plan
> **Branch:** develop

---

## Current State Assessment

### ✅ Fully Implemented

**Infrastructure & DevOps**
- Docker Compose (PostgreSQL pgvector + Redis)
- CI/CD pipeline (ci.yml, deploy.yml)
- Multi-stage Dockerfiles for API and web
- Sentry monitoring (web: `@sentry/nextjs`)
- Swagger API docs (dev only)
- Environment validation

**Authentication & Security** (Phase 2)
- JWT + HTTP-only refresh cookies
- OAuth (Google + GitHub strategies)
- Two-factor authentication (TOTP)
- Rate limiting (`@nestjs/throttler` + `throttler.guard.ts`)
- Brute-force protection (`brute-force.service.ts`)
- Suspicious login detection (`suspicious-login.service.ts`)
- Helmet security headers
- Audit logging (`audit.service.ts` + `audit_log` table)

**Database & Type Safety** (Phase 3)
- **Drizzle ORM** — Full schema in `packages/db/src/schema/` (16 tables)
- **@tradezen/db** — Shared package with schema, types, relations, Zod validation
- **tRPC** — Server (`apps/api/src/trpc/`) + Client (`apps/web/lib/trpc.ts`) with trades, journals, tags routers
- **Zod** — Validation schemas in `packages/db/src/validation.ts`
- **pgvector** — Vector embeddings for AI memory

**Core Backend Hardening** (Phase 1)
- Global HTTP exception filter (`http-exception.filter.ts`)
- Logging interceptor + timing interceptor
- Request context middleware (correlation IDs)
- Transaction utilities (`transaction.ts`)
- DTOs with `class-validator` across all modules
- API error types (`api-error.types.ts`)

**Analytics** (Phase 4)
- `behavioral.service.ts` — FOMO, revenge trading, streaks
- `snapshot.service.ts` — Cached analytics per date
- Trade schema includes psychology flags and strategy/tag tracking

**Queue System** (Phase 4)
- BullMQ (`@nestjs/bullmq` + `bullmq ^5.76.9`)
- CSV import processor (`csv-import.processor.ts` + `csv.ts` utility)
- AI processing queue (`ai-processing.processor.ts`)
- Job status tracking (`job-status.service.ts`)

**Realtime** (Phase 5)
- Socket.IO (`@nestjs/platform-socket.io`, `socket.io-client`)
- Trades gateway (`trades.gateway.ts`)
- Event publisher/subscriber services
- Web client socket connection (`lib/socket.ts`)

**AI Memory & Coaching** (Phase 6)
- Embedding service (`embedding.service.ts` + `embeddings` table)
- Memory service (`memory.service.ts`)
- Journal intelligence (`journal-intelligence.service.ts`)
- Coaching engine (`coaching-engine.service.ts` + `coaching.workflow.ts`)
- Journal analysis workflow (`journal-analysis.workflow.ts`)
- LangGraph config scaffold (`langgraph.config.ts`)
- Chat system with thread + message persistence
- AI insights table (`ai_insights`)
- Coaching sessions table (`coaching_sessions`)

**Web Frontend** (Phase 7)
- App Router: trades, add-trade, analytics, calendar, journal, login, register, reports, settings, auth/callback
- Components: AppShell, ChatPanel, EquityChart, NotificationBell/Item/Prefs, Sidebar, StatCard
- tRPC + TanStack Query integration
- Auth context + Theme context
- Recharts for charting
- Tailwind CSS styling

**Notifications** (Phase 7)
- `notification.service.ts` + `notification-triggers.service.ts`
- `notifications` + `notification_preferences` tables
- Web UI: NotificationBell, NotificationItem, NotificationPreferences

**Reports** (Phase 7)
- `report.controller.ts`, `report.service.ts`, `report.module.ts`
- Web reports page route

### ⚠️ Partially Implemented

| Area | What's Done | What's Missing |
|------|-------------|----------------|
| LangGraph | Config scaffold exists | `@langchain/langgraph` not installed; runtime + workflows not wired |
| Live market streaming | Socket.IO infra ready | No real market data providers integrated |
| Report generation | Controller + service scaffold | PDF generation library not installed (`pdfkit` missing) |
| Redis Pub/Sub | Custom event pub/sub services | Not using Redis pub/sub channels directly |
| Query optimization | DB indexes on all tables | No cursor pagination utility |
| Backup automation | Neon automated backups | No export/snapshot scripts |
| Horizontal scaling | Stateless API design | No multi-instance testing |
| Deployment automation | GitHub deploy.yml | No blue-green / rollback scripts |
| Better-Auth evaluation | JWT + OAuth + 2FA working | No migration assessment done |

### ❌ Not Started

| Area | Notes |
|------|-------|
| Git workflow enforcement | No branch protection rules in repo, no husky hooks |
| Engineering automation | No pre-commit hooks, CI quality gates beyond build/test |
| Redis benchmarking | No throughput/capacity analysis |
| Spec template system | No `docs/superpowers/specs/` directory |
| Mobile optimization pass | Web is responsive via Tailwind but no dedicated mobile pass |

---

## Updated Execution Plan

Most of the heavy lifting is done. Remaining work is narrow and targeted:

### Immediate — Fix LangGraph + PDF Gen + Cursor Pagination

| Task | What | Files |
|------|------|-------|
| Install `@langchain/langgraph` | Wire up LangGraph runtime | `apps/api/src/ai/langgraph.config.ts` |
| Install PDF lib (pdfkit or similar) | Generate actual report PDFs | `apps/api/src/reports/` |
| Add cursor pagination utility | Replace offset pagination | `apps/api/src/common/utils/` |

### Short-term — Polish & Hardening

| Task | What |
|------|------|
| Enable Redis pub/sub channels | Replace custom event pub/sub with Redis channels |
| Add husky + pre-commit hooks | Lint-staged, type-check |
| Add backup export script | Weekly pg_dump to cloud storage |
| Add branch protection rules | GitHub settings + PR template |
| Mobile-responsive pass | Test all routes on mobile viewports |
| Better-Auth evaluation report | Research Clerk / Better-Auth migration |

### Future — Stretch Goals

| Task | What |
|------|------|
| Live market data streaming | Integrate with broker API or WebSocket data feed |
| Blue-green deployment | Script zero-downtime deploys |
| Redis benchmark | Throughput analysis for queue sizing |
| Horizontal scaling test | Multi-instance load test |
