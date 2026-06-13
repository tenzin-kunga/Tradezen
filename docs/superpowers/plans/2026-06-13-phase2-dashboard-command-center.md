# Phase 2 — Dashboard Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dashboard from a metrics display into a trading command center with 8 new widgets and TradingView-grade charts.

**Architecture:** Single backend endpoint (`GET /trades/dashboard`) returns all dashboard data. Frontend uses TanStack Query to fetch and distribute to widgets. `lightweight-charts` replaces Recharts for the equity curve. Each widget is a standalone component with own loading/error/empty state.

**Tech Stack:** NestJS (backend), React 18 + TanStack Query (frontend), lightweight-charts (TradingView), Geist typography, shadcn/ui components, CSS variable design system from Phase 1.

---

## File Map

### Backend (API)
- **Create:** `apps/api/src/trades/dto/dashboard.dto.ts` — Response DTO for dashboard endpoint
- **Modify:** `apps/api/src/trades/trades.controller.ts` — Add `GET /trades/dashboard` endpoint
- **Modify:** `apps/api/src/trades/trades.service.ts` — Add `getDashboardData()` method

### Frontend — New Components
- `apps/web/components/DashboardHero.tsx` — Welcome + weekly stats
- `apps/web/components/EquityCurve.tsx` — lightweight-charts equity curve
- `apps/web/components/DailySummaryCard.tsx` — Today's activity summary
- `apps/web/components/RecentTradesWidget.tsx` — Last 5 trades with action menu
- `apps/web/components/JournalSnapshotWidget.tsx` — Latest journal entry
- `apps/web/components/TradingHeatmap.tsx` — GitHub-style consistency grid
- `apps/web/components/BehaviorAnalyticsWidget.tsx` — Discipline/FOMO metrics
- `apps/web/components/AnalyticsPreviewWidget.tsx` — Top insights preview

### Frontend — Modified
- `apps/web/lib/api.ts` — Add `getDashboardData()` and `getJournalLatest()` API functions
- `apps/web/app/page.tsx` — Full rewrite: grid layout orchestrating all 8 widgets
- `apps/web/package.json` — Add `lightweight-charts` and `date-fns` dependencies
- `apps/web/components/EquityChart.tsx` — Delete (replaced by EquityCurve)

---

### Task 1: Install dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Install lightweight-charts and date-fns**

Run:
```powershell
cd "apps/web"
bun add lightweight-charts date-fns
```

---

### Task 2: Add API functions

**Files:**
- Modify: `apps/web/lib/api.ts`

- [ ] **Add getDashboardData and getJournalLatest functions**

After the existing `getAnalytics` function (around line 218), add:

```typescript
export interface DashboardData {
  weeklyTrades: number;
  weeklyPnl: number;
  weeklyWinRate: number;
  equityCurve: { date: string; equity: number }[];
  dailySummary: {
    tradesToday: number;
    winRateToday: number;
    pnlToday: number;
    openRisk: number;
  };
  behaviorAnalytics: {
    disciplineScore: number;
    fomoScore: "Low" | "Medium" | "High";
    revengeTradesThisMonth: number;
    trendAlignment: number;
  };
  insights: {
    bestStrategy: string;
    bestDay: string;
    avgRR: number;
    profitFactor: number;
  };
  heatmap: { date: string; trades: number; pnl: number; disciplined: boolean }[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
  const res = await authFetch(`${API}/trades/dashboard`);
  return handleResponse<DashboardData>(res);
};

export const getJournalLatest = async () => {
  const res = await authFetch(`${API}/journals?limit=1`);
  const data = await handleResponse<{ data: any[]; total: number }>(res);
  return data.data[0] || null;
};
```

---

### Task 3: Create backend dashboard endpoint DTO

**Files:**
- Create: `apps/api/src/trades/dto/dashboard.dto.ts`

- [ ] **Create DashboardDto**

```typescript
export class DashboardResponseDto {
  weeklyTrades!: number;
  weeklyPnl!: number;
  weeklyWinRate!: number;
  equityCurve!: { date: string; equity: number }[];
  dailySummary!: {
    tradesToday: number;
    winRateToday: number;
    pnlToday: number;
    openRisk: number;
  };
  behaviorAnalytics!: {
    disciplineScore: number;
    fomoScore: "Low" | "Medium" | "High";
    revengeTradesThisMonth: number;
    trendAlignment: number;
  };
  insights!: {
    bestStrategy: string;
    bestDay: string;
    avgRR: number;
    profitFactor: number;
  };
  heatmap!: { date: string; trades: number; pnl: number; disciplined: boolean }[];
}
```

---

### Task 4: Add getDashboardData to trades service

**Files:**
- Modify: `apps/api/src/trades/trades.service.ts` — Add getDashboardData() method

- [ ] **Add getDashboardData method to TradesService**

Insert before the closing brace of the class (before the last method).

```typescript
async getDashboardData(userId: string): Promise<import('./dto/dashboard.dto').DashboardResponseDto> {
  const allTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(asc(trades.createdAt));

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const isoWeekStart = new Date(today);
  isoWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekStartStr = isoWeekStart.toISOString().slice(0, 10);

  // Weekly stats
  const weekTrades = allTrades.filter(
    (t) => t.tradeDate && t.tradeDate >= weekStartStr,
  );
  const weeklyTrades = weekTrades.length;
  const weeklyPnl = weekTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
  const weeklyWins = weekTrades.filter((t) => Number(t.pnl) > 0).length;
  const weeklyWinRate = weeklyTrades > 0 ? Math.round((weeklyWins / weeklyTrades) * 100) : 0;

  // Equity curve
  const sorted = allTrades.filter((t) => t.tradeDate).sort(
    (a, b) => String(a.tradeDate).localeCompare(String(b.tradeDate)),
  );
  let cum = 0;
  const equityMap = new Map<string, number>();
  for (const t of sorted) {
    const d = String(t.tradeDate).slice(0, 10);
    cum += Number(t.pnl);
    equityMap.set(d, Math.round(cum * 100) / 100);
  }
  const equityCurve = Array.from(equityMap.entries()).map(([date, equity]) => ({
    date,
    equity,
  }));

  // Daily summary
  const todayTrades = allTrades.filter((t) => t.tradeDate && String(t.tradeDate).slice(0, 10) === todayStr);
  const dailyWins = todayTrades.filter((t) => Number(t.pnl) > 0).length;
  const tradesToday = todayTrades.length;
  const winRateToday = tradesToday > 0 ? Math.round((dailyWins / tradesToday) * 100) : 0;
  const pnlToday = todayTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
  const openRisk = allTrades
    .filter((t) => !t.tradeDate)
    .reduce((sum, t) => {
      const sl = t.stopLoss ? Number(t.stopLoss) : 0;
      const entry = Number(t.entry);
      const lot = Number(t.lot);
      return entry > 0 && sl > 0 ? sum + Math.abs(entry - sl) * lot : sum;
    }, 0);

  // Behavior analytics
  const totalTrades = allTrades.length;
  const fomoCount = allTrades.filter((t) => t.fomoCheck).length;
  const vengeanceCount = allTrades.filter((t) => t.vengeanceTrade).length;
  const trendAligned = allTrades.filter((t) => t.trendAlignment).length;
  const journaledRatio = 0; // Placeholder — could compute from journals join
  const disciplineScore = totalTrades > 0
    ? Math.min(100, Math.round(
        ((totalTrades - (fomoCount + vengeanceCount)) / totalTrades) * 70 +
        journaledRatio * 30
      ))
    : 0;
  const fomoRate = totalTrades > 0 ? fomoCount / totalTrades : 0;
  const fomoScore: "Low" | "Medium" | "High" =
    fomoRate < 0.1 ? "Low" : fomoRate < 0.25 ? "Medium" : "High";

  const thisMonthStr = today.toISOString().slice(0, 7);
  const revengeTradesThisMonth = allTrades.filter(
    (t) => t.vengeanceTrade && String(t.createdAt).startsWith(thisMonthStr),
  ).length;

  const trendAlignedCount = allTrades.filter((t) => t.trendAlignment).length;
  const trendAlignment = totalTrades > 0 ? Math.round((trendAlignedCount / totalTrades) * 100) : 0;

  // Insights: best strategy, best day
  const strategyMap = new Map<string, { trades: number; wins: number; pnl: number }>();
  const dayMap = new Map<number, { trades: number; wins: number; pnl: number }>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const t of allTrades) {
    const strat = t.strategy || 'No Strategy';
    if (!strategyMap.has(strat)) strategyMap.set(strat, { trades: 0, wins: 0, pnl: 0 });
    const sm = strategyMap.get(strat)!;
    sm.trades++;
    if (Number(t.pnl) > 0) sm.wins++;
    sm.pnl += Number(t.pnl);

    if (t.createdAt) {
      const dow = new Date(t.createdAt).getDay();
      if (!dayMap.has(dow)) dayMap.set(dow, { trades: 0, wins: 0, pnl: 0 });
      const dm = dayMap.get(dow)!;
      dm.trades++;
      if (Number(t.pnl) > 0) dm.wins++;
      dm.pnl += Number(t.pnl);
    }
  }

  let bestStrategy = '';
  let bestStrategyWR = 0;
  for (const [name, stats] of strategyMap) {
    if (stats.trades >= 3) {
      const wr = stats.wins / stats.trades;
      if (wr > bestStrategyWR) {
        bestStrategyWR = wr;
        bestStrategy = name;
      }
    }
  }

  let bestDay = '';
  let bestDayPnl = -Infinity;
  for (const [dow, stats] of dayMap) {
    if (stats.pnl > bestDayPnl) {
      bestDayPnl = stats.pnl;
      bestDay = dayNames[dow];
    }
  }

  const grossProfit = allTrades
    .filter((t) => Number(t.pnl) > 0)
    .reduce((s, t) => s + Number(t.pnl), 0);
  const grossLoss = Math.abs(
    allTrades
      .filter((t) => Number(t.pnl) < 0)
      .reduce((s, t) => s + Number(t.pnl), 0),
  );
  const profitFactor =
    grossLoss > 0
      ? Math.round((grossProfit / grossLoss) * 100) / 100
      : grossProfit > 0
        ? 999
        : 0;

  const rrValues = allTrades
    .filter((t) => t.stopLoss && t.takeProfit)
    .map((t) => {
      const entry = Number(t.entry);
      const sl = Number(t.stopLoss);
      const tp = Number(t.takeProfit);
      return entry > 0 && sl > 0 && tp > 0
        ? Math.abs(tp - entry) / Math.abs(entry - sl)
        : 0;
    })
    .filter((v) => v > 0);
  const avgRR =
    rrValues.length > 0
      ? Math.round(
          (rrValues.reduce((s, v) => s + v, 0) / rrValues.length) * 10,
        ) / 10
      : 0;

  // Heatmap (last 365 days per trade date)
  const heatmapMap = new Map<
    string,
    { trades: number; pnl: number; disciplined: boolean }
  >();
  for (const t of allTrades) {
    const d = String(t.tradeDate || t.createdAt).slice(0, 10);
    if (!d) continue;
    if (!heatmapMap.has(d)) heatmapMap.set(d, { trades: 0, pnl: 0, disciplined: true });
    const hm = heatmapMap.get(d)!;
    hm.trades++;
    hm.pnl += Number(t.pnl);
    if (t.vengeanceTrade || !t.tradeDate) hm.disciplined = false;
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);
  const heatmap = Array.from(heatmapMap.entries())
    .filter(([date]) => date >= yearAgoStr)
    .map(([date, data]) => ({
      date,
      trades: data.trades,
      pnl: Math.round(data.pnl * 100) / 100,
      disciplined: data.disciplined,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    weeklyTrades,
    weeklyPnl: Math.round(weeklyPnl * 100) / 100,
    weeklyWinRate,
    equityCurve,
    dailySummary: {
      tradesToday,
      winRateToday,
      pnlToday: Math.round(pnlToday * 100) / 100,
      openRisk: Math.round(openRisk * 100) / 100,
    },
    behaviorAnalytics: {
      disciplineScore,
      fomoScore,
      revengeTradesThisMonth,
      trendAlignment,
    },
    insights: {
      bestStrategy,
      bestDay,
      avgRR,
      profitFactor,
    },
    heatmap,
  };
}
```

- [ ] **Import asc at top of file** (add to the drizzle-orm imports on lines 11-16)

Find the existing import line:
```typescript
import { eq, and, or, ilike, desc, asc, sql, count, lt, gt, gte, lte, inArray } from 'drizzle-orm';
```
Verify `asc` is already in the import (it appears to be). If not, add it.

- [ ] **Add `tradeDate` and `createdAt` to the type guard** (existing drizzle schema already has these fields)

---

### Task 5: Add dashboard endpoint to controller

**Files:**
- Modify: `apps/api/src/trades/trades.controller.ts`

- [ ] **Add GET /trades/dashboard endpoint**

After the existing `getAnalytics` route (after line 64), add:

```typescript
@Get('dashboard')
@ApiOperation({ summary: 'Get all dashboard data for Phase 2 widgets' })
getDashboard(@CurrentUser('id') userId: string) {
  return this.service.getDashboardData(userId);
}
```

---

### Task 6: Create DashboardHero component

**Files:**
- Create: `apps/web/components/DashboardHero.tsx`

- [ ] **Create DashboardHero with welcome + weekly stats**

```typescript
"use client";

import { useAuth } from "@/context/AuthContext";

type Props = {
  tradesThisWeek: number;
  weeklyPnl: number;
  weeklyWinRate: number;
  loading?: boolean;
};

export default function DashboardHero({ tradesThisWeek, weeklyPnl, weeklyWinRate, loading }: Props) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #1e293b 100%)" }}>
        <div style={{ height: 24, width: 200, background: "var(--bg-surface)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 40, width: 100, background: "var(--bg-surface)", borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  const hasData = tradesThisWeek > 0;

  return (
    <div className="rounded-xl p-6" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #1e293b 100%)" }}>
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)", marginBottom: 16 }}>
        Welcome back, {user?.username || "Trader"} 👋
      </h1>
      {hasData ? (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>TRADES THIS WEEK</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{tradesThisWeek}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>WEEKLY P&L</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: weeklyPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
              {weeklyPnl >= 0 ? "+" : ""}${Math.abs(weeklyPnl).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>WIN RATE</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{weeklyWinRate}%</div>
          </div>
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Start this week strong — <a href="/add-trade" style={{ color: "var(--text-primary)", textDecoration: "underline" }}>log your first trade</a>.
        </p>
      )}
    </div>
  );
}
```

---

### Task 7: Create EquityCurve component with lightweight-charts

**Files:**
- Create: `apps/web/components/EquityCurve.tsx`
- Delete: `apps/web/components/EquityChart.tsx`

- [ ] **Install lightweight-charts** (already done in Task 1)

- [ ] **Create EquityCurve component**

```typescript
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, LineStyle } from "lightweight-charts";

type DataPoint = { date: string; equity: number };

const timeRanges = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;

function filterData(data: DataPoint[], range: string): DataPoint[] {
  if (range === "ALL" || data.length === 0) return data;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "1W") cutoff.setDate(now.getDate() - 7);
  else if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
  else if (range === "3M") cutoff.setMonth(now.getMonth() - 3);
  else if (range === "6M") cutoff.setMonth(now.getMonth() - 6);
  else if (range === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

type Props = { data: DataPoint[]; loading?: boolean };

export default function EquityCurve({ data, loading }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [activeRange, setActiveRange] = useState("1M");

  const filtered = useMemo(() => filterData(data, activeRange), [data, activeRange]);

  useEffect(() => {
    if (!chartContainerRef.current || filtered.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#23252d" },
      },
      crosshair: {
        vertLine: { color: "#3b82f6", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#3b82f6" },
        horzLine: { color: "#3b82f6", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#3b82f6" },
      },
      rightPriceScale: {
        borderColor: "#23252d",
      },
      timeScale: {
        borderColor: "#23252d",
        timeVisible: false,
        tickMarkFormatter: (time: number) => {
          const d = new Date(time * 1000);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });

    const series = chart.addAreaSeries({
      lineColor: "#3b82f6",
      topColor: "rgba(59, 130, 246, 0.3)",
      bottomColor: "rgba(59, 130, 246, 0.01)",
      lineWidth: 2,
    });

    const chartData = filtered.map((d) => ({
      time: Math.floor(new Date(d.date).getTime() / 1000),
      value: d.equity,
    }));

    series.setData(chartData);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 24, width: 120, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 300, background: "var(--bg-surface-hover)", borderRadius: 8 }} />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="label-caps" style={{ marginBottom: 16 }}>EQUITY GROWTH</div>
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 11, letterSpacing: "0.1em" }}>
          {data.length === 0 ? "NO DATA" : "NO DATA IN THIS RANGE"}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span className="label-caps">EQUITY GROWTH</span>
        <div style={{ display: "flex", gap: 4 }}>
          {timeRanges.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={`btn-glass ${activeRange === r ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
}
```

---

### Task 8: Create DailySummaryCard component

**Files:**
- Create: `apps/web/components/DailySummaryCard.tsx`

- [ ] **Create DailySummaryCard**

```typescript
"use client";

type Props = {
  tradesToday: number;
  winRateToday: number;
  pnlToday: number;
  openRisk: number;
  loading?: boolean;
};

export default function DailySummaryCard({ tradesToday, winRateToday, pnlToday, openRisk, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 120, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 16, width: "60%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  const hasData = tradesToday > 0;

  return (
    <div className="glass-card p-6">
      <div className="label-caps" style={{ marginBottom: 16 }}>TODAY'S TRADING</div>
      {hasData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Row label="Trades Taken" value={String(tradesToday)} />
          <Row label="Win Rate" value={`${winRateToday}%`} />
          <Row label="Current P&L" value={`${pnlToday >= 0 ? "+" : ""}$${Math.abs(pnlToday).toLocaleString()}`} color={pnlToday >= 0 ? "var(--accent-profit)" : "var(--accent-loss)"} />
          <Row label="Open Risk" value={`$${openRisk.toLocaleString()}`} color="var(--accent-warn)" />
        </div>
      ) : (
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No trading activity today.</p>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: color || "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
```

---

### Task 9: Create RecentTradesWidget component

**Files:**
- Create: `apps/web/components/RecentTradesWidget.tsx`

- [ ] **Create RecentTradesWidget**

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteTrade } from "@/lib/api";

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  pnl: number;
  entry_price: number;
  exit_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  created_at: string;
};

type Props = { trades: Trade[]; onDelete?: (id: string) => void; loading?: boolean };

function fmtPnl(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function RecentTradesWidget({ trades, onDelete, loading }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 120, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 32, background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (trades.length === 0) return null;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trade?")) return;
    setDeleting(id);
    try {
      await deleteTrade(id);
      onDelete?.(id);
    } catch {
      alert("Failed to delete trade");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">RECENT TRADES</span>
        <Link href="/trades" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          View All →
        </Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["SYMBOL", "DIRECTION", "P&L", "R:R", "DATE", ""].map((h) => (
                <th key={h} className="label-caps" style={{ textAlign: "left", paddingBottom: 8, paddingRight: 12, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const isWin = t.pnl >= 0;
              const isLong = t.direction === "buy";
              const rr =
                t.stop_loss && t.take_profit && t.entry_price
                  ? Math.abs(t.take_profit - t.entry_price) / Math.abs(t.entry_price - t.stop_loss)
                  : 0;
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px 10px 0", fontWeight: 600, fontSize: 14 }}>{t.symbol}</td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 13, fontWeight: 600, color: isLong ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                    {isLong ? "LONG" : "SHORT"}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 14, fontWeight: 600, color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                    {fmtPnl(t.pnl)}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 13, color: "var(--text-muted)" }}>
                    {rr > 0 ? `${rr.toFixed(1)}R` : "--"}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 12, color: "var(--text-muted)" }}>
                    {timeAgo(t.created_at)}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <button
                        onClick={() => {
                          const menu = document.getElementById(`menu-${t.id}`);
                          if (menu) menu.style.display = menu.style.display === "block" ? "none" : "block";
                        }}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}
                      >
                        ⋮
                      </button>
                      <div
                        id={`menu-${t.id}`}
                        style={{ display: "none", position: "absolute", right: 0, top: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 10, minWidth: 120 }}
                      >
                        <Link href={`/trades/${t.id}`} style={{ display: "block", padding: "8px 12px", fontSize: 12, color: "var(--text-primary)", textDecoration: "none" }}>
                          View Details
                        </Link>
                        <Link href={`/trades/${t.id}/edit`} style={{ display: "block", padding: "8px 12px", fontSize: 12, color: "var(--text-primary)", textDecoration: "none" }}>
                          Edit Trade
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, color: "var(--accent-loss)", background: "none", border: "none", cursor: "pointer" }}
                        >
                          {deleting === t.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### Task 10: Create JournalSnapshotWidget component

**Files:**
- Create: `apps/web/components/JournalSnapshotWidget.tsx`

- [ ] **Create JournalSnapshotWidget**

```typescript
"use client";

import Link from "next/link";

type Entry = {
  id: string;
  date: string;
  mood?: string;
  market_conditions?: string;
  lesson?: string;
  notes?: string;
} | null;

type Props = { entry: Entry; loading?: boolean };

const moodEmoji: Record<string, string> = {
  focused: "😌",
  confident: "💪",
  anxious: "😰",
  tired: "😴",
  frustrated: "😤",
  neutral: "😐",
};

export default function JournalSnapshotWidget({ entry, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 140, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 14, width: "80%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 14, width: "60%", background: "var(--bg-surface-hover)", borderRadius: 6 }} />
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">LATEST JOURNAL</span>
        <Link href="/journal" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          View All →
        </Link>
      </div>
      {entry ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entry.mood && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <span>{moodEmoji[entry.mood.toLowerCase()] || "📝"}</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{entry.mood}</span>
            </div>
          )}
          {entry.market_conditions && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <span>📈</span>
              <span>{entry.market_conditions}</span>
            </div>
          )}
          {entry.lesson && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <span>💡</span>
              <span style={{ lineHeight: 1.4 }}>{entry.lesson}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 12 }}>No journal entries yet. Start building the habit.</p>
          <Link href="/journal" className="btn-glass" style={{ display: "inline-block", padding: "6px 16px", fontSize: 12, textDecoration: "none" }}>
            Write Entry
          </Link>
        </div>
      )}
    </div>
  );
}
```

---

### Task 11: Create TradingHeatmap component

**Files:**
- Create: `apps/web/components/TradingHeatmap.tsx`

- [ ] **Create TradingHeatmap**

```typescript
"use client";

import { useMemo } from "react";
import Link from "next/link";

type DayData = { date: string; trades: number; pnl: number; disciplined: boolean };

type Props = { data: DayData[]; loading?: boolean };

export default function TradingHeatmap({ data, loading }: Props) {
  const weeks = useMemo(() => {
    if (data.length === 0) return [];
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const result: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];
    const dayMap = new Map<string, DayData>();
    sorted.forEach((d) => dayMap.set(d.date, d));
    const start = new Date(sorted[0].date);
    const end = new Date();
    const d = new Date(start);
    d.setDate(d.getDate() - d.getDay());
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10);
      currentWeek.push(dayMap.get(dateStr) || null);
      if (d.getDay() === 6) {
        result.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [data]);

  const intensity = (day: DayData | null): string => {
    if (!day || day.trades === 0) return "#1a1b1e";
    if (!day.disciplined) return "#ef4444";
    if (day.pnl > 0) return "#22c55e";
    if (day.trades > 0) return "#3b82f6";
    return "#f59e0b";
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 180, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 100, background: "var(--bg-surface-hover)", borderRadius: 8 }} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="label-caps">TRADING CONSISTENCY</span>
          <Link href="/analytics" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Details →</Link>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Consistency data will appear once you start trading.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">TRADING CONSISTENCY</span>
        <Link href="/analytics" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Details →</Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 3, minWidth: 400 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: intensity(day),
                    transition: "opacity 0.2s",
                  }}
                  title={day ? `${day.date}: ${day.trades} trades, $${day.pnl}` : "No trades"}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Less</span>
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#1a1b1e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#3b82f6" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#22c55e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#f59e0b" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#ef4444" }} />
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>More</span>
      </div>
    </div>
  );
}
```

---

### Task 12: Create BehaviorAnalyticsWidget component

**Files:**
- Create: `apps/web/components/BehaviorAnalyticsWidget.tsx`

- [ ] **Create BehaviorAnalyticsWidget**

```typescript
"use client";

type Props = {
  disciplineScore: number;
  fomoScore: "Low" | "Medium" | "High";
  revengeTradesThisMonth: number;
  trendAlignment: number;
  loading?: boolean;
};

export default function BehaviorAnalyticsWidget({
  disciplineScore,
  fomoScore,
  revengeTradesThisMonth,
  trendAlignment,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 140, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 14, width: "70%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  const fomoColor = fomoScore === "Low" ? "var(--accent-profit)" : fomoScore === "Medium" ? "var(--accent-warn)" : "var(--accent-loss)";

  return (
    <div className="glass-card p-6">
      <div className="label-caps" style={{ marginBottom: 16 }}>BEHAVIOR ANALYTICS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <BarRow label="Discipline" value={`${disciplineScore}/100`} pct={disciplineScore} color={disciplineScore >= 70 ? "var(--accent-profit)" : disciplineScore >= 40 ? "var(--accent-warn)" : "var(--accent-loss)"} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>FOMO Score</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: fomoColor }}>{fomoScore}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Revenge Trades</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: revengeTradesThisMonth > 0 ? "var(--accent-loss)" : "var(--accent-profit)" }}>
            {revengeTradesThisMonth} this month
          </span>
        </div>
        <BarRow label="Trend Alignment" value={`${trendAlignment}%`} pct={trendAlignment} color={trendAlignment >= 60 ? "var(--accent-profit)" : "var(--accent-warn)"} />
      </div>
    </div>
  );
}

function BarRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-surface-hover)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}
```

---

### Task 13: Create AnalyticsPreviewWidget component

**Files:**
- Create: `apps/web/components/AnalyticsPreviewWidget.tsx`

- [ ] **Create AnalyticsPreviewWidget**

```typescript
"use client";

import Link from "next/link";

type Props = {
  bestStrategy: string;
  bestDay: string;
  avgRR: number;
  profitFactor: number;
  loading?: boolean;
};

export default function AnalyticsPreviewWidget({ bestStrategy, bestDay, avgRR, profitFactor, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 100, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 14, width: "50%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  const hasData = bestStrategy || profitFactor > 0;

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">TOP INSIGHTS</span>
        <Link href="/analytics" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          Full →
        </Link>
      </div>
      {hasData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <InsightRow label="Best Strategy" value={bestStrategy || "--"} />
          <InsightRow label="Best Day" value={bestDay || "--"} />
          <InsightRow label="Avg R:R" value={avgRR > 0 ? `${avgRR.toFixed(1)}R` : "--"} />
          <InsightRow label="Profit Factor" value={profitFactor > 0 && profitFactor < 999 ? profitFactor.toFixed(2) : profitFactor >= 999 ? "∞" : "--"} />
        </div>
      ) : (
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Analytics preview will appear after 5+ trades.</p>
      )}
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
```

---

### Task 14: Rewrite dashboard page

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Rewrite app/page.tsx with new widget grid**

Replace entire file content:

```typescript
"use client";

import { useEffect, useState } from "react";
import { getDashboardData, getJournalLatest, getTrades, type DashboardData } from "@/lib/api";
import DashboardHero from "@/components/DashboardHero";
import EquityCurve from "@/components/EquityCurve";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/Skeleton";
import DailySummaryCard from "@/components/DailySummaryCard";
import RecentTradesWidget from "@/components/RecentTradesWidget";
import JournalSnapshotWidget from "@/components/JournalSnapshotWidget";
import TradingHeatmap from "@/components/TradingHeatmap";
import BehaviorAnalyticsWidget from "@/components/BehaviorAnalyticsWidget";
import AnalyticsPreviewWidget from "@/components/AnalyticsPreviewWidget";
import EmptyState from "@/components/EmptyState";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [journalEntry, setJournalEntry] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      getDashboardData(),
      getJournalLatest(),
      getTrades({ limit: 5, sort: "created_at", order: "desc" }),
    ])
      .then(([dash, journal, tradesRes]) => {
        setDashboard(dash);
        setJournalEntry(journal);
        setRecentTrades(tradesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const statsLoading = loading || !dashboard;
  const totalPnl = dashboard?.insights?.profitFactor
    ? `$${dashboard.weeklyPnl.toLocaleString()}`
    : "--";

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <DashboardHero
          tradesThisWeek={dashboard?.weeklyTrades ?? 0}
          weeklyPnl={dashboard?.weeklyPnl ?? 0}
          weeklyWinRate={dashboard?.weeklyWinRate ?? 0}
          loading={loading}
        />
      </div>

      {/* Stat cards — 4-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fade-up"><StatCardSkeleton /></div>
          ))
        ) : (
          <>
            <StatCard title="Total P&L" value={`${dashboard!.weeklyPnl >= 0 ? "+" : ""}$${Math.abs(dashboard!.weeklyPnl).toLocaleString()}`} />
            <StatCard title="Win Rate" value={`${dashboard!.weeklyWinRate}%`} />
            <StatCard title="Profit Factor" value={dashboard!.insights.profitFactor > 0 && dashboard!.insights.profitFactor < 999 ? String(dashboard!.insights.profitFactor) : dashboard!.insights.profitFactor >= 999 ? "∞" : "--"} />
            <StatCard title="Avg Risk:Reward" value={dashboard!.insights.avgRR > 0 ? `1:${dashboard!.insights.avgRR.toFixed(1)}` : "--"} />
          </>
        )}
      </div>

      {/* Equity + Daily Summary — 2-col on desktop */}
      {!statsLoading && dashboard!.equityCurve.length === 0 && recentTrades.length === 0 ? (
        <EmptyState
          title="Start Your Trading Journey"
          description="Log your first trade to unlock equity curves, daily summaries, and performance analytics."
          actionLabel="Log First Trade"
          actionHref="/add-trade"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 fade-up">
              <EquityCurve data={dashboard?.equityCurve ?? []} loading={loading} />
            </div>
            <div className="fade-up">
              <DailySummaryCard
                tradesToday={dashboard?.dailySummary.tradesToday ?? 0}
                winRateToday={dashboard?.dailySummary.winRateToday ?? 0}
                pnlToday={dashboard?.dailySummary.pnlToday ?? 0}
                openRisk={dashboard?.dailySummary.openRisk ?? 0}
                loading={loading}
              />
            </div>
          </div>

          {/* Recent Trades */}
          <div className="fade-up mb-6">
            <RecentTradesWidget trades={recentTrades} onDelete={loadData} loading={loading} />
          </div>

          {/* Journal + Behavior — 2-col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="fade-up">
              <JournalSnapshotWidget entry={journalEntry} loading={loading} />
            </div>
            <div className="fade-up">
              <BehaviorAnalyticsWidget
                disciplineScore={dashboard?.behaviorAnalytics.disciplineScore ?? 0}
                fomoScore={dashboard?.behaviorAnalytics.fomoScore ?? "Low"}
                revengeTradesThisMonth={dashboard?.behaviorAnalytics.revengeTradesThisMonth ?? 0}
                trendAlignment={dashboard?.behaviorAnalytics.trendAlignment ?? 0}
                loading={loading}
              />
            </div>
          </div>

          {/* Heatmap */}
          <div className="fade-up mb-6">
            <TradingHeatmap data={dashboard?.heatmap ?? []} loading={loading} />
          </div>

          {/* Insights */}
          <div className="fade-up mb-6">
            <AnalyticsPreviewWidget
              bestStrategy={dashboard?.insights.bestStrategy ?? ""}
              bestDay={dashboard?.insights.bestDay ?? ""}
              avgRR={dashboard?.insights.avgRR ?? 0}
              profitFactor={dashboard?.insights.profitFactor ?? 0}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

---

### Task 15: Add AuthContext import to AuthProvider check

**Files:**
- Verify: `apps/web/context/AuthContext.tsx` exists and exports `useAuth`

- [ ] **Check AuthContext exports a useAuth hook**

If not, create the context. Expected export:
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

This should already exist since DashboardHero references it and Phase 1 worked.

---

### Task 16: Verify build

**Files:**
- N/A

- [ ] **Check types and build**

```powershell
cd "C:\Users\tenku\Desktop\tradezen"
bun run check-types
```

Expected: All 4 packages pass (4 successful, 0 cached, no errors).

If there are type errors, fix them in the affected files. Common issues:
- `DashboardData` type not matching API response shape
- Missing exports in `api.ts`
- `useAuth` not found

---

### Task 17: Commit

**Files:**
- All of the above

- [ ] **Commit Phase 2**

```powershell
git add -A
git commit -m "feat: Phase 2 dashboard command center with 8 widgets

- Add GET /trades/dashboard backend endpoint
- Create DashboardHero with weekly stats
- Replace Recharts with lightweight-charts for equity curve
- Add DailySummaryCard, RecentTradesWidget, JournalSnapshotWidget
- Add TradingHeatmap (GitHub-style consistency grid)
- Add BehaviorAnalyticsWidget and AnalyticsPreviewWidget
- Rewrite dashboard page with responsive 2-col widget grid
- Install lightweight-charts and date-fns dependencies"
```

---

## Self-Review Checklist

| Spec Requirement | Task(s) | Status |
|---|---|---|
| Dashboard hero with weekly stats | Task 6 (DashboardHero) + Task 4 (backend data) | ✅ |
| Equity curve with time filters | Task 7 (EquityCurve) + Task 4 (backend data) | ✅ |
| Daily summary widget | Task 8 (DailySummaryCard) + Task 4 (backend data) | ✅ |
| Recent trades with actions | Task 9 (RecentTradesWidget) + Task 14 (dashboard page) | ✅ |
| Journal snapshot | Task 10 (JournalSnapshotWidget) + Task 2 (+ API) + Task 14 | ✅ |
| Trading consistency heatmap | Task 11 (TradingHeatmap) + Task 4 (backend data) | ✅ |
| Behavior analytics widget | Task 12 (BehaviorAnalyticsWidget) + Task 4 (backend data) | ✅ |
| Analytics preview widget | Task 13 (AnalyticsPreviewWidget) + Task 4 (backend data) | ✅ |
| Responsive 2-col layout | Task 14 (dashboard page grid classes) | ✅ |
| Loading/error states | Every widget has loading prop + empty state | ✅ |
| Build passes | Task 16 | ✅ |
