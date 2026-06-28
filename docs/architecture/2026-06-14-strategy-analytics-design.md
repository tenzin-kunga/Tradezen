# Feature 4: Advanced Strategy Analytics

**Date:** 2026-06-14
**Status:** Draft
**Version:** 1.0

---

## Overview

Enrich the existing Strategy tab on `/analytics` with 5 grouped bar charts (one per metric), a multi-line trend chart showing each strategy's PnL over time, and a side drawer that opens when clicking a strategy to reveal detailed performance + monthly trend.

---

## Backend Changes

### 1. Enhance `GET /trades/analytics/strategy`

Add two fields to each `StrategyPerformance` entry:

| Field         | Source                                        | Notes        |
| ------------- | --------------------------------------------- | ------------ |
| `avgRr`       | Compute from trades: avg(r/r ratio)           | Per strategy |
| `maxDrawdown` | Compute from trades via cumulative PnL series | Per strategy |

### 2. New Endpoint: `GET /trades/analytics/strategy/:name/performance`

Returns monthly time series + summary for a single strategy.

**Response:**

```ts
{
  strategy: string;
  monthly: {
    month: string; // "YYYY-MM"
    trades: number;
    pnl: number;
    winRate: number; // 0-100
  }
  [];
}
```

Implementation: Query trades filtered by strategy, group by `strftime('%Y-%m', exit_date)`, compute aggregated stats per month.

---

## Frontend Changes

### Files Changed

| File                                     | Change                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `app/analytics/page.tsx`                 | Enrich Strategy tab content                        |
| `components/StrategyBarCharts.tsx`       | **New** — 5 grouped bar charts                     |
| `components/StrategyTrendChart.tsx`      | **New** — Multi-line trend chart                   |
| `components/StrategyDrawer.tsx`          | **New** — Side drawer with strategy detail         |
| `components/StrategyComparisonTable.tsx` | **New** — Replace inline table with richer version |
| `lib/api.ts`                             | Add `getStrategyPerformance(strategyName)`         |

### Strategy Tab Layout

```
┌──────────────────────────────────────────────────┐
│ Strategy Tab                                     │
│                                                   │
│ ┌─ Best Strategy Card ─┐ ┌─ Worst Strategy Card ┐│
│ │ Scalping: +$12,450   │ │ News: -$2,100        ││
│ │ 145 trades • 62% WR  │ │ 32 trades • 38% WR   ││
│ └──────────────────────┘ └──────────────────────┘│
│                                                   │
│ ┌─ Metrics Bar Charts (5) ──────────────────────┐│
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐       ││
│ │ │ Win Rate │ │  Profit  │ │Expectedcy│       ││
│ │ │          │ │  Factor  │ │          │       ││
│ │ └──────────┘ └──────────┘ └──────────┘       ││
│ │ ┌──────────┐ ┌──────────┐                     ││
│ │ │ Avg RR   │ │Max Draw- │                     ││
│ │ │          │ │  down    │                     ││
│ │ └──────────┘ └──────────┘                     ││
│ └───────────────────────────────────────────────┘│
│                                                   │
│ ┌─ Trend Chart ─────────────────────────────────┐│
│ │ 📈 Multi-line PnL by month                    ││
│ │  (one line per strategy, color-coded)         ││
│ │  Legend: toggleable                           ││
│ └───────────────────────────────────────────────┘│
│                                                   │
│ ┌─ Comparison Table ────────────────────────────┐│
│ │ Strategy │ Trades │ WR │ PF │ Exp │ RR │ DD  ││
│ │ Scalping │ 145    │ 62%│ 1.8│12.4 │ 1.2│ -8% ││  ← clickable
│ │ Swing    │ 89     │ 55%│ 1.5│ 3.2 │ 1.8│-12% ││  ← clickable
│ │ ...      │        │    │    │     │    │     ││
│ └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### Grouped Bar Charts (5)

Each chart is a `ResponsiveContainer` + `BarChart` from Recharts:

| Chart         | Metric           | Color        | Notes                   |
| ------------- | ---------------- | ------------ | ----------------------- |
| Win Rate      | winRate (0-100%) | Green scale  | Show % on bars          |
| Profit Factor | profitFactor     | Blue scale   | Clip at 5+ for outliers |
| Expectancy    | expectancy ($)   | Purple scale | Show $ value            |
| Avg RR        | avgRr            | Orange scale | Show X.X                |
| Max Drawdown  | maxDrawdown (%)  | Red scale    | Show negative value     |

Layout: 3-column grid on `lg+`, 2-column on `md`, 1-column on `sm`.

### Multi-line Trend Chart

Single `LineChart` with:

- X-axis: month labels ("Jan", "Feb", etc.)
- Y-axis: PnL ($)
- One `Line` per strategy with `type="monotone"`, color from chart color palette
- `Legend` with clickable items to toggle visibility
- `Tooltip` showing strategy name + PnL + trade count on hover

### Side Drawer (`StrategyDrawer`)

Opens from the right edge when a strategy name/row is clicked.

**Contents:**

1. **Header**: Strategy name + total PnL (colored green/red) + badge ("Best Strategy" / "Worst Strategy" if applicable)
2. **Metric Summary**: 5 small stat cards in a row:
   - Win Rate, Profit Factor, Expectancy, Avg RR, Max Drawdown
3. **Monthly Trend**: Line chart for this strategy only (same data as multi-line but focused)
4. **Recent Trades**: Mini table of last 10 trades for this strategy (columns: Date, Symbol, Direction, PnL)

**Close**: X button in header, or click outside.

### Enhanced Comparison Table

Same structure as current table but:

- Updated with all 7 columns (Strategy, Trades, Win Rate, Profit Factor, Expectancy, Avg RR, Max Drawdown)
- Each row is clickable → opens StrategyDrawer
- Sortable by any column header click
- Highlight best value in green, worst in red per column

---

## API Data Flow

```
Strategy tab mount
  ├── useAnalytics → GET /trades/analytics (existing, for best/worst strategy + byStrategy basic)
  ├── useStrategyAnalytics → GET /trades/analytics/strategy (enhanced, for full metrics)
  └── On drawer open → GET /trades/analytics/strategy/:name/performance (new)
       └── Cache strategy performance by name in component state
```

---

## Success Criteria

- [ ] `GET /trades/analytics/strategy` returns `avgRr` and `maxDrawdown` per strategy
- [ ] `GET /trades/analytics/strategy/:name/performance` returns monthly time series
- [ ] Strategy tab shows 5 grouped bar charts (WR, PF, Exp, Avg RR, DD)
- [ ] Strategy tab shows multi-line trend chart with legend toggle
- [ ] Enhanced comparison table is sortable, clickable
- [ ] Side drawer opens on strategy click, shows detail + monthly trend + recent trades
- [ ] Type-check passes (api + web)
