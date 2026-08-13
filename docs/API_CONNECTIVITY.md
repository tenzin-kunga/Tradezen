# TradeZen — API Connectivity & Architecture Guide

## 1. Project Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser (Port 3000)                  │
│  Next.js 14 App Router · Tailwind · TanStack Query · tRPC   │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
        tRPC           REST/HTTP      WebSocket
     (type-safe)     (controllers)   (Socket.IO)
           │              │              │
           ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS API (Port 3001)                     │
│  Express · Passport · BullMQ · LangChain/LangGraph · Drizzle │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
       Drizzle ORM                BullMQ Queue
           │                          │
           ▼                          ▼
┌──────────────────┐    ┌──────────────────────┐
│   PostgreSQL 16   │    │       Redis 7         │
│   + pgvector      │    │  (BullMQ jobs + pub/  │
│   (Port 5432)     │    │   sub for WebSocket)  │
└──────────────────┘    └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              AI Layer (External / Python)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  OpenRouter   │  │ Python AI    │  │  Ollama (local)   │  │
│  │  API         │  │ Service      │  │  Port 11434       │  │
│  │  (Cloud)     │  │ Port 8000    │  │                   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend → Backend Connectivity

There are **three parallel channels** between the Next.js frontend and the NestJS backend.

### 2A. tRPC (Type-Safe RPC) — Primary Data Channel

tRPC provides end-to-end type safety — the API router types are imported directly by the web client.

#### Server Side

**Router definition** — `apps/api/src/trpc/index.ts`:
```ts
export const appRouter = router({
  health: publicProcedure.query(() => 'ok'),
  trades: tradesRouter,
  journals: journalsRouter,
  tags: tagsRouter,
  checklists: checklistsRouter,
});
```

**Mounting** — `apps/api/src/main.ts:135-141`:
```ts
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
}));
```

**Context (JWT extraction)** — `apps/api/src/trpc/context.ts:9-37`:
The `createContext` function extracts the JWT from the `Authorization: Bearer <token>` header, base64-decodes the payload, and sets `userId` on the context. The `protectedProcedure` in `apps/api/src/trpc/trpc.ts` checks that `userId` exists before allowing access.

**Sub-routers:**
| File | Path | Procedures |
|------|------|------------|
| `apps/api/src/trpc/trades.router.ts` | `trades.*` | CRUD, list, stats |
| `apps/api/src/trpc/journals.router.ts` | `journals.*` | CRUD, latest, stats |
| `apps/api/src/trpc/tags.router.ts` | `tags.*` | CRUD |
| `apps/api/src/trpc/checklists.router.ts` | `checklists.*` | CRUD, runs, items |

#### Client Side

**tRPC client creation** — `apps/web/lib/trpc.ts`:
```ts
import { createTRPCReact } from '@trpc/react-query';
import type { appRouter } from 'api/trpc';
export const trpc = createTRPCReact<typeof appRouter>();
```

The web's `tsconfig.json` path alias `"api/trpc": ["../../apps/api/src/trpc/index.ts"]` lets the web client import the **exact same TypeScript types** from the API source, giving full type inference on the client.

**Provider** — `apps/web/providers/trpc-provider.tsx:8-24`:
Wraps the app in `<TrpcProvider>` which creates a tRPC client with `httpBatchLink` pointed at `${NEXT_PUBLIC_API_URL}/trpc` (default: `http://localhost:3001`).

**Usage in page** — `apps/web/app/layout.tsx:41-46`:
Wraps the entire app in `<TrpcProvider>` inside `<AuthProvider>`.

#### Data Flow

```
Web Component                          NestJS API
    │                                      │
    │  trpc.trades.list.useQuery({...})     │
    │ ─────────────────────────────────►    │
    │                                      │
    │     ← typed response { id, pnl, ...} │
    │                                      │
    │  TanStack Query caches result        │
    │  Auto-refetch on window refocus      │
```

---

### 2B. REST Endpoints — Auth & Non-tRPC Operations

Standard NestJS controllers handle auth flows and operations not served by tRPC.

| Endpoint | Controller | Service | Auth |
|----------|-----------|---------|------|
| `GET /` | `AppController` | `AppService` | Public |
| `GET /health` | `AppController` | `AppService` | Public |
| `POST /auth/register` | `AuthController` | `AuthService` | Public (rate-limited: 3/min) |
| `POST /auth/login` | `AuthController` | `AuthService` | Public (rate-limited: 5/min) |
| `POST /auth/refresh` | `AuthController` | `AuthService` | Cookie |
| `POST /auth/logout` | `AuthController` | `AuthService` | JWT |
| `GET /auth/me` | `AuthController` | `AuthService` | JWT |
| `PATCH /auth/settings` | `AuthController` | `AuthService` | JWT |
| `POST /auth/change-password` | `AuthController` | `AuthService` | JWT |
| `GET /auth/google` | `OAuthController` | `OAuthService` | Public |
| `GET /auth/google/callback` | `OAuthController` | `OAuthService` | Public |
| `POST /auth/google` | `OAuthController` | `OAuthService` | Public |
| `GET /auth/github` | `OAuthController` | `OAuthService` | Public |
| `GET /auth/github/callback` | `OAuthController` | `OAuthService` | Public |
| `POST /auth/github` | `OAuthController` | `OAuthService` | Public |
| `POST /auth/enable-2fa` | `AuthController` | `TwoFactorService` | JWT |
| `POST /auth/verify-2fa` | `AuthController` | `TwoFactorService` | JWT |
| `GET /ai/insights` | `AiController` | `AiInsightsService` | JWT |
| `GET /ai/coaching` | `AiController` | `CoachingEngineService` | JWT |
| `GET /api/docs` | Swagger | — | Dev only |

**Swagger** is mounted at `/api/docs` only in non-production environments (`apps/api/src/main.ts:118-127`).

The web dashboard (`apps/web/app/page.tsx:143-153`) uses raw `fetch` via `@/lib/api` for dashboard data rather than tRPC.

---

### 2C. WebSocket (Socket.IO) — Real-Time Events

**Gateway** — `apps/api/src/gateway/trades.gateway.ts:11-57`:
- Namespace: `/realtime`
- JWT-authenticated via `handshake.query.token`
- On connection: verifies JWT, joins room `user:{userId}`
- `emitToUser(userId, event, data)` — sends to a specific user's room

**Client side**: The web uses Socket.IO client to connect. The connection URL is derived from `NEXT_PUBLIC_API_URL` with `/realtime` namespace.

**Events emitted:**
- Trade updates (created, updated, deleted)
- Journal creation
- AI job progress (via BullMQ → EventPublisherService → Redis → Socket.IO)
- Notification delivery
- Coaching push messages

**Flow:**
```
BullMQ Job Progress
       │
       ▼
EventPublisherService (Redis pub)
       │
       ▼
EventSubscriberService (Redis sub)
       │
       ▼
TradesGateway.emitToUser(userId, event, data)
       │
       ▼
Socket.IO → Client's room `user:{userId}`
```

---

## 3. Backend → Database Connectivity

### 3A. Connection Setup

**Shared package** — `packages/db/src/connection.ts:12-20`:

```ts
export function getDb(): TradezenDb {
  if (!_db) {
    _client = postgres(
      process.env.DATABASE_URL ??
        `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable`,
    );
    _db = drizzle(_client, { schema: fullSchema });
  }
  return _db;
}
```

Uses `postgres` driver (the modern `postgres.js` library) wrapped by Drizzle ORM. Singleton pattern — one connection pool per process lifetime.

**Schema** is assembled at `packages/db/src/connection.ts:6`:
```ts
const fullSchema = { ...schema, ...relations };
```
Where `schema` comes from `packages/db/src/schema/index.ts` (all tables) and `relations` from `packages/db/src/relations/index.ts` (relationship mappings).

**API wrapper** — `apps/api/src/db/drizzle.ts`:
```ts
import { getDb } from '@tradezen/db';
export const db: TradezenDb = getDb();
export const client = getClient();
```
All NestJS services import `db` from `../../db/drizzle` to query the database.

### 3B. Schema Overview

All tables defined in `packages/db/src/schema/index.ts` (576 lines):

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | id (uuid), email, username, password_hash, auth_method, 2FA |
| `user_settings` | Per-user settings | assistant_settings (jsonb), workspace_settings, notification_settings |
| `trades` | Trading entries | symbol, direction, entry/exit_price, pnl, strategy, psychology flags |
| `journals` | Daily trading journals | date, pre/post_market_notes, mood, lessons |
| `tags` | Trade tagging | name, color, category |
| `trade_tags` | M2M trade←→tag | trade_id, tag_id |
| `accounts` | OAuth providers | provider, provider_id, provider_email |
| `login_attempts` | Brute-force tracking | identifier, ip |
| `audit_log` | Security audit trail | action, resource, ip, details |
| `analytics_snapshots` | Cached daily metrics | snapshot_date, metrics (jsonb) |
| `embeddings` | pgvector embeddings | embedding (vector(1536)), source_type, content |
| `chat_threads` | AI chat threads | title, primary_type, pinned |
| `chat_messages` | Chat messages | thread_id, role, content |
| `ai_insights` | Generated insights | insight_type, content, metadata |
| `coaching_sessions` | AI coaching interventions | severity, triggers, message |
| `notifications` | User notifications | type, title, message, is_read |
| `notification_preferences` | Notification config | type, enabled |
| `goals` | Trading goals | type, target, period, direction |
| `checklists` | Trading checklists | name, description |
| `checklist_items` | Checklist line items | title, is_critical, sort_order |
| `checklist_runs` | Checklist executions | checklist_id, trade_id, note |
| `checklist_run_items` | Per-item check state | checked, checked_at |
| `trade_images` | Trade chart images | trade_id, url |
| `symbols` | Known trading symbols | symbol, name, type |
| `watchlists` | User watchlists | name |
| `watchlist_items` | Watchlist entries | symbol, notes |
| `knowledge_*` | Knowledge base | folders, documents, versions |
| `research_*` | Research projects | projects, notes, checklists, activity |
| `assets` | Uploaded assets | url, type, status |

### 3C. pgvector & Semantic Search

The `embeddings` table uses a custom `vector` type (defined at `packages/db/src/schema/index.ts:263-266`):
```ts
const vector = (name: string, opts: { dimensions: number }) =>
  customType<{ data: number[] }>({
    dataType: () => `vector(${opts.dimensions})`,
  })(name);
```

With 1536-dimensional vectors for OpenAI `text-embedding-3-small`.

**Semantic queries** in `apps/api/src/ai/embedding.service.ts:86-92` use the `<=>` cosine distance operator:
```sql
SELECT 1 - (embedding <=> '[0.1,0.2,...]'::vector) as similarity
FROM embeddings
WHERE user_id = $1
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT $2
```

---

## 4. Database Migrations

There are **two parallel migration systems** in the project.

### 4A. SQL File Migrations (Active/Runtime)

**File:** `apps/api/src/db.ts:21-99`

This is the **active** migration system, called automatically on API startup.

**How it works:**

1. On startup, `apps/api/src/main.ts:144` calls `await runMigrations()`.
2. `runMigrations()` creates a tracking table `schema_migrations` if not exists (line 23-29).
3. Reads `.sql` files from the `apps/api/migrations/` directory, sorted alphabetically.
4. Checks which files have already been executed (tracked in `schema_migrations` table).
5. Executes un-executed files in a transaction: runs SQL, then inserts the filename.
6. Handles `42P07` (already exists) errors gracefully by skipping.
7. Additionally, applies ALTER TABLE migrations for column additions not in SQL files (lines 85-99).

**Run standalone:** `bun run migrate` executes `apps/api/src/migrate.ts`.

### 4B. Drizzle Kit (Future/Framework)

**File:** `apps/api/drizzle.config.ts`
```ts
export default defineConfig({
  schema: '../../packages/db/src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL || '...' },
});
```

This is configured for generating future Drizzle-style migrations but is **not actively used** in the dev startup flow. The active system is the SQL-based one above. The Drizzle Kit config points to the shared schema package for generating migration snapshots when needed.

### Migration Directory
- Migration SQL files live in `apps/api/migrations/`
- Auto-run on every API start in dev

---

## 5. Authentication Flow

### 5A. JWT Token Pair

```
┌─────────┐         POST /auth/login          ┌─────────┐
│  Client  │ ───────────────────────────────►  │  API    │
│          │    { email, password }           │         │
│          │                                  │ Bcrypt  │
│          │ ◄─────────────────────────────── │ verify  │
│          │   { access_token (15min) }       │         │
│          │   Set-Cookie: refresh_token      │ JWT     │
│          │     (HTTP-only, 7d, Secure)      │ sign    │
└─────────┘                                  └─────────┘
```

**Access Token:**
- Payload: `{ sub: userId, email, iat, exp }`
- Signed with `JWT_SECRET` (must be 64+ chars in production)
- Expires in 15 minutes (`apps/api/src/auth/auth.service.ts:143-145`)
- Sent in `Authorization: Bearer <token>` header

**Refresh Token:**
- Payload: `{ sub: userId, tokenId, type: 'refresh', iat, exp }`
- Signed with `JWT_REFRESH_SECRET` (must be 64+ chars in production)
- Expires in 7 days
- Stored in HTTP-only cookie named `refresh_token` (`apps/api/src/auth/auth.service.ts:153-158`)
- Cookie settings: `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'`, `path: '/auth'`

**Refresh flow:**
```
POST /auth/refresh
   → reads refresh_token cookie
   → verifies with JWT_REFRESH_SECRET
   → rotates both tokens (new access + new refresh)
   → returns new access_token in body
   → sets new refresh_token cookie
```

### 5B. Global JWT Guard

**File:** `apps/api/src/app.module.ts:105`

```ts
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

Applied globally. Extends `AuthGuard('jwt')` from `@nestjs/passport`. Checks for `@Public()` decorator on controllers/routes to skip auth.

**JWT Strategy** — `apps/api/src/auth/jwt.strategy.ts:6-29`:
- Extracts Bearer token from Authorization header
- Validates with `JWT_SECRET`
- Returns user payload

### 5C. OAuth Flow

**Server-side redirect** (Google example):
```
1. User clicks "Sign in with Google"
2. GET /auth/google → redirects to Google OAuth consent screen
3. Google redirects to GET /auth/google/callback?code=...
4. validateOAuthUser() creates or links user:
   a. Look up existing user by provider + provider_id
   b. If exists, sign them in
   c. If not, create new user with auth_method='oauth'
   d. Link OAuth account in `accounts` table
5. Generate JWT pair, redirect to web with tokens
```

**Client-side** (for mobile/SDK): `POST /auth/google` accepts an ID token from `@react-oauth/google`.

**Both OAuth providers:** Google (`apps/api/src/auth/strategies/google.strategy.ts`), GitHub (`apps/api/src/auth/strategies/github.strategy.ts`).

### 5D. Rate Limiting & Security

- **Global throttle:** 30 requests per 60s (`@nestjs/throttler` in `app.module.ts:49-54`)
- **Login throttle:** 5 requests per 60s (`@Throttle({ default: { limit: 5, ttl: 60000 } })`)
- **Register throttle:** 3 requests per 60s
- **Brute force protection:** `BruteForceService` tracks `login_attempts` table by identifier + IP
- **Audit logging:** All auth events logged to `audit_log` table
- **2FA:** TOTP-based via `otplib` library, with backup codes stored as jsonb

---

## 6. LLM / AI Integration

The AI system has **four layers** that work together.

### 6A. BullMQ Queue Processor (Async AI Jobs)

**File:** `apps/api/src/queues/queues.module.ts`
- Registers BullMQ with Redis connection
- Two queues: `csv-import`, `ai-processing`

**File:** `apps/api/src/queues/ai-processing.processor.ts`
- Handles `journal-summarize` and `pattern-analysis` jobs
- Uses raw `fetch()` to call OpenRouter API directly (`callOpenRouter()`)
- Emits real-time progress via `EventPublisherService` (Redis pub/sub → WebSocket)

**Flow:**
```
NestJS Service                          BullMQ Queue                      OpenRouter
     │                                      │                                │
     │  this.aiProcessingQueue.add(         │                                │
     │    'journal-summarize', { ... })     │                                │
     │ ─────────────────────────────────►   │                                │
     │                                      │  Worker picks up job          │
     │                                      │ ──────────────────────────────► │
     │                                      │  POST /v1/chat/completions     │
     │                                      │ ◄────────────────────────────── │
     │  EventPublisherService.publish(      │  response                      │
     │    'job:progress', { progress })     │                                │
     │ ◄─────────────────────────────────   │                                │
```

### 6B. LangChain/LangGraph Workflows

**File:** `apps/api/src/ai/langgraph.config.ts`:
```ts
export function createLLM(model?: string, temperature = 0.7) {
  const raw = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
  return new ChatOpenAI({
    model: model ?? process.env.AI_MODEL ?? 'qwen3:4b',
    temperature,
    configuration: {
      baseURL: normalizeAiBaseUrl(raw),
    },
    apiKey: process.env.AI_SERVICE_API_KEY ?? 'not-needed',
  });
}
```

The `ChatOpenAI` instance is pointed at `AI_SERVICE_URL` (the Python FastAPI service or Ollama directly). The SDK-compatible `/v1` endpoint is auto-appended by `normalizeAiBaseUrl()`.

**Two compiled state machines:**

#### JournalAnalysisWorkflow (`apps/api/src/ai/workflows/journal-analysis.workflow.ts`)
5-node LangGraph StateGraph:
```
fetch_data → analyze_sentiment → detect_patterns → generate_insights → compile_summary
```
Each node calls `createLLM()` with different temperatures (0.3–0.7).

#### CoachingWorkflow (`apps/api/src/ai/workflows/coaching.workflow.ts`)
3-node StateGraph:
```
evaluate_triggers → assess_severity → generate_message
```
- `evaluate_triggers`: Rule-based checks on win rate, profit factor, streaks, FOMO score
- `assess_severity`: Classifies as `low`, `medium`, `high`
- `generate_message`: LLM generates coaching message with severity-appropriate prompt

### 6C. AI Insights Service (Rule-Based + LLM)

**File:** `apps/api/src/ai/ai-insights.service.ts`

- Rule-based insight generation from predefined `RULES`
- `getInsights()`: Builds candidates from analytics, selects top insights, generates LLM narrative
- `getCoachingPush()`: Proactive coaching via `PushPolicy`
- In-memory cache with 6-hour TTL

### 6D. Embeddings & Semantic Search

**File:** `apps/api/src/ai/embedding.service.ts`

```
Text → generateEmbedding() → OpenRouter Embeddings API → [1536-dimensional vector]
                                                             │
                                                             ▼
                                                         pgvector
                                                     embeddings table
                                                             │
                                                             ▼
Query → generateEmbedding() → searchSimilar() → cosine distance (<=>) → ranked results
```

- Model: `openai/text-embedding-3-small` (1536 dimensions)
- API endpoint: `https://openrouter.ai/api/v1/embeddings`
- Stored in `embeddings` table with `sourceType` + `sourceId` for entity linking
- Search uses pgvector's `<=>` operator for cosine distance querying

### 6E. Python AI Service (Separate Process)

**Location:** `apps/ai-service/`
- Independent FastAPI service
- Communicates with NestJS via HTTP on port 8000
- Docker Compose service at `infra/docker-compose.yml:205-242`
- Supports multiple providers (Ollama, OpenRouter) with concurrency limits

### AI Architecture Summary

```
NestJS API (Port 3001)
│
├── BullMQ Queue ──► AI Processing Processor ──► OpenRouter API (direct HTTP)
│                                                       │
├── LangGraph Workflows ──► ChatOpenAI ──► AI Service URL (Python FastAPI / Ollama)
│                                                │
│                                                ├── Ollama (local, port 11434)
│                                                └── OpenRouter (cloud)
│
├── EmbeddingService ──► OpenRouter Embeddings API ──► pgvector (cosine similarity)
│
├── AiInsightsService ──► Rule-based analytics + LLM narrative generation
│
└── CoachingEngineService ──► CoachingWorkflow (LangGraph) + PushPolicy
```

---

## 7. Redis & BullMQ Configuration

**Redis connection** — `apps/api/src/common/utils/redis-connection.ts`:
- Reads `REDIS_URL` or constructs from `REDIS_HOST`/`REDIS_PORT`
- Supports TLS for production

**BullMQ queues** — `apps/api/src/queues/queues.module.ts:11-14`:
```ts
BullModule.forRoot({ connection: getRedisConnection() }),
BullModule.registerQueue(
  { name: 'csv-import' },
  { name: 'ai-processing' },
)
```

**Queues:**

| Queue | Processor | Purpose |
|-------|-----------|---------|
| `csv-import` | `CsvImportProcessor` | Import trades from CSV files |
| `ai-processing` | `AiProcessingProcessor` | Journal summarization, pattern analysis |

---

## 8. Notifications

**File:** `apps/api/src/common/services/notification.service.ts`

- **Push:** Real-time via WebSocket (same channel as AI job progress)
- **In-app:** Stored in `notifications` table
- **Triggers:** `NotificationTriggersService` watches for trade milestones, journal streaks, AI insights

**Flow:**
```
NotificationTriggersService
    │ detects event (e.g., new insight)
    ▼
NotificationService
    ├── stores in `notifications` table
    ├── checks `notification_preferences` for channel
    └── EventPublisherService → WebSocket push
```

---

## 9. Analytics & Snapshots

### Nightly Snapshots

**File:** `apps/api/src/analytics/snapshot.service.ts`

Scheduled via cron in `apps/api/src/main.ts:148-152`:
```ts
cron.schedule('0 23 * * *', async () => {
    await snapshotService.createAllSnapshots();
});
```

Calculates aggregate metrics per user:
- Win rate, profit factor, average PnL
- Psychology flags (FOMO, revenge trading)
- Performance by symbol, strategy
- Streaks and patterns

Stored in `analytics_snapshots` table (jsonb `metrics` column).

### Behavioral Analytics

**File:** `apps/api/src/analytics/behavioral.service.ts`

Real-time analysis of trading behavior patterns:
- Identifies psychological tendencies
- Detects rule violations
- Generates behavioral scores

---

## 10. Service Registration & Dependency Injection

`apps/api/src/app.module.ts` is a **global module** (`@Global()`) that registers core services, making them injectable without re-importing AppModule.

**Imported modules** (the feature domains):
```
AuthModule, TradesModule, JournalsModule, TagsModule,
ChatModule, GatewayModule, QueuesModule, ReportModule,
SearchModule, SeedModule, NewsModule, SymbolsModule,
WatchlistModule, KnowledgeModule, RetrievalModule,
ResearchModule, PortfolioModule, SemanticModule, UserSettingsModule
```

**Globally registered providers:**
```
JwtAuthGuard (APP_GUARD)
ThrottlerEventsGuard (APP_GUARD)
SnapshotService, BehavioralService
EventPublisherService, EventSubscriberService
EmbeddingService, MemoryService
JournalAnalysisWorkflow, CoachingWorkflow
CoachingEngineService, AiInsightsService
NotificationService, NotificationTriggersService
JournalsService, CoachingPushPolicy
```

**Global middleware** — `RequestContextMiddleware` applied to all routes.

---

## 11. Development vs Production Wiring

### Development Mode (Local)

```
Machine
├── Next.js Web (port 3000)  ← bun run dev
├── NestJS API (port 3001)   ← bun run dev
├── PostgreSQL (port 5432)   ← Docker
├── Redis (port 6379)        ← Docker
└── Ollama (port 11434)      ← Docker (optional)
```

**Startup sequence:**
1. `bun run dev` (root `package.json`)
2. Turborepo builds `@tradezen/db` first (`dev` script: `bun run build --filter=@tradezen/db`)
3. Starts both `apps/api` and `apps/web` concurrently via turbo
4. API bootstrap (`main.ts`):
   - CORS origin = `http://localhost:3000`
   - Cookie parser
   - Global ValidationPipe
   - Swagger at `/api/docs`
   - tRPC at `/trpc`
   - **Runs migrations** (`await runMigrations()`)
   - Schedules nightly snapshot cron
   - Listens on port 3001

**Environment files:**
| File | Key variables |
|------|--------------|
| `apps/api/.env` | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `WEB_URL` |
| `apps/web/.env` | `NEXT_PUBLIC_API_URL=http://localhost:3001`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |

### Production Mode (Docker Compose)

**File:** `infra/docker-compose.yml` (287 lines)

```
tradezen-net (172.28.0.0/16)
├── postgres (172.28.1.10)  — pgvector:pg16, 1GB RAM
├── redis (172.28.1.11)     — redis:7-alpine, 256MB, AOF
├── api (172.28.1.20)       — NestJS, 512MB
├── web (172.28.1.21)       — Next.js standalone, 512MB, port 3000 exposed
├── ai-service (172.28.1.30)— Python FastAPI, 1GB
├── ollama (172.28.1.40)    — ollama/ollama, 4GB, port 11434
└── backup                  — Daily pg_dump, 30-day retention
```

| Aspect | Dev | Production |
|--------|-----|------------|
| API URL | `localhost:3001` | `api:3001` (Docker DNS) |
| Web URL | `localhost:3000` | `web:3000` (Docker) |
| DB | `localhost:5432` | `postgres:5432` |
| Swagger | `/api/docs` | Disabled |
| JWT validation | Skipped | Enforced (64+ chars) |
| Logging | pino-pretty (colorized) | JSON only |
| Secrets | Inline .env files | `.env.docker` file |

**Scaling** (`infra/docker-compose.scaling.yml`): Nginx load balancer distributes across API ports 3001–3003.

### Docker Helper Script

`scripts/dev/start.bat` — One-click startup:
1. Checks Docker Desktop is running
2. Starts PostgreSQL + Redis containers
3. Starts API + Web via `bun run dev`

---

## 12. Key Data Flow Diagrams

### 12A. User Registration → Journal Entry → AI Insight

```
User
 │
 ├── POST /auth/register → AuthService.createUser()
 │     └── INSERT INTO users
 │
 ├── POST /auth/login → AuthService.login()
 │     └── bcrypt verify → JWT pair issued
 │
 ├── trpc.trades.create(data) → TradesService
 │     └── INSERT INTO trades
 │
 ├── trpc.journals.create(data) → JournalsService
 │     └── INSERT INTO journals
 │     └── MemoryService.enqueueEmbedding() → BullMQ
 │
 ├── GET /ai/insights → AiInsightsService
 │     └── Reads analytics_snapshots
 │     └── Rule engine selects candidate insights
 │     └── LLM generates narrative
 │     └── INSERT INTO ai_insights
 │
 └── WebSocket ← "new_insight" event
       └── NotificationService.push()
```

### 12B. tRPC Type Bridge

```
apps/api/src/trpc/index.ts          apps/web/lib/trpc.ts
    export const appRouter =           import type { AppRouter }
      router({ ... })                        │
           │                                 │
           │                           createTRPCReact<AppRouter>()
           │                                 │
           ▼                                 ▼
    TypeScript source                  Fully typed client
    (tsconfig paths alias)
           │                                 │
           │  "api/trpc": [                 │
           │   "../../apps/api/src/trpc/    │
           │    index.ts"]                   │
           └───────────────────────────────┘
```

### 12C. AI Job Pipeline

```
User submits journal
       │
       ▼
JournalsService
       │
       ├── saves to DB
       │
       └── MemoryService.enqueueForEmbedding(content)
              │
              ▼
       BullMQ Queue: ai-processing
              │
              ├── Worker: journal-summarize
              │     ├── callOpenRouter('journal-summarize-prompt', content)
              │     ├── EventPublisherService.publish('job:progress', data)
              │     └── Save summary
              │
              └── Worker: pattern-analysis
                    ├── callOpenRouter('pattern-analysis-prompt', trades)
                    ├── EventPublisherService.publish('job:progress', data)
                    └── Save patterns → CoachingEngineService may trigger
```

---

## 13. File Reference Map

| Concern | File | Key Line |
|---------|------|----------|
| Bootstrap & startup | `apps/api/src/main.ts` | 54 |
| Global module registration | `apps/api/src/app.module.ts` | 46 |
| Database connection | `packages/db/src/connection.ts` | 12 |
| DB schema (all tables) | `packages/db/src/schema/index.ts` | 1–576 |
| DB relations | `packages/db/src/relations/index.ts` | — |
| Drizzle wrapper | `apps/api/src/db/drizzle.ts` | 1 |
| SQL migrations (runtime) | `apps/api/src/db.ts` | 21 |
| Drizzle Kit config | `apps/api/drizzle.config.ts` | 1 |
| tRPC router | `apps/api/src/trpc/index.ts` | 10 |
| tRPC context (JWT) | `apps/api/src/trpc/context.ts` | 9 |
| tRPC protected proc | `apps/api/src/trpc/trpc.ts` | 4 |
| Web tRPC client | `apps/web/lib/trpc.ts` | 1 |
| Web tRPC provider | `apps/web/providers/trpc-provider.tsx` | 8 |
| Web type bridge (tsconfig) | `apps/web/tsconfig.json` | 30 |
| Auth controller | `apps/api/src/auth/auth.controller.ts` | — |
| Auth service | `apps/api/src/auth/auth.service.ts` | — |
| JWT strategy | `apps/api/src/auth/jwt.strategy.ts` | 6 |
| JWT guard | `apps/api/src/auth/jwt-auth.guard.ts` | 7 |
| OAuth controller | `apps/api/src/auth/oauth.controller.ts` | — |
| OAuth service | `apps/api/src/auth/oauth.service.ts` | 32 |
| 2FA service | `apps/api/src/auth/services/two-factor.service.ts` | — |
| WebSocket gateway | `apps/api/src/gateway/trades.gateway.ts` | 11 |
| Redis connection | `apps/api/src/common/utils/redis-connection.ts` | — |
| BullMQ queues | `apps/api/src/queues/queues.module.ts` | 10 |
| AI processing processor | `apps/api/src/queues/ai-processing.processor.ts` | 20 |
| CSV import processor | `apps/api/src/queues/csv-import.processor.ts` | — |
| LLM factory | `apps/api/src/ai/langgraph.config.ts` | 8 |
| Journal analysis workflow | `apps/api/src/ai/workflows/journal-analysis.workflow.ts` | — |
| Coaching workflow | `apps/api/src/ai/workflows/coaching.workflow.ts` | — |
| Embedding service | `apps/api/src/ai/embedding.service.ts` | 8 |
| Memory service | `apps/api/src/ai/memory.service.ts` | — |
| AI insights service | `apps/api/src/ai/ai-insights.service.ts` | — |
| Coaching engine | `apps/api/src/ai/coaching-engine.service.ts` | — |
| Notifications | `apps/api/src/common/services/notification.service.ts` | — |
| Event publisher (Redis pub) | `apps/api/src/common/services/event-publisher.service.ts` | — |
| Event subscriber (Redis sub) | `apps/api/src/common/services/event-subscriber.service.ts` | — |
| Analytics snapshots | `apps/api/src/analytics/snapshot.service.ts` | — |
| Behavioral analytics | `apps/api/src/analytics/behavioral.service.ts` | — |
| Docker Compose | `infra/docker-compose.yml` | — |
| Docker Compose scaling | `infra/docker-compose.scaling.yml` | — |
| Python AI service | `apps/ai-service/` | — |
| Dev startup script | `scripts/dev/start.bat` | — |

---

## 14. Environment Variables Reference

| Variable | Where Used | Purpose |
|----------|-----------|---------|
| `DATABASE_URL` | `packages/db/src/connection.ts`, `apps/api/src/db.ts` | PostgreSQL connection string |
| `DB_USER/PASS/HOST/PORT/NAME` | `packages/db/src/connection.ts` | Fallback if DATABASE_URL not set |
| `JWT_SECRET` | `apps/api/src/auth/jwt.strategy.ts`, `auth.service.ts` | Access token signing (64+ chars in prod) |
| `JWT_REFRESH_SECRET` | `apps/api/src/auth/auth.service.ts` | Refresh token signing (64+ chars in prod) |
| `WEB_URL` | `apps/api/src/main.ts`, `trades.gateway.ts` | CORS origin, CSP connect-src |
| `NEXT_PUBLIC_API_URL` | `apps/web/`, tRPC provider, fetch calls | API URL for web client |
| `CLOUD_DEFAULT_MODEL` | `apps/api/src/queues/ai-processing.processor.ts` | Default model for background AI jobs |
| `AI_SERVICE_URL` | `apps/api/src/ai/langgraph.config.ts` | Python AI service URL |
| `AI_SERVICE_API_KEY` | LangGraph config | Auth for AI service |
| `AI_MODEL` | LangGraph config | Default LLM model (e.g., `qwen3:4b`) |
| `REDIS_URL` | BullMQ, event publisher/subscriber | Redis connection string |
| `REDIS_HOST/PORT` | Redis connection utils | Fallback if REDIS_URL not set |
| `NODE_ENV` | Multiple locations | `production` vs `development` mode |
| `PORT` | `apps/api/src/main.ts` | API listen port (default 3001) |
| `SMTP_*` | Email service | Email server config |
| `LOG_LEVEL` | `apps/api/src/app.module.ts` | Pino log level |

---

## 15. Important Gotchas

1. **`@tradezen/db` must be built first** — The root `dev` script explicitly runs `bun run build --filter=@tradezen/db` before turbo. The shared db package is compiled to JS before API or web can import it.

2. **Migrations auto-run on every API start** — `main.ts:144` calls `runMigrations()` with no env guard. In dev this is fine; in production it should only apply new migrations (which it does via the `schema_migrations` tracking table).

3. **JWT secret validation only in production** — `main.ts:50-52` skips validation in dev mode for convenience. Prod will crash if secrets are <64 chars.

4. **Swagger is dev-only** — Automatically disabled in production (`main.ts:118`). This intentionally avoids exposing API structure.

5. **tRPC type bridge is build-time** — The web's path alias `api/trpc` → API source files means the frontend compiles against the **same TypeScript definitions** as the backend. This is powerful but means changes to API trpc routers require re-building web.

6. **Python AI service is optional** — LangGraph's `ChatOpenAI` can point directly at OpenRouter or Ollama. The Python service (`apps/ai-service/`) adds concurrency management and provider abstraction.

7. **No web tests exist** — Only the API has Jest test suites (`bun run test` / `bun run test:e2e`). Web has lint and typecheck only.

8. **WebSocket uses query-param auth** — JWT is passed as `handshake.query.token`, which means the token is visible in server logs/URLs. Ensure logging redacts query strings in production.
