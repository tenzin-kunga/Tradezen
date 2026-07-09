"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SectionLayout, PresetName } from "@/lib/layout-types";
import { SECTION_PRESETS, PRESET_LABELS } from "@/lib/layout-types";
import { getSection } from "@/lib/section-types";

type DashboardSettingsProps = {
  open: boolean;
  onClose: () => void;
  sections: SectionLayout[];
  preset: string;
  onApplyPreset: (name: PresetName) => void;
  onToggleVisibility: (id: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onMoveColumn: (id: string) => void;
};

export default function DashboardSettings({
  open,
  onClose,
  sections,
  preset,
  onApplyPreset,
  onToggleVisibility,
  onReorder,
  onMoveColumn,
}: DashboardSettingsProps) {
  const [tab, setTab] = useState<"presets" | "sections">("presets");

  const sortedSections = [...sections].sort((a, b) => {
    if (a.column !== b.column) return a.column === "left" ? -1 : 1;
    return a.order - b.order;
  });

  const isActivePreset = (name: string) => preset === name;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm p-0 overflow-y-auto"
      >
        <SheetHeader
          className="px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <SheetTitle className="text-sm font-bold tracking-wider">
            Dashboard
          </SheetTitle>
        </SheetHeader>

        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setTab("presets")}
            className="flex-1 py-2.5 text-xs font-semibold tracking-wider"
            style={{
              background:
                tab === "presets" ? "var(--bg-surface-hover)" : "transparent",
              color:
                tab === "presets" ? "var(--text-primary)" : "var(--text-dim)",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              borderBottom:
                tab === "presets"
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              transition: "all 0.15s var(--ease-out)",
            }}
          >
            PRESETS
          </button>
          <button
            onClick={() => setTab("sections")}
            className="flex-1 py-2.5 text-xs font-semibold tracking-wider"
            style={{
              background:
                tab === "sections" ? "var(--bg-surface-hover)" : "transparent",
              color:
                tab === "sections" ? "var(--text-primary)" : "var(--text-dim)",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              borderBottom:
                tab === "sections"
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              transition: "all 0.15s var(--ease-out)",
            }}
          >
            SECTIONS
          </button>
        </div>

        <div className="p-4">
          {tab === "presets" ? (
            <div className="flex flex-col gap-2">
              {(Object.keys(SECTION_PRESETS) as PresetName[]).map((name) => (
                <button
                  key={name}
                  onClick={() => onApplyPreset(name)}
                  className="w-full text-left px-4 py-3 rounded-lg"
                  style={{
                    background: isActivePreset(name)
                      ? "var(--bg-surface-hover)"
                      : "transparent",
                    border: isActivePreset(name)
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                    color: isActivePreset(name)
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.12s var(--ease-out)",
                  }}
                >
                  <div className="text-sm font-semibold">
                    {PRESET_LABELS[name]}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {name === "default" &&
                      "All sections visible in standard layout"}
                    {name === "compact" &&
                      "Critical sections only — clean workspace"}
                    {name === "analytics" &&
                      "Data-focused — charts, heatmap, insights"}
                    {name === "journal" &&
                      "Reflection first — journal, behavior, coach"}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {sortedSections.map((s) => {
                const def = getSection(s.id);
                const isFirstInCol =
                  sortedSections.filter((x) => x.column === s.column)[0]?.id ===
                  s.id;
                const isLastInCol =
                  sortedSections.filter((x) => x.column === s.column).at(-1)
                    ?.id === s.id;

                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{
                      opacity: s.visible ? 1 : 0.5,
                      background: s.visible
                        ? "transparent"
                        : "var(--bg-primary)",
                      transition: "opacity 0.15s var(--ease-out)",
                    }}
                  >
                    {/* Visibility toggle */}
                    <button
                      onClick={() => onToggleVisibility(s.id)}
                      className="flex items-center justify-center rounded"
                      style={{
                        width: 32,
                        height: 32,
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: s.visible
                          ? "var(--text-primary)"
                          : "var(--text-dim)",
                        flexShrink: 0,
                      }}
                      aria-label={s.visible ? "Hide section" : "Show section"}
                    >
                      {s.visible ? (
                        <svg
                          width="16"
                          height="16"
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
                          width="16"
                          height="16"
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

                    {/* Section info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {def?.title ?? s.id}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {def?.question}
                      </div>
                    </div>

                    {/* Column badge */}
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--bg-primary)",
                        color: "var(--text-dim)",
                      }}
                    >
                      {s.column === "left" ? "L" : "R"}
                    </span>

                    {/* Reorder controls */}
                    <div className="flex flex-col gap-px">
                      <button
                        onClick={() => onReorder(s.id, "up")}
                        disabled={isFirstInCol}
                        className="flex items-center justify-center rounded"
                        style={{
                          width: 24,
                          height: 20,
                          border: "none",
                          background: "none",
                          cursor: isFirstInCol ? "default" : "pointer",
                          color: "var(--text-dim)",
                          opacity: isFirstInCol ? 0.3 : 1,
                        }}
                        aria-label="Move up"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onReorder(s.id, "down")}
                        disabled={isLastInCol}
                        className="flex items-center justify-center rounded"
                        style={{
                          width: 24,
                          height: 20,
                          border: "none",
                          background: "none",
                          cursor: isLastInCol ? "default" : "pointer",
                          color: "var(--text-dim)",
                          opacity: isLastInCol ? 0.3 : 1,
                        }}
                        aria-label="Move down"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>

                    {/* Move column */}
                    <button
                      onClick={() => onMoveColumn(s.id)}
                      className="flex items-center justify-center rounded"
                      style={{
                        width: 24,
                        height: 32,
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "var(--text-dim)",
                      }}
                      aria-label={`Move to ${s.column === "left" ? "right" : "left"} column`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      >
                        {s.column === "left" ? (
                          <>
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </>
                        ) : (
                          <>
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
