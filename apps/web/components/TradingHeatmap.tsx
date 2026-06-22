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

  const intensity = (day: DayData | null): string => {
    if (!day || day.trades === 0) return "#1a1b1e";
    if (!day.disciplined) return "#ef4444";
    if (day.pnl > 0) return "#22c55e";
    if (day.trades > 0) return "#3b82f6";
    return "#f59e0b";
  };

  return (
    <WidgetShell
      title="TRADING CONSISTENCY"
      headerAction={<Link href="/analytics" className="text-xs text-accent no-underline">Details →</Link>}
      loading={loading}
      isEmpty={data.length === 0}
      emptyMessage="Consistency data will appear once you start trading."
    >
      <div className="overflow-x-auto">
        <div className="flex gap-0.5" style={{ minWidth: 400 }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="w-3 h-3 rounded-xs transition-opacity"
                  style={{ backgroundColor: intensity(day) }}
                  title={day ? `${day.date}: ${day.trades} trades, $${day.pnl}` : "No trades"}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-text-dim">Less</span>
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#1a1b1e" }} />
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#3b82f6" }} />
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#22c55e" }} />
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#f59e0b" }} />
        <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#ef4444" }} />
        <span className="text-[10px] text-text-dim">More</span>
      </div>
    </WidgetShell>
  );
}
