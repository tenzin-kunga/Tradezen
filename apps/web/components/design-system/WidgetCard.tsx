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
  const accent = WIDGET_COLORS[widget.id as WidgetId] ?? "rgba(255,255,255,0.15)";
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
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
