# Dashboard Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard customizable — reorder, resize, show/hide widgets with layout persisted to the API

**Architecture:** A `dashboard_layout` JSONB column on the `users` table stores widget config. A `useDashboardLayout` hook manages local state with debounced API persistence. `@dnd-kit` provides drag-and-drop reordering. The dashboard page reads layout on mount, renders widgets in configured order/visibility/size, and exposes controls per widget (drag handle, hide toggle, size toggle, reset button).

**Tech Stack:** `@dnd-kit/core` + `@dnd-kit/sortable`, NestJS `PATCH /auth/layout`, `jsonb` column, debounce via `useRef` + `setTimeout`

---

### Task 1: Add `dashboard_layout` column to users table

**Files:**

- Modify: `packages/db/src/schema/index.ts` — add column to `users` table

- [ ] **Add `dashboardLayout` column to users schema**

```ts
// After `theme:` line (line 34)
dashboardLayout: jsonb('dashboard_layout').default({
  widgets: [
    { id: 'equity-curve', visible: true, size: 'M' },
    { id: 'daily-summary', visible: true, size: 'M' },
    { id: 'recent-trades', visible: true, size: 'M' },
    { id: 'journal-snapshot', visible: true, size: 'M' },
    { id: 'behavior-analytics', visible: true, size: 'M' },
    { id: 'heatmap', visible: true, size: 'M' },
    { id: 'analytics-preview', visible: true, size: 'M' },
  ],
} as any),
```

The default layout defines the canonical widget order. The `as any` cast is needed because Drizzle `jsonb` expects `unknown` for defaults.

- [ ] **Commit**

```bash
git add packages/db/src/schema/index.ts
git commit -m "feat: add dashboard_layout jsonb column to users"
```

---

### Task 2: Backend layout endpoints

**Files:**

- Create: `apps/api/src/auth/dto/save-layout.dto.ts`
- Modify: `apps/api/src/auth/dto/index.ts` — export new DTO
- Modify: `apps/api/src/auth/auth.controller.ts` — add GET/PATCH /auth/layout
- Modify: `apps/api/src/auth/auth.service.ts` — add getLayout/saveLayout methods

- [ ] **Create SaveLayoutDto**

```ts
import {
  IsArray,
  IsString,
  IsBoolean,
  IsIn,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

class LayoutWidgetDto {
  @ApiProperty({ example: "equity-curve" })
  @IsString()
  id: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  visible: boolean;

  @ApiProperty({ enum: ["S", "M", "L"] })
  @IsIn(["S", "M", "L"])
  size: "S" | "M" | "L";
}

export class SaveLayoutDto {
  @ApiProperty({ type: [LayoutWidgetDto] })
  @IsArray()
  widgets: LayoutWidgetDto[];
}
```

- [ ] **Export SaveLayoutDto from index**

```ts
// apps/api/src/auth/dto/index.ts — add to existing exports
export { SaveLayoutDto } from "./save-layout.dto";
```

- [ ] **Add getLayout/saveLayout to AuthService**

```ts
// After updateSettings method (around line 270)
async getLayout(userId: string) {
  const [user] = await db
    .select({ layout: users.dashboardLayout })
    .from(users)
    .where(eq(users.id, userId));
  return user?.layout ?? null;
}

async saveLayout(userId: string, dto: SaveLayoutDto) {
  const [user] = await db
    .update(users)
    .set({ dashboardLayout: dto as any })
    .where(eq(users.id, userId))
    .returning({ layout: users.dashboardLayout });
  return user?.layout;
}
```

- [ ] **Add routes to AuthController**

```ts
// Import SaveLayoutDto at top (add to existing import from './dto')
import { RegisterDto, LoginDto, UpdateSettingsDto, SaveLayoutDto } from './dto';

// Add these routes before the closing brace of the class (after updateSettings at line 75)

@Get('layout')
@ApiBearerAuth()
@ApiOperation({ summary: 'Get dashboard layout configuration' })
getLayout(@CurrentUser('id') userId: string) {
  return this.authService.getLayout(userId);
}

@Patch('layout')
@ApiBearerAuth()
@ApiOperation({ summary: 'Save dashboard layout configuration' })
saveLayout(
  @CurrentUser('id') userId: string,
  @Body() dto: SaveLayoutDto,
) {
  return this.authService.saveLayout(userId, dto);
}
```

- [ ] **Commit**

```bash
git add apps/api/src/auth/dto/save-layout.dto.ts apps/api/src/auth/dto/index.ts apps/api/src/auth/auth.controller.ts apps/api/src/auth/auth.service.ts
git commit -m "feat: add GET/PATCH /auth/layout endpoints"
```

---

### Task 3: Install `@dnd-kit` on web

**Files:**

- Modify: `apps/web/package.json`

- [ ] **Install packages**

```bash
cd apps/web
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Commit**

```bash
git add apps/web/package.json apps/web/bun.lock
git commit -m "feat: add @dnd-kit for drag-and-drop"
```

---

### Task 4: Layout types and API client

**Files:**

- Create: `apps/web/lib/layout-types.ts`
- Modify: `apps/web/lib/api.ts` — add `getLayout()` and `saveLayout()`

- [ ] **Create layout-types.ts**

```ts
export type WidgetId =
  | "equity-curve"
  | "daily-summary"
  | "recent-trades"
  | "journal-snapshot"
  | "behavior-analytics"
  | "heatmap"
  | "analytics-preview";

export type WidgetSize = "S" | "M" | "L";

export interface LayoutWidget {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
}

export interface DashboardLayout {
  widgets: LayoutWidget[];
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "equity-curve", visible: true, size: "M" },
    { id: "daily-summary", visible: true, size: "M" },
    { id: "recent-trades", visible: true, size: "M" },
    { id: "journal-snapshot", visible: true, size: "M" },
    { id: "behavior-analytics", visible: true, size: "M" },
    { id: "heatmap", visible: true, size: "M" },
    { id: "analytics-preview", visible: true, size: "M" },
  ],
};
```

- [ ] **Add getLayout/saveLayout to api.ts**

```ts
// Add after the Search section (after line 367), before Tags section

// ─── Layout ──────────────────────────────────────────

import type { DashboardLayout } from "@/lib/layout-types";

export const getLayout = async (): Promise<DashboardLayout | null> => {
  try {
    const res = await authFetch(`${API}/auth/layout`);
    return handleResponse<DashboardLayout>(res);
  } catch {
    return null;
  }
};

export const saveLayout = async (layout: DashboardLayout): Promise<void> => {
  await authFetch(`${API}/auth/layout`, {
    method: "PATCH",
    body: JSON.stringify(layout),
  });
};
```

Note: The import should be placed at the top of the file with other imports.

- [ ] **Commit**

```bash
git add apps/web/lib/layout-types.ts apps/web/lib/api.ts
git commit -m "feat: add layout types and API functions"
```

---

### Task 5: Create `useDashboardLayout` hook

**Files:**

- Create: `apps/web/hooks/useDashboardLayout.ts`

- [ ] **Write the hook**

```ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DashboardLayout, LayoutWidget } from "@/lib/layout-types";
import { DEFAULT_LAYOUT } from "@/lib/layout-types";
import { getLayout, saveLayout } from "@/lib/api";

const LAYOUT_KEY = "tradezen_dashboard_layout";
const DEBOUNCE_MS = 2000;

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load from localStorage first, then API
  useEffect(() => {
    const stored = localStorage.getItem(LAYOUT_KEY);
    if (stored) {
      try {
        setLayout(JSON.parse(stored));
      } catch {}
    }
    getLayout().then((apiLayout) => {
      if (apiLayout) {
        setLayout(apiLayout);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(apiLayout));
      }
      setLoaded(true);
    });
  }, []);

  // Debounced API save
  const persist = useCallback((l: DashboardLayout) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveLayout(l).catch(() => {});
    }, DEBOUNCE_MS);
  }, []);

  const setAndPersist = useCallback(
    (l: DashboardLayout) => {
      setLayout(l);
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(l));
      persist(l);
    },
    [persist],
  );

  const updateWidget = useCallback(
    (id: string, patch: Partial<LayoutWidget>) => {
      setAndPersist({
        ...layout,
        widgets: layout.widgets.map((w) =>
          w.id === id ? { ...w, ...patch } : w,
        ),
      });
    },
    [layout, setAndPersist],
  );

  const reorderWidgets = useCallback(
    (widgets: LayoutWidget[]) => {
      setAndPersist({ ...layout, widgets });
    },
    [layout, setAndPersist],
  );

  const resetLayout = useCallback(() => {
    setAndPersist(DEFAULT_LAYOUT);
  }, [setAndPersist]);

  return {
    layout,
    loaded,
    updateWidget,
    reorderWidgets,
    resetLayout,
  };
}
```

- [ ] **Commit**

```bash
git add apps/web/hooks/useDashboardLayout.ts
git commit -m "feat: add useDashboardLayout hook with debounced persistence"
```

---

### Task 6: Create DashboardLayout wrapper component

**Files:**

- Create: `apps/web/components/DashboardLayout.tsx`

- [ ] **Write the DnD wrapper component**

This component wraps the widgets in a `DndContext` + `SortableContext` and renders each widget in its configured order. Each widget row gets a drag handle, hide toggle, and size toggle. Hidden widgets are rendered as a collapsible "hidden widgets" section at the bottom.

```tsx
"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import type { LayoutWidget, WidgetId, WidgetSize } from "@/lib/layout-types";

function DragHandle({ listeners, attributes }: any) {
  return (
    <button
      {...attributes}
      {...listeners}
      style={{
        background: "none",
        border: "none",
        cursor: "grab",
        color: "var(--text-dim, #6b7280)",
        padding: 4,
        borderRadius: 4,
        display: "flex",
        fontSize: 16,
        lineHeight: 1,
      }}
      aria-label="Drag to reorder"
    >
      ⋮⋮
    </button>
  );
}

function WidgetControls({
  widget,
  onToggleVisibility,
  onCycleSize,
}: {
  widget: LayoutWidget;
  onToggleVisibility: () => void;
  onCycleSize: () => void;
}) {
  const sizeLabel =
    widget.size === "S" ? "SM" : widget.size === "M" ? "MD" : "LG";
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <button
        onClick={onCycleSize}
        style={{
          background: "none",
          border: "1px solid var(--border, #23252d)",
          borderRadius: 4,
          padding: "2px 5px",
          fontSize: 9,
          color: "var(--text-dim, #6b7280)",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
        aria-label="Cycle size"
      >
        {sizeLabel}
      </button>
      <button
        onClick={onToggleVisibility}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-dim, #6b7280)",
          padding: 2,
          display: "flex",
        }}
        aria-label={widget.visible ? "Hide widget" : "Show widget"}
      >
        {widget.visible ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>
    </div>
  );
}

function SortableWidgetRow({
  widget,
  children,
  onToggleVisibility,
  onCycleSize,
}: {
  widget: LayoutWidget;
  children: ReactNode;
  onToggleVisibility: () => void;
  onCycleSize: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="fade-up">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div style={{ paddingTop: 16 }}>
          <DragHandle attributes={attributes} listeners={listeners} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        <div style={{ paddingTop: 16, display: "flex", gap: 4 }}>
          <WidgetControls
            widget={widget}
            onToggleVisibility={onToggleVisibility}
            onCycleSize={onCycleSize}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayoutManager({
  layout,
  onReorder,
  onUpdateWidget,
  onReset,
  onToggleVisibility,
  onCycleSize,
  renderWidget,
}: {
  layout: { widgets: LayoutWidget[] };
  onReorder: (widgets: LayoutWidget[]) => void;
  onUpdateWidget: (id: string, patch: Partial<LayoutWidget>) => void;
  onReset: () => void;
  onToggleVisibility: (id: string) => void;
  onCycleSize: (id: string) => void;
  renderWidget: (widget: LayoutWidget) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const visibleWidgets = layout.widgets.filter((w) => w.visible);
  const hiddenWidgets = layout.widgets.filter((w) => !w.visible);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
    const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...visibleWidgets];
    reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);

    // Merge reordered visible + hidden back into full list
    const hiddenIds = new Set(hiddenWidgets.map((w) => w.id));
    const result = [
      ...reordered,
      ...layout.widgets.filter((w) => hiddenIds.has(w.id)),
    ];
    onReorder(result);
  };

  const widgetIds = visibleWidgets.map((w) => w.id);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
          gap: 8,
        }}
      >
        {hiddenWidgets.length > 0 && (
          <span
            style={{
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
              alignSelf: "center",
            }}
          >
            {hiddenWidgets.length} hidden
          </span>
        )}
        <button
          onClick={onReset}
          style={{
            background: "none",
            border: "1px solid var(--border, #23252d)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            color: "var(--text-dim, #6b7280)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reset Layout
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgetIds}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {visibleWidgets.map((widget) => (
              <SortableWidgetRow
                key={widget.id}
                widget={widget}
                onToggleVisibility={() => onToggleVisibility(widget.id)}
                onCycleSize={() => onCycleSize(widget.id)}
              >
                {renderWidget(widget)}
              </SortableWidgetRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hidden widgets section */}
      {hiddenWidgets.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary
            style={{
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
              cursor: "pointer",
              padding: "8px 0",
              userSelect: "none",
            }}
          >
            Hidden Widgets ({hiddenWidgets.length})
          </summary>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginTop: 8,
            }}
          >
            {hiddenWidgets.map((widget) => (
              <SortableWidgetRow
                key={widget.id}
                widget={widget}
                onToggleVisibility={() => onToggleVisibility(widget.id)}
                onCycleSize={() => onCycleSize(widget.id)}
              >
                {renderWidget(widget)}
              </SortableWidgetRow>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add apps/web/components/DashboardLayout.tsx
git commit -m "feat: add DashboardLayout DnD wrapper with controls"
```

---

### Task 7: Integrate DashboardLayout into page.tsx

**Files:**

- Modify: `apps/web/app/page.tsx` — wrap widget rendering with DashboardLayout + useDashboardLayout

- [ ] **Refactor page.tsx**

Replace the hardcoded widget grid with `DashboardLayoutManager` that renders widgets in configured order. Each widget block must be uniquely identified by its `widget.id`.

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  getDashboardData,
  getJournalLatest,
  getTrades,
  type DashboardData,
} from "@/lib/api";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import DashboardLayoutManager from "@/components/DashboardLayout";
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
import type { LayoutWidget } from "@/lib/layout-types";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [journalEntry, setJournalEntry] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { layout, loaded, updateWidget, reorderWidgets, resetLayout } =
    useDashboardLayout();

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

  useEffect(() => {
    loadData();
  }, []);

  const statsLoading = loading || !dashboard;
  const hasTrades =
    dashboard && (dashboard.equityCurve.length > 0 || recentTrades.length > 0);

  const handleToggleVisibility = (id: string) => {
    updateWidget(id, {
      visible: !layout.widgets.find((w) => w.id === id)?.visible,
    });
  };

  const handleCycleSize = (id: string) => {
    const current = layout.widgets.find((w) => w.id === id)?.size || "M";
    const next = current === "S" ? "M" : current === "M" ? "L" : "S";
    updateWidget(id, { size: next });
  };

  const renderWidget = (widget: LayoutWidget) => {
    const padding =
      widget.size === "S" ? "sm" : widget.size === "L" ? "md" : "lg";
    const gridClass =
      widget.size === "L"
        ? "w-full"
        : widget.size === "S"
          ? "w-full sm:w-1/3"
          : "w-full sm:w-1/2";

    return (
      <div className={gridClass}>
        {widget.id === "equity-curve" && (
          <EquityCurve data={dashboard?.equityCurve ?? []} loading={loading} />
        )}
        {widget.id === "daily-summary" && (
          <DailySummaryCard
            tradesToday={dashboard?.dailySummary.tradesToday ?? 0}
            winRateToday={dashboard?.dailySummary.winRateToday ?? 0}
            pnlToday={dashboard?.dailySummary.pnlToday ?? 0}
            openRisk={dashboard?.dailySummary.openRisk ?? 0}
            loading={loading}
          />
        )}
        {widget.id === "recent-trades" && (
          <RecentTradesWidget
            trades={recentTrades}
            onDelete={loadData}
            loading={loading}
          />
        )}
        {widget.id === "journal-snapshot" && (
          <JournalSnapshotWidget entry={journalEntry} loading={loading} />
        )}
        {widget.id === "behavior-analytics" && (
          <BehaviorAnalyticsWidget
            disciplineScore={dashboard?.behaviorAnalytics.disciplineScore ?? 0}
            fomoScore={dashboard?.behaviorAnalytics.fomoScore ?? "Low"}
            revengeTradesThisMonth={
              dashboard?.behaviorAnalytics.revengeTradesThisMonth ?? 0
            }
            trendAlignment={dashboard?.behaviorAnalytics.trendAlignment ?? 0}
            loading={loading}
          />
        )}
        {widget.id === "heatmap" && (
          <TradingHeatmap data={dashboard?.heatmap ?? []} loading={loading} />
        )}
        {widget.id === "analytics-preview" && (
          <AnalyticsPreviewWidget
            bestStrategy={dashboard?.insights.bestStrategy ?? ""}
            bestDay={dashboard?.insights.bestDay ?? ""}
            avgRR={dashboard?.insights.avgRR ?? 0}
            profitFactor={dashboard?.insights.profitFactor ?? 0}
            loading={loading}
          />
        )}
      </div>
    );
  };

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
            <div key={i} className="fade-up">
              <StatCardSkeleton />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total P&L"
              value={`${dashboard!.weeklyPnl >= 0 ? "+" : ""}$${Math.abs(dashboard!.weeklyPnl).toLocaleString()}`}
            />
            <StatCard title="Win Rate" value={`${dashboard!.weeklyWinRate}%`} />
            <StatCard
              title="Profit Factor"
              value={
                dashboard!.insights.profitFactor > 0 &&
                dashboard!.insights.profitFactor < 999
                  ? String(dashboard!.insights.profitFactor)
                  : dashboard!.insights.profitFactor >= 999
                    ? "∞"
                    : "--"
              }
            />
            <StatCard
              title="Avg Risk:Reward"
              value={
                dashboard!.insights.avgRR > 0
                  ? `1:${dashboard!.insights.avgRR.toFixed(1)}`
                  : "--"
              }
            />
          </>
        )}
      </div>

      {/* Main content or empty state */}
      {!statsLoading && !hasTrades ? (
        <EmptyState
          title="Start Your Trading Journey"
          description="Log your first trade to unlock equity curves, daily summaries, and performance analytics."
          actionLabel="Log First Trade"
          actionHref="/add-trade"
        />
      ) : (
        loaded && (
          <DashboardLayoutManager
            layout={layout}
            onReorder={reorderWidgets}
            onUpdateWidget={updateWidget}
            onReset={resetLayout}
            onToggleVisibility={handleToggleVisibility}
            onCycleSize={handleCycleSize}
            renderWidget={renderWidget}
          />
        )
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat: integrate DashboardLayoutManager with DnD reordering"
```

---

### Task 8: Type-check and verify

- [ ] **Run type-check**

```bash
bun run check-types
```

Expected: 4/4 packages pass (db, ui, api, web).

- [ ] **Fix any type errors**

If the `jsonb('dashboard_layout').default(...)` causes a type issue, adjust the default value type:

```ts
dashboardLayout: jsonb('dashboard_layout').default({
  widgets: [
    { id: 'equity-curve', visible: true, size: 'M' },
    { id: 'daily-summary', visible: true, size: 'M' },
    { id: 'recent-trades', visible: true, size: 'M' },
    { id: 'journal-snapshot', visible: true, size: 'M' },
    { id: 'behavior-analytics', visible: true, size: 'M' },
    { id: 'heatmap', visible: true, size: 'M' },
    { id: 'analytics-preview', visible: true, size: 'M' },
  ],
}),
```

If Drizzle complains about the default type, change to:

```ts
dashboardLayout: jsonb('dashboard_layout').$type<{
  widgets: Array<{ id: string; visible: boolean; size: string }>;
}>().default({
  widgets: [
    { id: 'equity-curve', visible: true, size: 'M' },
    { id: 'daily-summary', visible: true, size: 'M' },
    { id: 'recent-trades', visible: true, size: 'M' },
    { id: 'journal-snapshot', visible: true, size: 'M' },
    { id: 'behavior-analytics', visible: true, size: 'M' },
    { id: 'heatmap', visible: true, size: 'M' },
    { id: 'analytics-preview', visible: true, size: 'M' },
  ],
}),
```

- [ ] **Commit any fixes**

```bash
git commit -m "fix: adjust dashboard_layout type for Drizzle"
```
