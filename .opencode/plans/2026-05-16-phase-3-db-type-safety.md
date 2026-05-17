# Phase 3: Database & Type Safety Modernization

> **Date:** 2026-05-16
> **Branch:** develop
> **Strategy:** Incremental migration, tRPC coexistence, shared DB package

---

## Architecture Overview

### Current State
- **Database:** PostgreSQL via raw `pg.Pool` in `apps/api/src/db.ts`
- **Query pattern:** Parameterized SQL with positional `$N` placeholders across 5 services
- **Validation:** class-validator DTOs per module (13 DTO files)
- **API surface:** REST-only (NestJS controllers)
- **Migrations:** 11 SQL files in `apps/api/migrations/`, custom runner in `db.ts`
- **Monorepo:** npm workspaces, `apps/*` only (no `packages/*` yet)
- **Stack:** NestJS 11, Express, Next.js 14.2.25, React 18, Turbo

### Target State
- Drizzle ORM for type-safe queries (incremental migration, pool kept alongside)
- Zod schemas shared between api and web
- tRPC for internal APIs, REST for external
- `packages/db` shared package (schemas + connection + types)

---

## Current File Inventory

### Services using raw `pool.query()`
| Service | File | Lines | Query Count | Complexity |
|---------|------|-------|-------------|------------|
| trades | `apps/api/src/trades/trades.service.ts` | 706 | ~20 | High (analytics, CSV import/export, transactions, dynamic WHERE) |
| journals | `apps/api/src/journals/journals.service.ts` | 163 | ~10 | Medium (ON CONFLICT, streak CTEs, dynamic UPDATE) |
| tags | `apps/api/src/tags/tags.service.ts` | 186 | ~12 | Medium (JOINs, M:N relations, transactions) |
| auth | `apps/api/src/auth/auth.service.ts` | 262 | ~6 | Low (simple SELECT/INSERT/UPDATE) |
| chat | `apps/api/src/chat/chat.service.ts` | 193 | 0 | None (external API only, no DB queries) |

### Migration files (11 total)
```
001_initial_trades.sql    — trades table (uuid, all trade fields)
002_users_table.sql       — users table (email, username, password_hash)
003_trades_add_user_id.sql — user_id FK, updated_at, indexes
004_journals_table.sql    — journals table (date, mood, notes, UNIQUE user_id+date)
005_tags_tables.sql       — tags + trade_tags tables (M:N junction)
005_login_attempts.sql    — login_attempts table (brute force tracking)
006_audit_log.sql         — audit_log table (security auditing)
006_trades_add_trade_date.sql — trade_date column on trades
007_two_factor.sql        — 2FA columns on users
007_user_settings.sql     — settings columns on users
008_trades_add_commission.sql — commission, contract_size on trades
```

### DTO files (13 total)
```
apps/api/src/trades/dto/create-trade.dto.ts
apps/api/src/trades/dto/update-trade.dto.ts
apps/api/src/trades/dto/query-trades.dto.ts
apps/api/src/journals/dto/create-journal.dto.ts
apps/api/src/journals/dto/update-journal.dto.ts
apps/api/src/journals/dto/query-journals.dto.ts
apps/api/src/tags/dto/create-tag.dto.ts
apps/api/src/tags/dto/update-tag.dto.ts
apps/api/src/tags/dto/query-tag-trades.dto.ts
apps/api/src/auth/dto/register.dto.ts
apps/api/src/auth/dto/login.dto.ts
apps/api/src/auth/dto/update-settings.dto.ts
apps/api/src/chat/dto/create-chat.dto.ts
apps/api/src/chat/dto/chat-message.dto.ts
```

### Existing DB infrastructure
- `apps/api/src/db.ts` — Pool creation, `runMigrations()` function, schema_migrations tracking
- `apps/api/src/common/utils/transaction.ts` — `withTransaction()` helper
- `apps/api/src/common/services/brute-force.service.ts` — uses `pool.query()` on login_attempts
- `apps/api/src/common/services/audit.service.ts` — uses `pool.query()` on audit_log
- `apps/api/src/common/services/suspicious-login.service.ts` — uses `pool.query()` on login_attempts

---

## TZ-020: Introduce Drizzle ORM

### Step 1: Install dependencies
```bash
cd apps/api
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

Note: `@types/pg` already present as transitive; `pg` remains for backward compat with brute-force/audit services during migration.

### Step 2: Create Drizzle config
Create `apps/api/drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Step 3: Create schema layer
Create `apps/api/src/db/schema/index.ts` with table definitions matching all 11 migrations:

```typescript
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  date,
  integer,
  jsonb,
  varchar,
  primaryKey,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── users ───
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  // TZ-014: 2FA columns
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 32 }),
  twoFactorBackupCodes: jsonb('two_factor_backup_codes'),
  // TZ-007: settings columns
  initialCapital: numeric('initial_capital').default('0'),
  defaultLotSize: numeric('default_lot_size').default('0.01'),
  timezone: text('timezone').default('UTC'),
  theme: text('theme').default('dark'),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_username').on(table.username),
]);

// ─── trades ───
export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  direction: text('direction').notNull(), // CHECK constraint: buy|sell
  entryPrice: numeric('entry_price').notNull(),
  exitPrice: numeric('exit_price').notNull(),
  lotSize: numeric('lot_size').notNull(),
  pnl: numeric('pnl').notNull(),
  stopLoss: numeric('stop_loss'),
  takeProfit: numeric('take_profit'),
  strategy: text('strategy'),
  notes: text('notes'),
  fomoCheck: boolean('fomo_check').default(false),
  trendAlignment: boolean('trend_alignment').default(false),
  vengeanceTrade: boolean('vengeance_trade').default(false),
  chartImage: text('chart_image'),
  tradeDate: timestamp('trade_date'),
  commission: numeric('commission').default('0'),
  contractSize: numeric('contract_size').default('100000'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_trades_user_created').on(table.userId, table.createdAt.desc()),
  index('idx_trades_user_symbol').on(table.userId, table.symbol),
  index('idx_trades_user_strategy').on(table.userId, table.strategy),
]);

// ─── journals ───
export const journals = pgTable('journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  preMarketNotes: text('pre_market_notes'),
  postMarketNotes: text('post_market_notes'),
  mood: text('mood'), // CHECK: great|good|neutral|bad|terrible
  marketConditions: text('market_conditions'),
  lessons: text('lessons'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  unique('journals_user_id_date_unique').on(table.userId, table.date),
  index('idx_journals_user_date').on(table.userId, table.date.desc()),
]);

// ─── tags ───
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#888888'),
  category: text('category').default('setup'), // CHECK: setup|condition|emotion
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  unique('tags_user_id_name_unique').on(table.userId, table.name),
  index('idx_tags_user').on(table.userId),
]);

// ─── trade_tags (M:N junction) ───
export const tradeTags = pgTable('trade_tags', {
  tradeId: uuid('trade_id').notNull().references(() => trades.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.tradeId, table.tagId] }),
  index('idx_trade_tags_trade').on(table.tradeId),
  index('idx_trade_tags_tag').on(table.tagId),
]);

// ─── login_attempts ───
export const loginAttempts = pgTable('login_attempts', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  ip: varchar('ip', { length: 45 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_login_attempts_identifier').on(table.identifier),
  index('idx_login_attempts_created_at').on(table.createdAt),
]);

// ─── audit_log ───
export const auditLog = pgTable('audit_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: integer('resource_id'),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_audit_log_user_id').on(table.userId),
  index('idx_audit_log_action').on(table.action),
  index('idx_audit_log_created_at').on(table.createdAt),
]);
```

### Step 4: Create Drizzle client
Create `apps/api/src/db/drizzle.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(client, { schema });
export { client };
```

### Step 5: Update db.ts to export both pool and drizzle
Keep existing `pool` export for backward compatibility. Add `db` export from new module:
```typescript
// apps/api/src/db.ts — add at bottom:
export { db } from './db/drizzle';
```

### Step 6: Add npm scripts to apps/api/package.json
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## TZ-022: Shared DB Package

### Step 1: Create packages/db
```bash
mkdir -p packages/db/src/schema
```

### Step 2: package.json
Create `packages/db/package.json`:
```json
{
  "name": "@tradezen/db",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "echo 'no lint'",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

### Step 3: tsconfig.json
Create `packages/db/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "CommonJS",
    "moduleResolution": "node",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### Step 4: Exports
- `packages/db/src/schema/index.ts` — copy all table definitions from TZ-020 Step 3
- `packages/db/src/connection.ts` — Drizzle client factory (env-aware)
- `packages/db/src/types.ts` — inferred TypeScript types via `InferSelectModel`/`InferInsertModel`
- `packages/db/src/index.ts` — barrel export

```typescript
// packages/db/src/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL!, {
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export { schema };
```

```typescript
// packages/db/src/types.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;
export type Trade = InferSelectModel<typeof schema.trades>;
export type NewTrade = InferInsertModel<typeof schema.trades>;
export type Journal = InferSelectModel<typeof schema.journals>;
export type NewJournal = InferInsertModel<typeof schema.journals>;
export type Tag = InferSelectModel<typeof schema.tags>;
export type NewTag = InferInsertModel<typeof schema.tags>;
export type TradeTag = InferSelectModel<typeof schema.tradeTags>;
export type NewTradeTag = InferInsertModel<typeof schema.tradeTags>;
export type LoginAttempt = InferSelectModel<typeof schema.loginAttempts>;
export type NewLoginAttempt = InferInsertModel<typeof schema.loginAttempts>;
export type AuditLogEntry = InferSelectModel<typeof schema.auditLog>;
export type NewAuditLogEntry = InferInsertModel<typeof schema.auditLog>;
```

```typescript
// packages/db/src/index.ts
export { getDb, schema } from './connection';
export * from './types';
export * from './schema';
```

### Step 5: Add to root workspace
Root `package.json` already includes `"packages/*"` in workspaces array. No change needed.

### Step 6: Add @tradezen/db as dependency
```bash
cd apps/api
npm install @tradezen/db@file:../../packages/db
```

In `apps/api/package.json`:
```json
{
  "dependencies": {
    "@tradezen/db": "file:../../packages/db"
  }
}
```

### Step 7: Update apps/api imports
After migration, services import from `@tradezen/db` instead of local `../db`:
```typescript
import { getDb, schema } from '@tradezen/db';
const db = getDb();
```

---

## TZ-021: Migrate CRUD to Drizzle (Incremental)

### Migration Order (by complexity, lowest first)

| Priority | Service | File | Queries | Key Patterns |
|----------|---------|------|---------|--------------|
| 1 | auth | `auth.service.ts` | 6 | Simple SELECT/INSERT/UPDATE, no transactions |
| 2 | tags | `tags.service.ts` | 12 | JOINs, M:N relations, ON CONFLICT duplicate check |
| 3 | journals | `journals.service.ts` | 10 | ON CONFLICT DO UPDATE, CTEs for streaks, dynamic UPDATE |
| 4 | trades | `trades.service.ts` | ~20 | Transactions, dynamic WHERE, analytics aggregations, CSV import/export |
| 5 | brute-force | `brute-force.service.ts` | ~4 | INSERT/SELECT on login_attempts, TTL cleanup |
| 6 | audit | `audit.service.ts` | ~2 | INSERT on audit_log |
| 7 | suspicious-login | `suspicious-login.service.ts` | ~3 | SELECT on login_attempts |

Note: `chat.service.ts` has zero DB queries — skip migration.

### Pattern for each migration
1. Read existing service
2. Identify all raw queries
3. Replace with Drizzle equivalents
4. Keep `pool` import for any queries not yet migrated
5. Run `npx tsc --noEmit` to verify types
6. Commit individually

### Example: auth.service.ts migration

**Before** (`apps/api/src/auth/auth.service.ts:57`):
```typescript
const existing = await pool.query<User>(
  'SELECT id FROM users WHERE email = $1 OR username = $2',
  [email, username],
);
```

**After**:
```typescript
import { eq, or } from 'drizzle-orm';
import { getDb, schema } from '@tradezen/db';

const db = getDb();
const existing = await db.query.users.findFirst({
  where: or(eq(schema.users.email, email), eq(schema.users.username, username)),
  columns: { id: true },
});
```

### Example: tags.service.ts migration

**Before** (`apps/api/src/tags/tags.service.ts:38`):
```typescript
const { rows } = await pool.query(
  `SELECT t.*, COUNT(tt.trade_id)::int AS trade_count
   FROM tags t LEFT JOIN trade_tags tt ON t.id = tt.tag_id
   WHERE t.user_id = $1 GROUP BY t.id ORDER BY t.name`,
  [userId],
);
```

**After**:
```typescript
import { eq, count } from 'drizzle-orm';

const tags = await db
  .select({
    id: schema.tags.id,
    userId: schema.tags.userId,
    name: schema.tags.name,
    color: schema.tags.color,
    category: schema.tags.category,
    createdAt: schema.tags.createdAt,
    tradeCount: count(schema.tradeTags.tradeId),
  })
  .from(schema.tags)
  .leftJoin(schema.tradeTags, eq(schema.tags.id, schema.tradeTags.tagId))
  .where(eq(schema.tags.userId, userId))
  .groupBy(schema.tags.id)
  .orderBy(schema.tags.name);
```

### Example: journals.service.ts ON CONFLICT migration

**Before** (`apps/api/src/journals/journals.service.ts:9`):
```typescript
const { rows } = await pool.query(
  `INSERT INTO journals (user_id, date, pre_market_notes, ...)
   VALUES ($1, $2, $3, ...)
   ON CONFLICT (user_id, date) DO UPDATE SET
     pre_market_notes = COALESCE(EXCLUDED.pre_market_notes, journals.pre_market_notes),
     ...
   RETURNING *`,
  [userId, dto.date, ...],
);
```

**After**:
```typescript
import { eq } from 'drizzle-orm';

const [journal] = await db
  .insert(schema.journals)
  .values({
    userId,
    date: dto.date,
    preMarketNotes: dto.pre_market_notes,
    postMarketNotes: dto.post_market_notes,
    mood: dto.mood,
    marketConditions: dto.market_conditions,
    lessons: dto.lessons,
  })
  .onConflictDoUpdate({
    target: [schema.journals.userId, schema.journals.date],
    set: {
      preMarketNotes: eq(schema.journals.preMarketNotes, db.raw('EXCLUDED.pre_market_notes')),
      // ... or use sql`COALESCE(EXCLUDED.pre_market_notes, journals.pre_market_notes)`
    },
  })
  .returning();
```

Note: Drizzle's `onConflictDoUpdate` with `COALESCE` requires `sql` template literal for complex expressions. Alternative: fetch existing, merge in JS, then upsert.

### Example: trades.service.ts analytics migration

**Before** (`apps/api/src/trades/trades.service.ts:340`):
```typescript
pool.query(
  `SELECT COUNT(*)::int AS total_trades,
          COALESCE(SUM(pnl), 0)::float8 AS total_pnl,
          ...
   FROM trades WHERE user_id = $1`,
  [userId],
)
```

**After**:
```typescript
import { eq, count, sum, coalesce, max, min, avg, sql } from 'drizzle-orm';

const summary = await db
  .select({
    totalTrades: count(),
    totalPnl: coalesce(sum(schema.trades.pnl), sql`0`),
    winCount: count(sql`CASE WHEN ${schema.trades.pnl} > 0 THEN 1 END`),
    lossCount: count(sql`CASE WHEN ${schema.trades.pnl} < 0 THEN 1 END`),
    grossProfit: coalesce(sum(sql`CASE WHEN ${schema.trades.pnl} > 0 THEN ${schema.trades.pnl} END`), sql`0`),
    grossLoss: coalesce(sum(sql`CASE WHEN ${schema.trades.pnl} < 0 THEN ABS(${schema.trades.pnl}) END`), sql`0`),
    bestTrade: coalesce(max(schema.trades.pnl), sql`0`),
    worstTrade: coalesce(min(schema.trades.pnl), sql`0`),
    avgWin: coalesce(avg(sql`CASE WHEN ${schema.trades.pnl} > 0 THEN ${schema.trades.pnl} END`), sql`0`),
    avgLoss: coalesce(avg(sql`CASE WHEN ${schema.trades.pnl} < 0 THEN ABS(${schema.trades.pnl}) END`), sql`0`),
    fomoCount: count(sql`CASE WHEN ${schema.trades.fomoCheck} THEN 1 END`),
    vengeanceCount: count(sql`CASE WHEN ${schema.trades.vengeanceTrade} THEN 1 END`),
    trendAlignedCount: count(sql`CASE WHEN ${schema.trades.trendAlignment} THEN 1 END`),
  })
  .from(schema.trades)
  .where(eq(schema.trades.userId, userId));
```

### Transaction handling

Current pattern uses `withTransaction()` helper. Drizzle equivalent:

**Before**:
```typescript
return withTransaction(async (client) => {
  const res = await client.query('INSERT INTO trades ...', [...]);
  return res.rows[0];
});
```

**After**:
```typescript
return await db.transaction(async (tx) => {
  const [trade] = await tx.insert(schema.trades).values({...}).returning();
  return trade;
});
```

### Dynamic WHERE builder (trades findAll)

**Before** (`apps/api/src/trades/trades.service.ts:119`):
```typescript
const conditions: string[] = ['user_id = $1'];
const params: any[] = [userId];
let idx = 2;
if (symbol) { conditions.push(`symbol ILIKE $${idx}`); params.push(`%${symbol}%`); idx++; }
// ...
const where = conditions.join(' AND ');
```

**After**:
```typescript
import { and, eq, ilike, gte, lte } from 'drizzle-orm';

const conditions = [eq(schema.trades.userId, userId)];
if (symbol) conditions.push(ilike(schema.trades.symbol, `%${symbol}%`));
if (direction) conditions.push(eq(schema.trades.direction, direction));
if (strategy) conditions.push(ilike(schema.trades.strategy, `%${strategy}%`));
if (from) conditions.push(gte(schema.trades.createdAt, from));
if (to) conditions.push(lte(schema.trades.createdAt, to));

const total = await db.select({ count: count() })
  .from(schema.trades)
  .where(and(...conditions));

const data = await db.select()
  .from(schema.trades)
  .where(and(...conditions))
  .orderBy(desc(schema.trades.createdAt))
  .limit(limit)
  .offset(offset);
```

---

## TZ-023: Introduce tRPC

### Step 1: Install dependencies
```bash
cd apps/api
npm install @trpc/server zod

cd apps/web
npm install @trpc/client @trpc/react-query @tanstack/react-query
```

### Step 2: Create tRPC server setup
Create `apps/api/src/trpc/router.ts`:
```typescript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure.query(() => 'ok'),
});

export type AppRouter = typeof appRouter;
```

Create `apps/api/src/trpc/index.ts`:
```typescript
export { appRouter, type AppRouter } from './router';
```

### Step 3: Create tRPC HTTP handler in main.ts
In `apps/api/src/main.ts`, add after existing Express setup:
```typescript
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router';

// Existing NestJS bootstrap...
const app = await NestFactory.create(AppModule);

// tRPC endpoint at /trpc
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
  }),
);

await app.listen(3001);
```

Note: NestJS and tRPC coexist on same Express instance. REST endpoints at `/api/*`, tRPC at `/trpc`.

### Step 4: Create tRPC client in web app
Create `apps/web/lib/trpc.ts`:
```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@tradezen/api/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();
```

Note: This requires `@tradezen/api` to be accessible from web app. Alternative: define router type in shared package or use HTTP link with URL inference.

### Step 5: Wrap web app with tRPC provider
In `apps/web/app/providers.tsx` (or root layout):
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from '../lib/trpc';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

---

## TZ-024: Migrate Internal APIs to tRPC

### Start with read-only endpoints

| # | Current REST | tRPC Procedure | Input Schema |
|---|-------------|----------------|--------------|
| 1 | `GET /api/trades` | `trpc.trades.list` | `{ page?, limit?, symbol?, direction?, strategy?, from?, to? }` |
| 2 | `GET /api/journals` | `trpc.journals.list` | `{ limit?, offset? }` |
| 3 | `GET /api/tags` | `trpc.tags.list` | `{}` (userId from auth context) |
| 4 | `GET /api/trades/analytics` | `trpc.trades.analytics` | `{}` |
| 5 | `GET /api/journals/streak` | `trpc.journals.streak` | `{}` |
| 6 | `GET /api/trades/daily-pnl` | `trpc.trades.dailyPnl` | `{ from?, to? }` |

### Pattern for each migration
1. Create Zod input schema (or use from `packages/db/src/schemas/validation.ts`)
2. Create tRPC procedure with input validation
3. Use Drizzle for query
4. Update web app to use tRPC client instead of fetch
5. Keep REST endpoint for backward compatibility (dual-write phase)

### Example: trades list procedure
```typescript
// apps/api/src/trpc/router.ts
import { z } from 'zod';
import { getDb, schema } from '@tradezen/db';
import { eq, and, ilike, desc, count } from 'drizzle-orm';

const tradesListInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  symbol: z.string().optional(),
  direction: z.enum(['buy', 'sell']).optional(),
  strategy: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const appRouter = router({
  health: publicProcedure.query(() => 'ok'),

  trades: router({
    list: publicProcedure
      .input(tradesListInput)
      .query(async ({ input }) => {
        const db = getDb();
        const userId = 'current-user-id'; // TODO: from auth middleware

        const conditions = [eq(schema.trades.userId, userId)];
        if (input.symbol) conditions.push(ilike(schema.trades.symbol, `%${input.symbol}%`));
        if (input.direction) conditions.push(eq(schema.trades.direction, input.direction));
        if (input.strategy) conditions.push(ilike(schema.trades.strategy, `%${input.strategy}%`));
        if (input.from) conditions.push(gte(schema.trades.createdAt, input.from));
        if (input.to) conditions.push(lte(schema.trades.createdAt, input.to));

        const [{ total }] = await db
          .select({ total: count() })
          .from(schema.trades)
          .where(and(...conditions));

        const data = await db
          .select()
          .from(schema.trades)
          .where(and(...conditions))
          .orderBy(desc(schema.trades.createdAt))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit);

        return {
          data,
          meta: {
            total,
            page: input.page,
            limit: input.limit,
            totalPages: Math.ceil(total / input.limit),
          },
        };
      }),
  }),
});
```

### Auth integration
tRPC middleware for user context:
```typescript
// apps/api/src/trpc/middleware.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { JwtService } from '@nestjs/jwt';

const t = initTRPC.context<Context>().create();

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new TRPCError({ code: 'UNAUTHORIZED' });

  try {
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const payload = jwt.verify(token);
    return next({ ctx: { userId: payload.sub } });
  } catch {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
});
```

---

## TZ-025: Shared Validation Layer

### Step 1: Create Zod schemas in packages/db
Create `packages/db/src/validation.ts`:
```typescript
import { z } from 'zod';

// ─── Trades ───
export const createTradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  direction: z.enum(['buy', 'sell']),
  entry: z.number().positive(),
  exit: z.number().positive(),
  lot: z.number().positive(),
  stop_loss: z.number().nullable().optional(),
  take_profit: z.number().nullable().optional(),
  strategy: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  fomo_check: z.boolean().optional().default(false),
  trend_alignment: z.boolean().optional().default(false),
  vengeance_trade: z.boolean().optional().default(false),
  trade_date: z.string().datetime().optional().nullable(),
  commission: z.number().optional().nullable(),
  contract_size: z.number().optional().default(100000),
});

export const updateTradeSchema = createTradeSchema.partial();

export const queryTradesSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.enum(['created_at', 'pnl', 'symbol']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  symbol: z.string().optional(),
  direction: z.enum(['buy', 'sell']).optional(),
  strategy: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ─── Journals ───
export const createJournalSchema = z.object({
  date: z.string().date(),
  pre_market_notes: z.string().optional().nullable(),
  post_market_notes: z.string().optional().nullable(),
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']).optional().nullable(),
  market_conditions: z.string().optional().nullable(),
  lessons: z.string().optional().nullable(),
});

export const updateJournalSchema = createJournalSchema.partial();

// ─── Tags ───
export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#888888'),
  category: z.enum(['setup', 'condition', 'emotion']).optional().default('setup'),
});

export const updateTagSchema = createTagSchema.partial();

// ─── Auth ───
export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  remember_me: z.boolean().optional().default(false),
});

export const updateSettingsSchema = z.object({
  initial_capital: z.number().positive().optional(),
  default_lot_size: z.number().positive().optional(),
  timezone: z.string().optional(),
  theme: z.enum(['dark', 'light']).optional(),
});

// Type exports
export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;
export type QueryTradesInput = z.infer<typeof queryTradesSchema>;
export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
```

### Step 2: Update packages/db barrel export
```typescript
// packages/db/src/index.ts
export { getDb, schema } from './connection';
export * from './types';
export * from './schema';
export * from './validation';
```

### Step 3: Use schemas in tRPC procedures
```typescript
import { createTradeSchema } from '@tradezen/db';

export const createTrade = protectedProcedure
  .input(createTradeSchema)
  .mutation(async ({ input, ctx }) => {
    const db = getDb();
    const [trade] = await db.insert(schema.trades)
      .values({ ...input, userId: ctx.userId })
      .returning();
    return trade;
  });
```

### Step 4: Gradually replace class-validator DTOs
- Keep class-validator for existing REST endpoints (no breaking changes)
- Use Zod for new tRPC endpoints
- Create adapter layer: class-validator DTO → Zod schema for shared validation
- Eventually deprecate class-validator when all endpoints migrated to tRPC

---

## Execution Order

```
Phase 1: Foundation (TZ-020 + TZ-022)
├── TZ-020: Install drizzle-orm, create schema, create drizzle client
├── TZ-022: Create packages/db, export schemas + types + connection
└── Verify: TypeScript compiles, both pool and db exports work

Phase 2: Migrate CRUD (TZ-021)
├── 2.1: auth.service.ts (6 queries, simplest)
├── 2.2: tags.service.ts (12 queries, JOINs)
├── 2.3: journals.service.ts (10 queries, ON CONFLICT, CTEs)
├── 2.4: trades.service.ts (~20 queries, analytics, CSV)
├── 2.5: brute-force.service.ts (4 queries)
├── 2.6: audit.service.ts (2 queries)
└── 2.7: suspicious-login.service.ts (3 queries)

Phase 3: tRPC + Zod (TZ-023 + TZ-025)
├── TZ-023: Install tRPC, create router, add Express middleware
├── TZ-025: Create Zod validation schemas in packages/db
├── Add tRPC provider to web app
└── Verify: tRPC health check works from web app

Phase 4: Migrate Internal APIs (TZ-024)
├── 4.1: getTrades → tRPC procedure
├── 4.2: getJournals → tRPC procedure
├── 4.3: getTags → tRPC procedure
├── 4.4: getAnalytics → tRPC procedure
├── 4.5: getStreak → tRPC procedure
├── 4.6: getDailyPnl → tRPC procedure
└── Keep REST endpoints for backward compatibility
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing queries | Keep pool alongside drizzle, migrate one module at a time |
| Type mismatches between Drizzle schema and existing DB | Run `drizzle-kit diff` to verify schema matches migrations |
| tRPC conflicts with REST | Separate URL paths (/trpc vs /api), NestJS and tRPC share Express instance |
| Zod vs class-validator conflict | Use Zod for tRPC, keep class-validator for REST until full migration |
| ON CONFLICT with COALESCE | Use `sql` template literals or JS-side merge for complex upserts |
| Analytics CTEs complex to translate | Keep raw SQL via `db.execute(sql`...`)` for complex analytics initially |
| Transaction compatibility | Drizzle transactions work with postgres-js client, test thoroughly |
| packages/db circular dependency | Keep packages/db pure (no NestJS imports), use factory pattern for connection |

---

## Verification Checklist

- [ ] Drizzle client connects to database
- [ ] All table schemas match existing migrations (verified via `drizzle-kit diff`)
- [ ] packages/db exports work from both apps/api and apps/web
- [ ] auth.service.ts fully migrated to Drizzle
- [ ] tags.service.ts fully migrated to Drizzle
- [ ] journals.service.ts fully migrated to Drizzle
- [ ] trades.service.ts fully migrated to Drizzle
- [ ] brute-force.service.ts fully migrated to Drizzle
- [ ] audit.service.ts fully migrated to Drizzle
- [ ] suspicious-login.service.ts fully migrated to Drizzle
- [ ] tRPC health check returns 'ok'
- [ ] tRPC client can call health check from web app
- [ ] Zod schema validates createTrade input correctly
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] npm run lint passes
- [ ] npm run check-types passes
- [ ] All existing REST endpoints still functional
- [ ] No regression in trade analytics calculations

---

## File Change Summary

### New files to create
| File | Purpose |
|------|---------|
| `apps/api/drizzle.config.ts` | Drizzle Kit configuration |
| `apps/api/src/db/schema/index.ts` | Drizzle table definitions |
| `apps/api/src/db/drizzle.ts` | Drizzle client instance |
| `apps/api/src/trpc/router.ts` | tRPC router definition |
| `apps/api/src/trpc/index.ts` | tRPC barrel export |
| `apps/api/src/trpc/middleware.ts` | tRPC auth middleware |
| `packages/db/package.json` | Shared DB package manifest |
| `packages/db/tsconfig.json` | Shared DB TypeScript config |
| `packages/db/src/schema/index.ts` | Table schemas (shared) |
| `packages/db/src/connection.ts` | Drizzle client factory |
| `packages/db/src/types.ts` | Inferred TypeScript types |
| `packages/db/src/validation.ts` | Zod validation schemas |
| `packages/db/src/index.ts` | Barrel export |
| `apps/web/lib/trpc.ts` | tRPC React client |
| `apps/web/app/providers.tsx` | tRPC + QueryClient provider |

### Files to modify
| File | Change |
|------|--------|
| `apps/api/src/db.ts` | Add `export { db } from './db/drizzle'` |
| `apps/api/src/main.ts` | Add tRPC Express middleware |
| `apps/api/package.json` | Add drizzle-orm, @trpc/server, zod, npm scripts |
| `apps/api/src/auth/auth.service.ts` | Replace pool.query with Drizzle |
| `apps/api/src/tags/tags.service.ts` | Replace pool.query with Drizzle |
| `apps/api/src/journals/journals.service.ts` | Replace pool.query with Drizzle |
| `apps/api/src/trades/trades.service.ts` | Replace pool.query with Drizzle |
| `apps/api/src/common/services/brute-force.service.ts` | Replace pool.query with Drizzle |
| `apps/api/src/common/services/audit.service.ts` | Replace pool.query with Drizzle |
| `apps/api/src/common/services/suspicious-login.service.ts` | Replace pool.query with Drizzle |
| `apps/web/package.json` | Add @trpc/client, @trpc/react-query, @tanstack/react-query |
