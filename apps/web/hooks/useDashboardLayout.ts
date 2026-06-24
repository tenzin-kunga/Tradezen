"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DashboardLayout, LayoutWidget, WidgetId } from "@/lib/layout-types";
import { DEFAULT_LAYOUT } from "@/lib/layout-types";
import { getLayout, saveLayout } from "@/lib/api";

const LAYOUT_KEY = "tradezen_dashboard_layout";
const DEBOUNCE_MS = 2000;

function migrateLayout(layout: DashboardLayout): DashboardLayout {
  let changed = false;

  const widgets = layout.widgets.flatMap((w) => {
    // @ts-expect-error — legacy migration from analytics-preview
    if (w.id === "analytics-preview") {
      changed = true;
      return [
        { id: "analytics-insights" as const, visible: w.visible, size: w.size, column: 0 as const, order: 0 },
        { id: "ai-coach" as const, visible: w.visible, size: w.size, column: 1 as const, order: 0 },
      ];
    }
    return [w];
  });

  const migrated = widgets.map((w, i) => {
    if (w.column === undefined || w.order === undefined) {
      changed = true;
      return { ...w, column: (i % 2) as 0 | 1, order: Math.floor(i / 2) };
    }
    return w;
  });

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

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let stored: DashboardLayout | null = null;
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      try {
        stored = JSON.parse(raw);
      } catch {}
    }
    if (stored) {
      const migrated = migrateLayout(stored);
      setLayout(migrated);
      if (migrated !== stored) {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(migrated));
      }
    }
    getLayout().then((apiLayout) => {
      if (apiLayout) {
        const migrated = migrateLayout(apiLayout);
        setLayout(migrated);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(migrated));
      }
      setLoaded(true);
    });
  }, []);

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
