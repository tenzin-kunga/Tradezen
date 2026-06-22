"use client";
import { useState, useMemo } from "react";

interface DayData {
  date: string;
  pnl: number;
  trades: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getIntensityClass(pnl: number, maxAbs: number): string {
  if (pnl === 0) return "";
  const ratio = Math.abs(pnl) / maxAbs;
  if (pnl > 0) {
    if (ratio > 0.66) return "bg-[var(--accent-profit)]/80";
    if (ratio > 0.33) return "bg-[var(--accent-profit)]/40";
    return "bg-[var(--accent-profit)]/15";
  }
  if (ratio > 0.66) return "bg-[var(--accent-loss)]/80";
  if (ratio > 0.33) return "bg-[var(--accent-loss)]/40";
  return "bg-[var(--accent-loss)]/15";
}

function getTextClass(pnl: number, maxAbs: number): string {
  if (pnl === 0) return "";
  const ratio = Math.abs(pnl) / maxAbs;
  if (ratio > 0.66) return "text-white";
  return pnl > 0 ? "text-[var(--accent-profit)]" : "text-[var(--accent-loss)]";
}

export default function PerformanceCalendar({
  data,
}: {
  data: DayData[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const pnlMap = useMemo(() => {
    const map = new Map<string, DayData>();
    for (const d of data) {
      const key = d.date.slice(0, 10);
      map.set(key, d);
    }
    return map;
  }, [data]);

  const maxAbsPnl = useMemo(() => {
    let max = 0;
    for (const d of data) {
      const abs = Math.abs(d.pnl);
      if (abs > max) max = abs;
    }
    return max || 1;
  }, [data]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const cells: { day: number; isCurrent: boolean; data?: DayData }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({ day, isCurrent: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatKey(year, month, d);
    cells.push({ day: d, isCurrent: true, data: pnlMap.get(key) });
  }
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const remaining = totalCells - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, isCurrent: false });
  }

  const formatCurrency = (v: number) => {
    const sign = v >= 0 ? "+" : "";
    return `${sign}$${v.toFixed(0)}`;
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-widest text-[var(--text-muted)] uppercase">
          PERFORMANCE CALENDAR
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1 rounded transition-colors hover:bg-[var(--bg-primary)]"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {monthName} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded transition-colors hover:bg-[var(--bg-primary)]"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold py-1"
            style={{ color: "var(--text-dim)" }}
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.isCurrent) {
            return (
              <div
                key={i}
                className="aspect-square rounded flex items-center justify-center"
                style={{ backgroundColor: "var(--bg-primary)" }}
              >
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>{cell.day}</span>
              </div>
            );
          }

          const pnl = cell.data?.pnl ?? 0;
          const hasData = cell.data !== undefined;
          const cls = hasData ? getIntensityClass(pnl, maxAbsPnl) : "";
          const txtCls = hasData ? getTextClass(pnl, maxAbsPnl) : "";

          return (
            <div
              key={i}
              className={`aspect-square rounded flex flex-col items-center justify-center ${cls} relative group cursor-pointer`}
              style={!hasData ? { backgroundColor: "var(--bg-primary)" } : undefined}
            >
              <span
                className={`text-[11px] font-medium leading-none ${txtCls}`}
                style={!hasData ? { color: "var(--text-muted)" } : undefined}
              >
                {cell.day}
              </span>
              {hasData && (
                <span className={`text-[8px] mt-0.5 leading-none ${txtCls}`}>
                  {formatCurrency(pnl)}
                </span>
              )}
              {hasData && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {cell.data!.date}: {formatCurrency(pnl)} ({cell.data!.trades} trades)
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 text-[10px]" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--accent-profit)]/15" />
          <span>Low profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--accent-profit)]/40" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--accent-profit)]/80" />
          <span>High profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--accent-loss)]/40" />
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--bg-primary)" }} />
          <span>No trades</span>
        </div>
      </div>
    </div>
  );
}
