# TradeZen Phase 2 — Dashboard Command Center

**Version:** 1.0
**Date:** 2026-06-13
**Duration:** 2–3 Days
**Priority:** Critical
**Status:** Approved

---

## Executive Summary

Phase 1 modernized the visual foundation. Phase 2 transforms the dashboard from a metrics display into a **trading command center** that answers five questions within 5 seconds:

- Am I profitable?
- Am I improving?
- Am I disciplined?
- What should I focus on today?
- What mistakes am I repeating?

---

## Library Decisions

| Library              | Purpose            | Why                                                                                 |
| -------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `lightweight-charts` | Equity curve chart | Professional TradingView-grade charting, interactive crosshair, built-in time range |
| `date-fns`           | Date formatting    | Lightweight, tree-shakeable, no moment.js bloat                                     |

No other new dependencies. All widgets use the Phase 1 design system (Geist, shadcn/ui, existing CSS variables).

---

## Dashboard Layout

```
┌──────────────────────────────────────┐
│ DashboardHero — Welcome + Weekly     │
├────────────────┬─────────────────────┤
│ EquityCurve    │ DailySummaryCard    │
├────────────────┴─────────────────────┤
│ RecentTradesWidget                   │
├────────────────┬─────────────────────┤
│ JournalSnapshot│ BehaviorAnalytics   │
├────────────────┴─────────────────────┤
│ TradingHeatmap (consistency)         │
├────────────────┬─────────────────────┤
│ AnalyticsPrev  │ AI Insights (future)│
└────────────────┴─────────────────────┘
```

### Responsive Breakpoints

- **≥1024px** — Two-column grid (equity + daily, journal + behavior, analytics + ai)
- **768–1023px** — Single-column full-width, widgets stack vertically
- **<768px** — Stacked, priority order: Hero → KPIs → DailySummary → RecentTrades → Journal → Heatmap → Behavior → Analytics

---

## Component Specifications

### 1. DashboardHero (`components/DashboardHero.tsx`)

**Purpose:** Personalized greeting that instantly shows weekly activity.

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Welcome back, {user.username}  👋          │
│                                             │
│  12 TRADES         +₹4,250          64%     │
│  THIS WEEK         WEEKLY P&L       WIN RATE│
└─────────────────────────────────────────────┘
```

**Data:** Fetched from `GET /api/trades/stats/weekly` or computed client-side from trades array:

- `tradesThisWeek` — count of trades with `exit_date` in current ISO week
- `weeklyPnl` — sum of `pnl` for those trades (formatted with ₹ prefix, green/red)
- `weeklyWinRate` — percentage of winning trades this week

**Empty state:** If 0 trades this week, show "Start this week strong — log your first trade" with CTA.

**Styling:** Accent gradient background (same as Phase 1), Geist font.

---

### 2. Equity Curve (`components/EquityCurve.tsx`)

**Purpose:** The visual centerpiece of the dashboard.

**Library:** `lightweight-charts` (TradingView)

**Data:** `GET /api/trades/equity` — array of `{ date: string, cumulativePnl: number }` sorted chronologically.

**Time range tabs:**

```
[1W] [1M] [3M] [6M] [1Y] [ALL]
```

- Active tab filters the displayed series
- Default: 1M
- Smooth line series, gradient fill under the curve
- Green fill when above zero, red fill when below

**Features:**

- Interactive crosshair tooltip showing date + P&L
- Responsive width, fixed height ~300px
- Loading: skeleton shimmer matching StatCard skeleton pattern

---

### 3. Daily Summary (`components/DailySummaryCard.tsx`)

**Purpose:** Instant view of today's trading status.

**Layout:**

```
┌─────────────────────────────────────┐
│  Today's Trading                    │
│                                     │
│  Trades Taken    3                  │
│  Win Rate        67%                │
│  Current P&L     +₹750             │
│  Open Risk       ₹500              │
└─────────────────────────────────────┘
```

**Data:** Computed from trades where `exit_date` is today:

- `tradesToday` — count
- `winRateToday` — percentage
- `pnlToday` — sum of PnL
- `openRisk` — sum of risk on trades still open (no exit_date)

**Empty state:** "No trading activity today." with subtle dim text.

---

### 4. Recent Trades Widget (`components/RecentTradesWidget.tsx`)

**Purpose:** Quick access to latest 5 trades.

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Recent Trades                   [View All] │
│                                             │
│  NIFTY  LONG  +₹1,200  2.4R  Today     ⋮   │
│  BANKN  SHORT -₹800   1.1R  Yesterday   ⋮   │
│  ...                                        │
└─────────────────────────────────────────────┘
```

**Columns:** Symbol, Direction (LONG/SHORT badge), PnL (green/red), R:R, Date (relative), Actions menu

**Actions menu (⋮):**

- View Details
- Edit Trade
- Delete Trade (with confirmation dialog)

**Data:** `GET /api/trades?limit=5&sort=exit_date&order=desc`

**Empty state:** Should never show on dashboard if using existing empty state logic (CTA to log first trade).

---

### 5. Journal Snapshot (`components/JournalSnapshotWidget.tsx`)

**Purpose:** Surface the latest journal entry to build the journaling habit.

**Layout:**

```
┌─────────────────────────────────────┐
│  Latest Journal Entry     [View All]│
│                                     │
│  😌  Focused                        │
│  📈  Trending market                │
│  💡  Wait for confirmation          │
└─────────────────────────────────────┘
```

**Data:** Latest journal entry from `GET /api/journal/latest`:

- `mood` — emoji + label
- `market_conditions` — short string
- `lesson` — truncated to 2 lines

**Empty state:** "No journal entries yet. Start building the habit." + CTA to `/journal`.

---

### 6. Trading Consistency Heatmap (`components/TradingHeatmap.tsx`)

**Purpose:** GitHub-style contributions graph showing trading discipline.

**Layout:**

```
┌─────────────────────────────────────┐
│  Trading Consistency      [Details] │
│                                     │
│  MON ██░░███░██░░██                 │
│  TUE ███░░█░░███░█                  │
│  ...                                │
│                                     │
│  Less ◀━━━━━━━▶ More               │
│       ██   ██   ██                  │
│      Light Med  Heavy               │
└─────────────────────────────────────┘
```

**Color scale:**

- Dark green — traded with discipline (journaled, followed plan)
- Light green — traded (basic)
- Yellow — traded without journal
- Red — revenge/impulsive trading
- Gray — no trading

**Data source:** Computed from trades + journals by date. A day is "disciplined" if:

- At least 1 trade with a journal entry
- No revenge trades flagged
- Followed risk limits

**Empty state:** "Consistency data will appear once you start trading."

---

### 7. Behavior Analytics Widget (`components/BehaviorAnalyticsWidget.tsx`)

**Purpose:** Surface psychological patterns and discipline metrics.

**Layout:**

```
┌─────────────────────────────────────┐
│  Behavior Analytics                 │
│                                     │
│  Discipline    84/100  ████████░░   │
│  FOMO Score    Low     🟢           │
│  Revenge Trades  2    This month    │
│  Trend Align   78%    ███████░░░    │
└─────────────────────────────────────┘
```

**Data source:** Computed from trade tags + flags:

- `discipline_score` — weighted composite from journaling %, plan adherence, risk compliance
- `fomo_score` — detected from late entries, above-average position size
- `revenge_trades` — consecutive losses followed by oversized trade
- `trend_alignment` — percentage of trades in direction of prevailing trend

**Empty state:** "Behavioral insights appear after 10+ trades."

---

### 8. Analytics Preview Widget (`components/AnalyticsPreviewWidget.tsx`)

**Purpose:** Encourage exploration of the analytics page.

**Layout:**

```
┌─────────────────────────────────────┐
│  Top Insights           [Full →]    │
│                                     │
│  Best Strategy    Breakout          │
│  Best Day         Tuesday           │
│  Avg R:R          2.3R              │
│  Profit Factor    1.85              │
└─────────────────────────────────────┘
```

**Data source:** Computed from trades:

- `best_strategy` — strategy with highest win rate (min 5 trades)
- `best_day` — day of week with highest avg P&L
- `avg_rr` — mean R:R across all trades
- `profit_factor` — gross profit / gross loss

**Empty state:** "Analytics preview will appear after 5+ trades."

---

## Backend API Changes

New endpoints needed (or compute client-side from existing trades data):

| Endpoint                   | Purpose                                          | Status |
| -------------------------- | ------------------------------------------------ | ------ |
| `GET /trades/stats/weekly` | Weekly trade count, P&L, win rate                | New    |
| `GET /trades/equity`       | Cumulative P&L over time (daily)                 | New    |
| `GET /trades/behavior`     | Discipline score, FOMO, revenge, trend alignment | New    |
| `GET /trades/insights`     | Best strategy, best day, avg RR, profit factor   | New    |
| `GET /journal/latest`      | Latest journal entry                             | New    |

If the API scope is too large for a 2-3 day sprint, these can be computed client-side from existing trade data using array reduce/map operations as a fallback.

---

## Data Flow

```
Page Load
  │
  ├── AuthProvider → user.username for DashboardHero
  ├── useQuery('/trades') → all widgets compute from trades array
  │     ├── DashboardHero (weekly filter)
  │     ├── EquityCurve (cumulative P&L time series)
  │     ├── DailySummary (today filter)
  │     ├── RecentTradesWidget (last 5)
  │     ├── BehaviorAnalytics (tags/flags analysis)
  │     └── AnalyticsPreview (aggregate stats)
  ├── useQuery('/journal/latest') → JournalSnapshotWidget
  └── useQuery('/trades/daily-stats') → TradingHeatmap
```

All widgets use TanStack Query `useQuery` with appropriate stale times (dashboard data: 30s, journal: 60s).

---

## Error Handling

- Each widget handles its own loading, error, and empty states independently
- Failed API calls show a retry button rather than breaking the entire dashboard
- Skeleton loaders mirror each widget's layout (not generic spinners)

---

## Implementation Order

1. **Backend API endpoints** (or client-side computation) — needed by all widgets
2. **DashboardHero** — simple, no deps, quick win
3. **EquityCurve** — biggest visual impact, install lightweight-charts
4. **DailySummaryCard** — trivial computation from trades
5. **RecentTradesWidget** — reuse existing trade row pattern
6. **JournalSnapshotWidget** — depends on journal API
7. **TradingHeatmap** — medium complexity, data computation
8. **BehaviorAnalyticsWidget** — depends on tag/flag data
9. **AnalyticsPreviewWidget** — simple aggregate computation
10. **Dashboard page rewrite** — `app/page.tsx` grid orchestration + responsive
11. **Polish & testing** — edge cases, empty states, mobile QA

---

## Definition of Done

- [ ] DashboardHero with real weekly stats
- [ ] EquityCurve with lightweight-charts + time range filters
- [ ] DailySummaryCard with today's data
- [ ] RecentTradesWidget with action menu
- [ ] JournalSnapshotWidget linking to journal
- [ ] TradingHeatmap with colored discipline grid
- [ ] BehaviorAnalyticsWidget with 4 metrics
- [ ] AnalyticsPreviewWidget with top insights
- [ ] All widgets have loading, error, and empty states
- [ ] Responsive layout: two-column → single → stacked
- [ ] Build passes: `bun run check-types` clean
- [ ] Lighthouse: no regression on mobile performance
