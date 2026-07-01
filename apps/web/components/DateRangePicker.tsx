"use client";

import { useState, useCallback } from "react";
import Popover from "./Popover";

type DateRangePickerProps = {
  fromDate: string;
  toDate: string;
  onRangeChange: (from: string, to: string) => void;
};

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "YTD", days: -1 },
  { label: "All Time", days: -2 },
];

function formatDisplayText(fromDate: string, toDate: string): string {
  if (!fromDate || !toDate) return "";
  const f = new Date(fromDate + "T00:00:00");
  const t = new Date(toDate + "T00:00:00");
  if (f > t) return "";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const sameYear = f.getFullYear() === t.getFullYear();
  return `${f.toLocaleDateString("en-US", opts)} – ${t.toLocaleDateString("en-US", sameYear ? opts : { ...opts, year: "numeric" })}`;
}

export default function DateRangePicker({
  fromDate,
  toDate,
  onRangeChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const handlePreset = useCallback(
    (days: number) => {
      const now = new Date();
      const endStr = now.toISOString().slice(0, 10);
      let startStr: string;
      if (days === -2) {
        startStr = "";
      } else if (days === -1) {
        startStr = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      } else if (days === 0) {
        startStr = endStr;
      } else {
        startStr = new Date(now.getTime() - days * 86400000)
          .toISOString()
          .slice(0, 10);
      }
      onRangeChange(startStr, endStr);
      setOpen(false);
    },
    [onRangeChange],
  );

  const displayText = formatDisplayText(fromDate, toDate);

  const presetsActive = (days: number): boolean => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    let startStr: string;
    if (days === -2) startStr = "";
    else if (days === -1)
      startStr = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    else if (days === 0) startStr = endStr;
    else
      startStr = new Date(now.getTime() - days * 86400000)
        .toISOString()
        .slice(0, 10);
    return fromDate === startStr && toDate === endStr;
  };

  const triggerEl = (
    <button
      className="flex items-center gap-2 px-3 rounded-lg"
      style={{
        height: 40,
        border: "none",
        color: "var(--text-primary)",
        background: "var(--bg-primary)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "var(--text-sm)",
        minWidth: 180,
      }}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ color: "var(--text-dim)", flexShrink: 0 }}
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
      <span className="flex-1 text-left">
        {displayText || "Select date range"}
      </span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ color: "var(--text-dim)" }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} trigger={triggerEl}>
      <div className="p-3">
        <div className="grid grid-cols-3 gap-1 mb-3">
          {PRESETS.map((p) => {
            const active = presetsActive(p.days);
            return (
              <button
                key={p.label}
                onClick={() => handlePreset(p.days)}
                className="text-xs font-medium px-2 rounded-lg"
                style={{
                  height: 40,
                  border: active
                    ? "1px solid rgba(59,130,246,0.35)"
                    : "1px solid var(--border)",
                  color: active ? "rgb(96,165,250)" : "var(--text-dim)",
                  background: active ? "rgba(59,130,246,0.12)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.12s ease",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center gap-2 mb-3"
          style={{ color: "var(--text-dim)" }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--border)",
            }}
          />
          <span className="text-[9px] font-medium tracking-wider">CUSTOM</span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--border)",
            }}
          />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onRangeChange(e.target.value, toDate)}
            aria-label="From date"
            style={{
              flex: 1,
              height: 40,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: "var(--text-sm)",
              padding: "0 var(--space-3)",
              colorScheme: "dark",
            }}
          />
          <span style={{ color: "var(--text-dim)", fontSize: 11 }}>–</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onRangeChange(fromDate, e.target.value)}
            aria-label="To date"
            style={{
              flex: 1,
              height: 40,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: "var(--text-sm)",
              padding: "0 var(--space-3)",
              colorScheme: "dark",
            }}
          />
        </div>

        {fromDate && toDate && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                onRangeChange("", "");
                setOpen(false);
              }}
              className="text-[10px] font-medium px-2 rounded"
              style={{
                height: 28,
                border: "none",
                background: "rgba(239,68,68,0.1)",
                color: "var(--accent-loss)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </Popover>
  );
}
