"use client";

import { useMemo } from "react";
import Link from "next/link";
import { WidgetShell } from "@/components/design-system";

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

  // 4-color palette following 60:30:10 visual weight
  // 60% neutral (empty), 30% secondary (active), 10% accent (profit/loss)
  const intensity = (day: DayData | null): string => {
    if (!day || day.trades === 0) return "var(--bg-hover, #1e2028)";
    if (!day.disciplined) return "var(--accent-loss, #ef4444)";
    if (day.pnl > 0) return "var(--accent-profit, #22c55e)";
    return "var(--accent, #3b82f6)";
  };

  return (
    <WidgetShell
      title="TRADING CONSISTENCY"
      headerAction={<Link href="/analytics" className="text-xs text-accent no-underline">Details →</Link>}
      loading={loading}
      isEmpty={data.length === 0}
      emptyMessage="Consistency data will appear once you start trading."
    >
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((day, i) => (
          <div
            key={i}
            className="aspect-square rounded-xs transition-opacity min-h-[14px]"
            style={{ backgroundColor: intensity(day) }}
            title={day ? `${day.date}: ${day.trades} trades, $${day.pnl}` : "No trades"}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-text-dim">Less</span>
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "var(--bg-hover, #1e2028)" }} />
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "var(--accent, #3b82f6)" }} />
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "var(--accent-profit, #22c55e)" }} />
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "var(--accent-loss, #ef4444)" }} />
        <span className="text-[10px] text-text-dim">More</span>
      </div>
    </WidgetShell>
  );
}
