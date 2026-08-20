"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  DashboardLayout,
  SectionLayout,
  PresetName,
} from "@/lib/layout-types";
import { DEFAULT_SECTIONS, SECTION_PRESETS } from "@/lib/layout-types";
import { getLayout, saveLayout } from "@/lib/api";

const LAYOUT_KEY = "tradezen_dashboard_layout";
const DEBOUNCE_MS = 2000;

function mergeSections(stored: SectionLayout[]): SectionLayout[] {
  const merged = [...stored];
  for (const def of DEFAULT_SECTIONS) {
    if (!merged.find((s) => s.id === def.id)) {
      merged.push({
        id: def.id,
        visible: def.visible,
        column: def.column,
        order: def.order,
      });
    }
  }
  return merged;
}

export function useDashboardLayout() {
  const [sections, setSections] = useState<SectionLayout[]>(DEFAULT_SECTIONS);
  const [preset, setPreset] = useState<string>("default");
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      try {
        const stored: DashboardLayout = JSON.parse(raw);
        if (stored.sections?.length > 0) {
          setSections(mergeSections(stored.sections));
          setPreset(stored.preset ?? "default");
        }
      } catch {
        // ignore malformed stored layout
      }
    }
    getLayout()
      .then((apiLayout) => {
        if (apiLayout?.sections?.length > 0) {
          const merged = mergeSections(apiLayout.sections);
          setSections(merged);
          setPreset(apiLayout.preset ?? "default");
          localStorage.setItem(
            LAYOUT_KEY,
            JSON.stringify({ sections: merged, preset: apiLayout.preset }),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((s: SectionLayout[], p: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveLayout({ sections: s, preset: p }).catch(() => {});
    }, DEBOUNCE_MS);
  }, []);

  const setAndPersist = useCallback(
    (s: SectionLayout[], p: string) => {
      setSections(s);
      setPreset(p);
      localStorage.setItem(
        LAYOUT_KEY,
        JSON.stringify({ sections: s, preset: p }),
      );
      persist(s, p);
    },
    [persist],
  );

  const applyPreset = useCallback(
    (name: PresetName) => {
      setAndPersist(SECTION_PRESETS[name], name);
    },
    [setAndPersist],
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      setAndPersist(
        sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
        "custom",
      );
    },
    [sections, setAndPersist],
  );

  const reorderInColumn = useCallback(
    (id: string, direction: "up" | "down") => {
      const target = sections.find((s) => s.id === id);
      if (!target) return;
      const colSections = sections
        .filter((s) => s.column === target.column)
        .sort((a, b) => a.order - b.order);
      const idx = colSections.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const newIdx =
        direction === "up"
          ? Math.max(0, idx - 1)
          : Math.min(colSections.length - 1, idx + 1);
      if (newIdx === idx) return;

      const updated = [...colSections];
      const [moved] = updated.splice(idx, 1);
      updated.splice(newIdx, 0, moved);

      const newSections = sections.map((s) => {
        if (s.column !== target.column) return s;
        const newOrder = updated.findIndex((u) => u.id === s.id);
        return { ...s, order: newOrder };
      });

      setAndPersist(newSections, "custom");
    },
    [sections, setAndPersist],
  );

  const moveToColumn = useCallback(
    (id: string) => {
      const target = sections.find((s) => s.id === id);
      if (!target) return;
      const newColumn: "left" | "right" =
        target.column === "left" ? "right" : "left";
      const maxOrder = sections
        .filter((s) => s.column === newColumn)
        .reduce((max, s) => Math.max(max, s.order), -1);

      const newSections = sections.map((s) =>
        s.id === id ? { ...s, column: newColumn, order: maxOrder + 1 } : s,
      );
      setAndPersist(newSections, "custom");
    },
    [sections, setAndPersist],
  );

  return {
    sections,
    preset,
    loaded,
    toggleVisibility,
    reorderInColumn,
    moveToColumn,
    applyPreset,
  };
}
