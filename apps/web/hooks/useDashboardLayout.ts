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
