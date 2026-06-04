# Phase 4A: Analytics Engine — Implementation Plan

> **Date:** 2026-05-16
> **Branch:** develop
> **Strategy:** Sequential foundation → parallel analytics → snapshots

---

## Execution Order

```
TZ-030 (indexes + pagination)
    │
    ├──→ TZ-031 (core metrics + Sharpe) ──→ TZ-034 (snapshots)
    ├──→ TZ-032 (behavioral)
    └──→ TZ-033 (strategy)
```

---

## TZ-030: Query Optimization

### Goal
Add missing indexes, implement cursor pagination, optimize analytics queries.

### Step 1: Create index migration
Create `apps/api/migrations/008_analytics_indexes.sql`:
```sql
-- Analytics-heavy queries need these indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_pnl ON trades(user_id, pnl);
CREATE INDEX IF NOT EXISTS idx_trades_user_date_pnl ON trades(user_id, trade_date, pnl);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol_pnl ON trades(user_id, symbol, pnl);
CREATE INDEX IF NOT EXISTS idx_trades_user_strategy_pnl ON trades(user_id, strategy, pnl);
```

### Step 2: Add cursor pagination to trades.service.ts
Add `findAllCursor` method:
```typescript
async findAllCursor(userId: string, cursor?: string, limit = 20) {
  const query = db.select()
    .from(trades)
    .where(and(
      eq(trades.userId, userId),
      cursor ? lt(trades.id, parseInt(cursor)) : undefined,
    ))
    .orderBy(desc(trades.id))
    .limit(limit + 1);

  const rows = await query;
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1].id.toString() : null;

  return { items, nextCursor, hasMore };
}
```

### Step 3: Optimize getAnalytics queries
- Add `LIMIT` to PnL series fetch (bounded to last 1000 trades)
- Use existing indexes more effectively
- Cache results for 5 minutes (in-memory Map)

### Step 4: Fix getDailyPnl type safety
Replace string-joined WHERE with Drizzle's type-safe query builder.

### Acceptance Criteria
- [ ] Migration 008 creates 4 new indexes
- [ ] Cursor pagination works with `?cursor=123&limit=20`
- [ ] PnL series bounded to 1000 trades max
- [ ] getDailyPnl uses Drizzle query builder
- [ ] TypeScript compiles, lint passes

---

## TZ-031: Professional Analytics Engine

### Goal
Add Sharpe ratio, Sortino ratio, Calmar ratio, and improve existing metrics.

### Current Metrics (already implemented)
- totalTrades, totalPnl, winRate, profitFactor
- avgWin, avgLoss, expectancy
- bestTrade, worstTrade, maxDrawdown
- avgRR (risk-reward ratio)
- maxConsecutiveWins/Losses
- byStrategy, byDayOfWeek, byMonth
- behavioralStats (fomo, vengeance, trend-aligned)

### New Metrics to Add

#### Sharpe Ratio
```typescript
// Annualized Sharpe = (mean_return - risk_free_rate) / std_return * sqrt(252)
// risk_free_rate = 0.05 (5% annual, ~0.0002 daily)
function calculateSharpe(dailyReturns: number[], riskFreeRate = 0.05): number {
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyReturns.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return ((mean - riskFreeRate / 252) / std) * Math.sqrt(252);
}
```

#### Sortino Ratio
```typescript
// Like Sharpe but only penalizes downside volatility
function calculateSortino(dailyReturns: number[], riskFreeRate = 0.05): number {
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const downsideReturns = dailyReturns.filter(r => r < 0);
  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / dailyReturns.length;
  const downsideStd = Math.sqrt(downsideVariance);
  if (downsideStd === 0) return dailyReturns.length > 0 ? Infinity : 0;
  return ((mean - riskFreeRate / 252) / downsideStd) * Math.sqrt(252);
}
```

#### Calmar Ratio
```typescript
// Annual return / max drawdown
function calculateCalmar(totalPnl: number, maxDrawdown: number, days: number): number {
  if (maxDrawdown === 0) return 0;
  const annualReturn = (totalPnl / days) * 252;
  return annualReturn / Math.abs(maxDrawdown);
}
```

#### Additional Metrics
- **Current streak** (active win/loss streak count)
- **Equity curve** (cumulative PnL over time, sampled to 100 points)
- **Top/Bottom symbols** (ranked by total PnL)
- **Win rate by direction** (buy vs sell/short)

### Implementation
Add to `apps/api/src/trades/trades.service.ts`:
- `getAdvancedAnalytics(userId)` method returning all new metrics
- Use existing PnL series data, compute in-memory
- Return alongside existing `getAnalytics` response

### Acceptance Criteria
- [ ] Sharpe ratio calculated correctly (verified against manual calc)
- [ ] Sortino ratio calculated correctly
- [ ] Calmar ratio calculated correctly
- [ ] Current streak included in response
- [ ] Equity curve (100 sampled points) included
- [ ] Top 5 / Bottom 5 symbols by PnL
- [ ] Win rate by direction (buy vs sell)
- [ ] Exposed via REST and tRPC
- [ ] TypeScript compiles, lint passes

---

## TZ-032: Behavioral Analytics

### Goal
Detect trading behavior patterns: FOMO, revenge trading, streaks, time-based patterns.

### Current State
Basic `behavioralStats` exists (fomo_check, vengeance_trade, trend_alignment booleans on trades table).

### New Behavioral Metrics

#### FOMO Detection
- Trades entered within 5 minutes of a large price move (>2% in 1 hour)
- Trades with no stop loss
- Trades with position size > 2x average

#### Revenge Trading Detection
- New trade within 15 minutes of a losing trade
- Position size increasing after consecutive losses
- Trade frequency spike (>3x average daily trades)

#### Time-Based Patterns
- Hour-of-day performance (which hours are most profitable)
- Day-of-week performance (already exists, enhance with PnL)
- Session performance (Asian, European, US sessions)

#### Psychological Metrics
- **Loss chasing score** (0-100 based on revenge trading frequency)
- **Discipline score** (0-100 based on stop loss adherence, plan following)
- **Consistency score** (0-100 based on strategy adherence)

### Implementation
Create `apps/api/src/analytics/behavioral.service.ts`:
```typescript
@Injectable()
export class BehavioralService {
  async analyzeBehavior(userId: string, days = 90): Promise<BehavioralReport> {
    const trades = await this.getRecentTrades(userId, days);
    return {
      fomo: this.detectFOMO(trades),
      revenge: this.detectRevengeTrading(trades),
      timePatterns: this.analyzeTimePatterns(trades),
      scores: this.calculateScores(trades),
    };
  }
}
```

### Acceptance Criteria
- [ ] FOMO detection with specific trade flags
- [ ] Revenge trading detection with time windows
- [ ] Hour-of-day performance breakdown
- [ ] Loss chasing score (0-100)
- [ ] Discipline score (0-100)
- [ ] Consistency score (0-100)
- [ ] Exposed via REST and tRPC
- [ ] TypeScript compiles, lint passes

---

## TZ-033: Strategy Analytics

### Goal
Performance breakdown by strategy, setup, and tag. Comparative analytics.

### New Metrics

#### Strategy Performance
- Win rate, profit factor, expectancy per strategy
- Total PnL per strategy
- Average trade duration per strategy
- Best/worst performing strategy

#### Setup/Tag Performance
- Performance grouped by tag category (SETUP, CONDITION, EMOTION)
- Tag combinations that work well together
- Tags with highest win rate

#### Comparative Analytics
- Strategy A vs Strategy B comparison
- Time period comparison (this month vs last month)
- Symbol performance comparison

### Implementation
Add to `apps/api/src/trades/trades.service.ts`:
- `getStrategyAnalytics(userId)` — per-strategy breakdown
- `getTagAnalytics(userId)` — per-tag performance
- `compareStrategies(userId, strategyA, strategyB)` — head-to-head

### Acceptance Criteria
- [ ] Per-strategy win rate, profit factor, expectancy
- [ ] Per-tag performance breakdown
- [ ] Best/worst strategy identification
- [ ] Strategy comparison endpoint
- [ ] Tag combination analysis
- [ ] Exposed via REST and tRPC
- [ ] TypeScript compiles, lint passes

---

## TZ-034: Analytics Snapshot Architecture

### Goal
On-demand snapshots + nightly reconciliation for historical analytics.

### Step 1: Create snapshot table migration
Create `apps/api/migrations/009_analytics_snapshots.sql`:
```sql
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  snapshot_date DATE NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON analytics_snapshots(user_id, snapshot_date);
```

### Step 2: Create snapshot service
Create `apps/api/src/analytics/snapshot.service.ts`:
```typescript
@Injectable()
export class SnapshotService {
  async createSnapshot(userId: string): Promise<void> {
    const analytics = await this.analyticsService.getAnalytics(userId);
    const advanced = await this.analyticsService.getAdvancedAnalytics(userId);
    const behavioral = await this.behavioralService.analyzeBehavior(userId);

    await db.insert(analyticsSnapshots)
      .values({
        userId: parseInt(userId),
        snapshotDate: new Date(),
        metrics: { analytics, advanced, behavioral },
      })
      .onConflictDoUpdate({
        target: [analyticsSnapshots.userId, analyticsSnapshots.snapshotDate],
        set: { metrics: { analytics, advanced, behavioral }, createdAt: new Date() },
      });
  }

  async getSnapshot(userId: string, date: string): Promise<Snapshot | null> {
    return db.query.analyticsSnapshots.findFirst({
      where: and(
        eq(analyticsSnapshots.userId, parseInt(userId)),
        eq(analyticsSnapshots.snapshotDate, new Date(date)),
      ),
    });
  }

  async getSnapshotHistory(userId: string, days = 30): Promise<Snapshot[]> {
    return db.query.analyticsSnapshots.findMany({
      where: and(
        eq(analyticsSnapshots.userId, parseInt(userId)),
        gte(analyticsSnapshots.snapshotDate, new Date(Date.now() - days * 86400000)),
      ),
      orderBy: desc(analyticsSnapshots.snapshotDate),
    });
  }
}
```

### Step 3: Add on-demand endpoint
Add `POST /analytics/snapshot` to trades controller.

### Step 4: Add nightly reconciliation
Create a scheduled job using `node-cron`:
```bash
npm install node-cron @types/node-cron
```

In `apps/api/src/main.ts`, after server starts:
```typescript
import cron from 'node-cron';

// Nightly snapshot at 23:00 UTC
cron.schedule('0 23 * * *', async () => {
  const users = await db.select({ id: users.id }).from(users);
  for (const user of users) {
    await snapshotService.createSnapshot(user.id.toString());
  }
});
```

### Acceptance Criteria
- [ ] analytics_snapshots table created
- [ ] On-demand snapshot endpoint works
- [ ] Nightly cron job runs at 23:00 UTC
- [ ] Snapshot history queryable by date range
- [ ] Duplicate snapshots handled (upsert)
- [ ] TypeScript compiles, lint passes

---

## Execution Plan

### Phase 1: TZ-030 (Foundation)
- Single implementer agent
- Creates indexes, cursor pagination, optimizes queries
- ~30 minutes

### Phase 2: TZ-031 + TZ-032 + TZ-033 (Parallel Analytics)
- 3 parallel implementer agents
- Each works independently on their analytics domain
- ~45 minutes

### Phase 3: TZ-034 (Snapshots)
- Single implementer agent (depends on TZ-031)
- Creates snapshot infrastructure
- ~20 minutes

### Review Cycles
- Each task gets spec compliance review + code quality review
- Quality fixes applied before proceeding

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes in apps/api
- [ ] `npm run lint -- --filter=api` passes
- [ ] Migration 008 creates 4 indexes
- [ ] Migration 009 creates analytics_snapshots table
- [ ] Cursor pagination returns `{ items, nextCursor, hasMore }`
- [ ] Sharpe/Sortino/Calmar ratios match manual calculations
- [ ] Behavioral scores are 0-100 range
- [ ] Strategy analytics groups correctly by tag/strategy
- [ ] On-demand snapshot creates record in DB
- [ ] Nightly cron job scheduled (verify with log output)
