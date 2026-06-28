# Dashboard Grid Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-column vertical widget stack with a 2-column responsive grid with redesigned widget cards

**Architecture:** Flat `LayoutWidget[]` with `column` and `order` fields drives a two-column DndContext. Each column renders its own `SortableContext` for within-column drag; cross-column drag handled via collision detection in `onDragEnd`. A new `WidgetCard` component provides the redesigned chrome.

**Tech Stack:** Next.js 14, dnd-kit (already a dependency), CSS grid with Tailwind

---

### Task 1: Update LayoutWidget type + DEFAULT_LAYOUT

**Files:**

- Modify: `apps/web/lib/layout-types.ts`

- [ ] **Add `column` and `order` fields to LayoutWidget**

```typescript
export interface LayoutWidget {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
  column: 0 | 1;
  order: number;
}
```

- [ ] **Add WIDGET_TITLES and WIDGET_COLORS constants**

```typescript
export const WIDGET_TITLES: Record<WidgetId, string> = {
  "equity-curve": "Equity Curve",
  "daily-summary": "Daily Summary",
  "recent-trades": "Recent Trades",
  "journal-snapshot": "Journal",
  "behavior-analytics": "Behavior Analytics",
  heatmap: "Trading Heatmap",
  "analytics-insights": "Insights",
  "ai-coach": "AI Coach",
};

export const WIDGET_COLORS: Record<WidgetId, string> = {
  "equity-curve": "rgb(34, 197, 94)",
  "daily-summary": "rgb(59, 130, 246)",
  "recent-trades": "rgba(255,255,255,0.15)",
  "journal-snapshot": "rgb(168, 85, 247)",
  "behavior-analytics": "rgb(249, 115, 22)",
  heatmap: "rgb(234, 179, 8)",
  "analytics-insights": "rgb(6, 182, 212)",
  "ai-coach": "rgb(34, 197, 94)",
};
```

- [ ] **Update DEFAULT_LAYOUT with column/order**

```typescript
export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "equity-curve", visible: true, size: "M", column: 0, order: 0 },
    { id: "daily-summary", visible: true, size: "M", column: 1, order: 0 },
    { id: "recent-trades", visible: true, size: "M", column: 0, order: 1 },
    { id: "journal-snapshot", visible: true, size: "M", column: 1, order: 1 },
    { id: "behavior-analytics", visible: true, size: "M", column: 0, order: 2 },
    { id: "heatmap", visible: true, size: "M", column: 1, order: 2 },
    { id: "analytics-insights", visible: true, size: "M", column: 0, order: 3 },
    { id: "ai-coach", visible: true, size: "M", column: 1, order: 3 },
  ],
};
```

- [ ] **Remove the unused `WidgetId` re-export issue if any — no changes needed beyond the type update**

### Task 2: Update migrateLayout with column/order migration

**Files:**

- Modify: `apps/web/hooks/useDashboardLayout.ts`

- [ ] **Add column/order migration logic**

The `migrateLayout` function already handles `analytics-preview` → split and fills missing default widgets. Now it also assigns `column: i % 2, order: Math.floor(i / 2)` for any widget missing these fields.

```typescript
function migrateLayout(layout: DashboardLayout): DashboardLayout {
  let changed = false;
  const widgets = layout.widgets.flatMap((w) => {
    // @ts-expect-error — legacy migration from analytics-preview
    if (w.id === "analytics-preview") {
      changed = true;
      return [
        { id: "analytics-insights" as const, visible: w.visible, size: w.size },
        { id: "ai-coach" as const, visible: w.visible, size: w.size },
      ];
    }
    return [w];
  });

  // Fill in column/order for existing widgets that lack them
  const migrated = widgets.map((w, i) => {
    if (w.column === undefined || w.order === undefined) {
      changed = true;
      return { ...w, column: (i % 2) as 0 | 1, order: Math.floor(i / 2) };
    }
    return w;
  });

  // Add missing default widgets
  const existingIds = new Set(migrated.map((w) => w.id));
  const defaults = DEFAULT_LAYOUT.widgets;
  for (const def of defaults) {
    if (!existingIds.has(def.id)) {
      changed = true;
      migrated.push({ ...def });
    }
  }

  return changed ? { ...layout, widgets: migrated } : layout;
}
```

### Task 3: Create WidgetCard component

**Files:**

- Create: `apps/web/components/design-system/WidgetCard.tsx`

- [ ] **Create the WidgetCard component**

```tsx
"use client";

import type { LayoutWidget, WidgetId } from "@/lib/layout-types";
import { WIDGET_TITLES, WIDGET_COLORS } from "@/lib/layout-types";
import type { ReactNode } from "react";

interface WidgetCardProps {
  widget: LayoutWidget;
  children: ReactNode;
  dragHandle?: ReactNode;
  onToggleVisibility: () => void;
  onCycleSize: () => void;
}

const sizeLabels = { S: "SM", M: "MD", L: "LG" } as const;

export default function WidgetCard({
  widget,
  children,
  dragHandle,
  onToggleVisibility,
  onCycleSize,
}: WidgetCardProps) {
  const accent =
    WIDGET_COLORS[widget.id as WidgetId] ?? "rgba(255,255,255,0.15)";
  const title = WIDGET_TITLES[widget.id as WidgetId] ?? widget.id;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface, #111214)",
        border: "1px solid var(--border, #23252d)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border, #23252d)" }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: accent }}
        >
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCycleSize}
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{
              border: "1px solid var(--border, #23252d)",
              color: "var(--text-dim, #6b7280)",
              background: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              lineHeight: "14px",
            }}
            aria-label="Cycle size"
          >
            {sizeLabels[widget.size]}
          </button>
          {dragHandle}
          <button
            onClick={onToggleVisibility}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim, #6b7280)",
              padding: 2,
              display: "flex",
              fontSize: 14,
              lineHeight: 1,
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
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
```

### Task 4: Rewrite DashboardLayout as DashboardGridLayout

**Files:**

- Modify: `apps/web/components/DashboardLayout.tsx`

- [ ] **Replace entire file with grid-based layout**

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
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { LayoutWidget } from "@/lib/layout-types";
import { WIDGET_TITLES } from "@/lib/layout-types";
import WidgetCard from "@/components/design-system/WidgetCard";

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
        padding: 2,
        borderRadius: 4,
        display: "flex",
        fontSize: 14,
        lineHeight: 1,
        touchAction: "none",
      }}
      aria-label="Drag to reorder"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="9" cy="5" r="1.5" fill="currentColor" />
        <circle cx="15" cy="5" r="1.5" fill="currentColor" />
        <circle cx="9" cy="12" r="1.5" fill="currentColor" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
        <circle cx="9" cy="19" r="1.5" fill="currentColor" />
        <circle cx="15" cy="19" r="1.5" fill="currentColor" />
      </svg>
    </button>
  );
}

function SortableWidget({
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
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} className="fade-up">
      <WidgetCard
        widget={widget}
        dragHandle={
          <DragHandle listeners={listeners} attributes={attributes} />
        }
        onToggleVisibility={onToggleVisibility}
        onCycleSize={onCycleSize}
      >
        {children}
      </WidgetCard>
    </div>
  );
}

function Column({
  widgets,
  children,
}: {
  widgets: LayoutWidget[];
  children: ReactNode;
}) {
  if (widgets.length === 0) {
    return (
      <div
        className="rounded-xl flex items-center justify-center min-h-[120px]"
        style={{
          border: "1px dashed var(--border, #23252d)",
          background: "var(--bg-surface, #111214)",
          opacity: 0.3,
        }}
      >
        <span className="text-xs" style={{ color: "var(--text-dim, #6b7280)" }}>
          Drop widgets here
        </span>
      </div>
    );
  }
  return <>{children}</>;
}

export default function DashboardGridLayout({
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

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const visibleWidgets = useMemo(
    () => layout.widgets.filter((w) => w.visible),
    [layout.widgets],
  );
  const hiddenWidgets = useMemo(
    () => layout.widgets.filter((w) => !w.visible),
    [layout.widgets],
  );

  const col0 = useMemo(
    () =>
      visibleWidgets
        .filter((w) => w.column === 0)
        .sort((a, b) => a.order - b.order),
    [visibleWidgets],
  );
  const col1 = useMemo(
    () =>
      visibleWidgets
        .filter((w) => w.column === 1)
        .sort((a, b) => a.order - b.order),
    [visibleWidgets],
  );

  const col0Ids = useMemo(() => col0.map((w) => w.id), [col0]);
  const col1Ids = useMemo(() => col1.map((w) => w.id), [col1]);

  const findWidget = useCallback(
    (id: string) => layout.widgets.find((w) => w.id === id),
    [layout.widgets],
  );

  const handleDragStart = useCallback((event: DragEndEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeWidget = findWidget(String(active.id));
      const overWidget = findWidget(String(over.id));
      if (!activeWidget) return;

      // Determine target column: use over widget's column, or the column of
      // the last item in the droppable if over is a widget in the other column
      const targetCol = overWidget ? overWidget.column : activeWidget.column;
      const targetList = targetCol === 0 ? col0 : col1;

      // Compute new order within target column
      let newOrder: number;
      if (overWidget && overWidget.column === targetCol) {
        // Same column: insert at over widget's position
        const overIndex = targetList.findIndex((w) => w.id === over.id);
        newOrder = overIndex >= 0 ? overIndex : targetList.length - 1;
      } else {
        // Different column: append to end
        newOrder =
          targetList.length - (targetCol === activeWidget.column ? 1 : 0);
      }

      // Build new widgets array with updated column/order
      const updated = layout.widgets
        .filter((w) => w.id !== activeWidget.id)
        .map((w) => {
          // Shift order in target column to make room
          if (w.column === targetCol && w.order >= newOrder) {
            return { ...w, order: w.order + 1 };
          }
          // Close gap in source column
          if (
            w.column === activeWidget.column &&
            w.order > activeWidget.order &&
            activeWidget.column !== targetCol
          ) {
            return { ...w, order: w.order - 1 };
          }
          return w;
        });

      updated.push({
        ...activeWidget,
        column: targetCol as 0 | 1,
        order: newOrder,
      });

      onReorder(updated);
    },
    [layout.widgets, col0, col1, findWidget, onReorder],
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {hiddenWidgets.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ color: "var(--text-dim, #6b7280)" }}
              >
                {hiddenWidgets.length} hidden
              </span>
              <div className="relative group">
                <button
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    border: "1px solid var(--border, #23252d)",
                    color: "var(--text-dim, #6b7280)",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + Add Widget
                </button>
                <div
                  className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-10 hidden group-hover:block"
                  style={{
                    background: "var(--bg-surface, #111214)",
                    border: "1px solid var(--border, #23252d)",
                    minWidth: 160,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {hiddenWidgets.map((w) => (
                    <button
                      key={w.id}
                      className="block w-full text-left px-3 py-2 text-xs hover:opacity-80"
                      style={{
                        color: "var(--text-primary, #e5e7eb)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                      onClick={() => onToggleVisibility(w.id)}
                    >
                      {WIDGET_TITLES[w.id] ?? w.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onReset}
          className="text-xs px-2.5 py-1.5 rounded"
          style={{
            border: "1px solid var(--border, #23252d)",
            color: "var(--text-dim, #6b7280)",
            background: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reset Layout
        </button>
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column 0 */}
          <div className="flex flex-col gap-3">
            <SortableContext
              items={col0Ids}
              strategy={verticalListSortingStrategy}
            >
              <Column widgets={col0}>
                {col0.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    onToggleVisibility={() => onToggleVisibility(widget.id)}
                    onCycleSize={() => onCycleSize(widget.id)}
                  >
                    {renderWidget(widget)}
                  </SortableWidget>
                ))}
              </Column>
            </SortableContext>
          </div>

          {/* Column 1 */}
          <div className="flex flex-col gap-3">
            <SortableContext
              items={col1Ids}
              strategy={verticalListSortingStrategy}
            >
              <Column widgets={col1}>
                {col1.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    onToggleVisibility={() => onToggleVisibility(widget.id)}
                    onCycleSize={() => onCycleSize(widget.id)}
                  >
                    {renderWidget(widget)}
                  </SortableWidget>
                ))}
              </Column>
            </SortableContext>
          </div>
        </div>
      </DndContext>

      {/* Hidden section */}
      {hiddenWidgets.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary
            className="text-xs cursor-pointer py-2 select-none"
            style={{ color: "var(--text-dim, #6b7280)" }}
          >
            All Widgets ({layout.widgets.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {layout.widgets.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  border: "1px dashed var(--border, #23252d)",
                  background: "var(--bg-surface, #111214)",
                  opacity: widget.visible ? 1 : 0.5,
                }}
              >
                <span
                  className="text-xs flex-1"
                  style={{ color: "var(--text-dim, #6b7280)" }}
                >
                  {WIDGET_TITLES[widget.id] ?? widget.id}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{
                    border: "1px solid var(--border, #23252d)",
                    color: "var(--text-dim, #6b7280)",
                  }}
                >
                  Col {widget.column + 1}
                </span>
                <span className="text-[9px] text-text-dim">
                  {widget.visible ? "Visible" : "Hidden"}
                </span>
                <button
                  onClick={() => onToggleVisibility(widget.id)}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    border: "1px solid var(--border, #23252d)",
                    color: "var(--text-dim, #6b7280)",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {widget.visible ? "Hide" : "Show"}
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
```

### Task 5: Update page.tsx wiring

**Files:**

- Modify: `apps/web/app/page.tsx`

- [ ] **Update import from DashboardLayoutManager to DashboardGridLayout**

```typescript
import DashboardGridLayout from "@/components/DashboardLayout";
```

- [ ] **Update the component usage**

```typescript
<DashboardGridLayout
  layout={layout}
  onReorder={reorderWidgets}
  onUpdateWidget={updateWidget}
  onReset={resetLayout}
  onToggleVisibility={handleToggleVisibility}
  onCycleSize={handleCycleSize}
  renderWidget={renderWidget}
/>
```

### Task 6: Typecheck and lint

**Files:**

- Run: `bun run check-types` in project root
- Run: `bun run lint` in project root

- [ ] **Check types pass**
- [ ] **Check lint passes for web at minimum**
