"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DashboardLayout, LayoutWidget } from "@/lib/layout-types";
import { DEFAULT_LAYOUT } from "@/lib/layout-types";
import { getLayout, saveLayout } from "@/lib/api";

const LAYOUT_KEY = "tradezen_dashboard_layout";
const DEBOUNCE_MS = 2000;

function migrateLayout(layout: DashboardLayout): DashboardLayout {
  const widgets = layout.widgets.flatMap((w) => {
    // @ts-expect-error — legacy migration from analytics-preview
    if (w.id === "analytics-preview") {
      return [
        { id: "analytics-insights" as const, visible: w.visible, size: w.size },
        { id: "ai-coach" as const, visible: w.visible, size: w.size },
      ];
    }
    return [w];
  });
  return widgets === layout.widgets ? layout : { ...layout, widgets };
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
