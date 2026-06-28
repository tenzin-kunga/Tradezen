# Dashboard Layout Redesign

**Date:** 2026-06-24
**Status:** Draft
**Scope:** Grid layout + widget card redesign for the main trading dashboard

## 1. Goals

- Replace single-column vertical widget stack with a 2-column responsive grid
- Redesign widget card chrome (headers, controls, visual hierarchy)
- Maintain drag-and-drop reordering with column-aware placement
- Preserve existing persistence (API + localStorage) and migration path

## 2. Data Model

### LayoutWidget (layout-types.ts)

```typescript
export interface LayoutWidget {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
  column: 0 | 1;      // NEW — which grid column
  order: number;       // NEW — position within the column
}
```

### Migration

- `migrateLayout` adds `column: i % 2` and `order: Math.floor(i / 2)` for existing widgets without these fields (alternates widgets across 2 columns)
- `DEFAULT_LAYOUT` updated to include `column` and `order`
- DB JSONB column schema evolves gracefully (no migration SQL needed — JSONB accepts extra fields)

## 3. Layout Component Architecture

### DashboardGridLayout (replaces DashboardLayoutManager)

```
DashboardGridLayout
├── Column 1 (left)
│   ├── SortableWidget (dnd-kit)
│   │   └── WidgetCard (new chrome)
│   │       ├── Accent strip (widget-themed color)
│   │       ├── Header row (title, controls)
│   │       │   ├── Widget title
│   │       │   ├── Size toggle (S/M/L)
│   │       │   ├── Drag handle
│   │       │   └── Visibility toggle (eye icon)
│   │       └── Widget body (existing child content)
│   └── ...
├── Column 2 (right)
│   └── ...
└── BottomToolbar
    ├── Hidden widget count
    ├── "Add Widget" dropdown (list of hidden widgets)
    ├── Layout preset buttons
    └── Reset Layout
```

### Drag-and-Drop Design

- Use `@dnd-kit/core` + `@dnd-kit/sortable` (already a dependency)
- Each column is a `SortableContext` with `verticalListSortingStrategy`
- Cross-column drag uses a custom collision detection that:
  1. Checks if the active widget's drag overlay is over the other column's drop zone
  2. On drop: remove from source column, insert at target column + position
  3. Animate between columns

### WidgetCard (new component)

```tsx
// components/design-system/WidgetCard.tsx
interface WidgetCardProps {
  widget: LayoutWidget;
  children: ReactNode;
  onToggleVisibility: () => void;
  onCycleSize: () => void;
}
```

- Clean header with widget title in label-caps style
- Left accent strip: 3px solid border with widget-category color
- Controls inline on right: size badge (clickable), drag handle, eye toggle
- Consistent padding: 16px body, 12px header
- Subtle bottom border between header and body
- The widget title is derived from the `widget.id` (mapped to display name)

## 4. Widget Theming

Each widget gets an accent color derived from its category:

| Widget ID | Accent Color | Hex |
|---|---|---|
| equity-curve | Profit Green | `rgb(34, 197, 94)` |
| daily-summary | Info Blue | `rgb(59, 130, 246)` |
| recent-trades | Neutral | `rgba(255,255,255,0.15)` |
| journal-snapshot | Purple | `rgb(168, 85, 247)` |
| behavior-analytics | Warning Orange | `rgb(249, 115, 22)` |
| heatmap | Gold | `rgb(234, 179, 8)` |
| analytics-insights | Cyan | `rgb(6, 182, 212)` |
| ai-coach | Profit Green | `rgb(34, 197, 94)` |

## 5. Responsive Behavior

| Breakpoint | Columns | Notes |
|---|---|---|
| >= 1024px (lg) | 2 | Full grid |
| 640-1023px (sm-md) | 1 | Widgets stack vertically, column=1 widgets fold under |
| < 640px | 1 | Same as above, tighter padding |

On single-column, all widgets render in order of their global position (column 0 first, then column 1).

## 6. Bottom Toolbar

Floating toolbar at the bottom of the widget area:
- Left: "N hidden" label
- Middle: Widget count / layout name
- Right: "Add Widget" → dropdown shows hidden list, "Reset Layout" button

No more `<details>` expand/collapse. The toolbar stays visible when hidden widgets exist.

## 7. User Flows

| Action | Behavior |
|---|---|
| Drag within column | Reorder within that column |
| Drag to other column | Move widget between columns |
| Resize (S/M/L) | Cycles size, body adjusts via CSS grid or width |
| Hide widget | Moves to hidden list, toolbar shows updated count |
| Show widget | Appears at end of its original column |
| Reset layout | Restores DEFAULT_LAYOUT with column/order |
| Page load | Load API layout → migrate → render. Falls back to localStorage → DEFAULT_LAYOUT |

## 8. Files to Modify

| File | Change |
|---|---|
| `apps/web/lib/layout-types.ts` | Add `column: 0 \| 1`, `order: number` to LayoutWidget; update DEFAULT_LAYOUT |
| `apps/web/hooks/useDashboardLayout.ts` | Update migrateLayout for column/order migration |
| `apps/web/components/DashboardLayout.tsx` | Rewrite as DashboardGridLayout with 2-column grid |
| `apps/web/components/design-system/` | Add WidgetCard.tsx component |
| `apps/web/app/page.tsx` | Update imports, pass new props |

## 9. Widget Title Mapping

```typescript
const WIDGET_TITLES: Record<WidgetId, string> = {
  "equity-curve": "Equity Curve",
  "daily-summary": "Daily Summary",
  "recent-trades": "Recent Trades",
  "journal-snapshot": "Journal",
  "behavior-analytics": "Behavior Analytics",
  "heatmap": "Trading Heatmap",
  "analytics-insights": "Insights",
  "ai-coach": "AI Coach",
};
```

## 10. Out of Scope

- Stat card redesign (visual polish only if trivial)
- New widgets or data sources
- Layout presets / one-click theme switching
- Animation library beyond dnd-kit
