"use client";

import { useMemo } from "react";
import Link from "next/link";

type DayData = { date: string; trades: number; pnl: number; disciplined: boolean };

type Props = { data: DayData[]; loading?: boolean };

export default function TradingHeatmap({ data, loading }: Props) {
  const weeks = useMemo(() => {
    if (data.length === 0) return [];
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const result: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];
    const dayMap = new Map<string, DayData>();
    sorted.forEach((d) => dayMap.set(d.date, d));
    const start = new Date(sorted[0].date);
    const end = new Date();
    const d = new Date(start);
    d.setDate(d.getDate() - d.getDay());
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10);
      currentWeek.push(dayMap.get(dateStr) || null);
      if (d.getDay() === 6) {
        result.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [data]);

  const intensity = (day: DayData | null): string => {
    if (!day || day.trades === 0) return "#1a1b1e";
    if (!day.disciplined) return "#ef4444";
    if (day.pnl > 0) return "#22c55e";
    if (day.trades > 0) return "#3b82f6";
    return "#f59e0b";
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 180, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 100, background: "var(--bg-surface-hover)", borderRadius: 8 }} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="label-caps">TRADING CONSISTENCY</span>
          <Link href="/analytics" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Details →</Link>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Consistency data will appear once you start trading.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">TRADING CONSISTENCY</span>
        <Link href="/analytics" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Details →</Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 3, minWidth: 400 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: intensity(day),
                    transition: "opacity 0.2s",
                  }}
                  title={day ? `${day.date}: ${day.trades} trades, $${day.pnl}` : "No trades"}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Less</span>
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#1a1b1e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#3b82f6" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#22c55e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#f59e0b" }} />
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#ef4444" }} />
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>More</span>
      </div>
    </div>
  );
}
