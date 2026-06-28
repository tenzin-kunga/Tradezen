# Dashboard UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the dashboard hero, stat cards, and trading-consistency heatmap for better visual hierarchy and contrast.

**Architecture:** Modify three presentational React components and one optional CSS utility. Keep data flow unchanged; changes are purely visual/stylistic.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, project design tokens in `globals.css`.

---

## File Structure

- `apps/web/components/DashboardHero.tsx` — welcome banner and weekly stat chips.
- `apps/web/components/StatCard.tsx` — top-row metric cards.
- `apps/web/components/TradingHeatmap.tsx` — consistency calendar heatmap.
- `apps/web/app/globals.css` — optional new utility classes for stat-card tints.

---

### Task 1: Refine DashboardHero

**Files:**

- Modify: `apps/web/components/DashboardHero.tsx`

- [ ] **Step 1: Remove emoji and clean up greeting**

Replace the `<h1>` block with:

```tsx
<h1 className="text-xl font-bold text-text-primary">
  Welcome back, {user?.username || "Trader"}
</h1>
```

- [ ] **Step 2: Restructure hero layout**

Render greeting on the left and weekly stat chips on the right in a flex row. On small screens the stats wrap below. Replace the current inner markup with:

```tsx
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
  <h1 className="text-xl font-bold text-text-primary">
    Welcome back, {user?.username || "Trader"}
  </h1>
  {hasData ? (
    <div className="flex gap-6 flex-wrap">
      <div>
        <div className="label-caps mb-1">TRADES THIS WEEK</div>
        <div className="text-2xl font-bold text-text-primary">
          {tradesThisWeek}
        </div>
      </div>
      <div>
        <div className="label-caps mb-1">WEEKLY P&L</div>
        <div
          className={`text-2xl font-bold ${weeklyPnl >= 0 ? "text-profit" : "text-loss"}`}
        >
          {weeklyPnl >= 0 ? "+" : ""}${Math.abs(weeklyPnl).toLocaleString()}
        </div>
      </div>
      <div>
        <div className="label-caps mb-1">WIN RATE</div>
        <div className="text-2xl font-bold text-text-primary">
          {weeklyWinRate}%
        </div>
      </div>
    </div>
  ) : (
    <p className="text-sm text-text-muted">
      Start this week strong —{" "}
      <Link href="/add-trade" className="text-text-primary underline">
        log your first trade
      </Link>
      .
    </p>
  )}
</div>
```

- [ ] **Step 3: Reduce padding and keep gradient**

Change the outer wrapper from `p-6` to `p-5` and keep the existing gradient background. Loading skeleton should mirror the new layout.

---

### Task 2: Add Contrast to StatCard

**Files:**

- Modify: `apps/web/components/StatCard.tsx`

- [ ] **Step 1: Accept optional accent props**

Update the component props:

```tsx
type StatCardProps = {
  title: string;
  value: string;
  trend?: { value: string; positive: boolean };
  variant?: "profit" | "loss" | "blue" | "amber" | "cyan";
};
```

- [ ] **Step 2: Apply tinted background and top border**

Use a `variant` map for background and border colors:

```tsx
const variantStyles = {
  profit: { bg: "rgba(34,197,94,0.08)", border: "var(--accent-profit)" },
  loss: { bg: "rgba(239,68,68,0.08)", border: "var(--accent-loss)" },
  blue: { bg: "rgba(59,130,246,0.08)", border: "var(--accent)" },
  amber: { bg: "rgba(245,158,11,0.08)", border: "var(--accent-warn)" },
  cyan: { bg: "rgba(6,182,212,0.08)", border: "var(--accent-cyan)" },
};
```

Apply them to the card wrapper:

```tsx
const active = variant ? variantStyles[variant] : null;

return (
  <div
    className="glass-card-interactive rounded-xl p-5 flex flex-col gap-1"
    style={
      active
        ? {
            background: active.bg,
            borderTop: `3px solid ${active.border}`,
          }
        : undefined
    }
  >
    ...existing content...
  </div>
);
```

- [ ] **Step 3: Pass variants from Dashboard page**

In `apps/web/app/page.tsx`, pass a `variant` prop to each `<StatCard>`:

```tsx
<StatCard
  title="Total P&L"
  value={formatPnl(dashboard!.totalPnl)}
  variant={dashboard!.totalPnl >= 0 ? "profit" : "loss"}
/>
<StatCard title="Win Rate" value={...} variant="blue" />
<StatCard title="Profit Factor" value={...} variant="amber" />
<StatCard title="Avg Risk:Reward" value={...} variant="cyan" />
```

---

### Task 3: Enlarge and Fill TradingHeatmap

**Files:**

- Modify: `apps/web/components/TradingHeatmap.tsx`

- [ ] **Step 1: Increase cell size and fill width**

Replace the current heatmap scrollable flex container with a grid that fills the card width. Each week becomes a column. Use:

```tsx
<div className="grid grid-cols-7 gap-1">
  {weeks.flat().map((day, i) => (
    <div
      key={i}
      className="aspect-square rounded-xs transition-opacity min-h-[28px]"
      style={{ backgroundColor: intensity(day) }}
      title={
        day ? `${day.date}: ${day.trades} trades, $${day.pnl}` : "No trades"
      }
    />
  ))}
</div>
```

- [ ] **Step 2: Flatten weeks into days ordered by calendar**

Ensure `weeks.flat()` preserves chronological order and pad leading/trailing nulls so the grid aligns to a 7-day week. The current `weeks` array already produces `[sun, mon, ..., sat]` per week; flattening works directly.

- [ ] **Step 3: Compact the legend**

Move the legend into a single inline row under the grid with smaller labels and reduce top margin:

```tsx
<div className="flex items-center gap-1.5 mt-2 justify-end">
  <span className="text-[10px] text-text-dim">Less</span>
  <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#1a1b1e" }} />
  <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#3b82f6" }} />
  <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#22c55e" }} />
  <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#f59e0b" }} />
  <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#ef4444" }} />
  <span className="text-[10px] text-text-dim">More</span>
</div>
```

---

### Task 4: Verify Visual Output

**Files:**

- No file changes.

- [ ] **Step 1: Start the dev server**

Run: `bun run dev` from the project root (or `apps/web`) and open `http://localhost:3000`.

- [ ] **Step 2: Check the dashboard**

Verify:

1. Hero shows "Welcome back, {name}" with no emoji.
2. Weekly stats sit to the right of the greeting on desktop.
3. Top four stat cards have tinted backgrounds and colored top borders.
4. Heatmap cells are larger and fill the widget card width.
5. No console errors or layout breakage on mobile width.

---

## Spec Coverage Check

- Hero emoji removed → Task 1.
- Hero layout refined → Task 1.
- Stat-card contrast → Task 2.
- Heatmap fills card / less whitespace → Task 3.
- Daily Summary unchanged → no task.

## Placeholder Scan

No TBD/TODO placeholders. All code blocks include exact JSX/TSX snippets matching the current component structure.
