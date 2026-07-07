"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { WidgetShell } from "@/components/design-system";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

type DayData = {
  date: string;
  trades: number;
  pnl: number;
  disciplined: boolean;
};

type Props = { data: DayData[]; loading?: boolean };

// ─── Formatters (reused) ──────────────────────────────
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});
const fullWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

// ─── Weekday labels (Mon-first) ────────────────────────
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(2000, 0, 3 + i);
  return weekdayFormatter.format(date);
});

// ─── Cell color (3 states: green, red, gray) ──────────
function cellColor(day: DayData | null): string {
  if (!day || day.trades === 0) return "#1a1d24";
  if (day.pnl > 0) return "var(--accent-profit)";
  if (day.pnl < 0) return "var(--accent-loss)";
  return "#1a1d24";
}

// ─── Dow → row index (Mon=0, Sun=6) ───────────────────
function dowToRow(dow: number): number {
  return (dow + 6) % 7;
}

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
      // Reindex to Monday-first: getDay() returns Sun=0..Sat=6, map to Mon=0..Sun=6
      const monIdx = (d.getDay() + 6) % 7;
      currentWeek[monIdx] = dayMap.get(dateStr) || null;
      if (d.getDay() === 6) {
        result.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [data]);

  const context = useMemo(() => {
    if (data.length === 0) return null;

    let disciplined = 0;
    let tradingDays = 0;
    const weekdayPnl: number[] = [0, 0, 0, 0, 0, 0, 0];
    const weekdayTrades: number[] = [0, 0, 0, 0, 0, 0, 0];
    const weekdayPresent: boolean[] = [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ];

    for (const day of data) {
      if (day.trades > 0) {
        tradingDays++;
        if (day.disciplined) disciplined++;

        const dow = new Date(day.date + "T00:00:00").getDay();
        const row = dowToRow(dow);
        weekdayPnl[row] += day.pnl;
        weekdayTrades[row] += day.trades;
        weekdayPresent[row] = true;
      }
    }

    const consistency =
      tradingDays > 0 ? Math.round((disciplined / tradingDays) * 100) : 0;

    let bestDay: {
      name: string;
      totalPnl: number;
      trades: number;
    } | null = null;
    let worstDay: {
      name: string;
      totalPnl: number;
      trades: number;
    } | null = null;

    for (let i = 0; i < 7; i++) {
      if (!weekdayPresent[i]) continue;
      const name = fullWeekdayFormatter.format(new Date(2000, 0, 3 + i));
      const entry = { name, totalPnl: weekdayPnl[i], trades: weekdayTrades[i] };
      if (!bestDay || entry.totalPnl > bestDay.totalPnl) bestDay = entry;
      if (!worstDay || entry.totalPnl < worstDay.totalPnl) worstDay = entry;
    }

    return {
      consistency,
      disciplinedCount: disciplined,
      totalTradingDays: tradingDays,
      bestDay,
      worstDay,
    };
  }, [data]);

  const weekCount = Math.min(weeks.length, 7);

  return (
    <WidgetShell
      title="Trading Consistency"
      headerAction={
        <Link href="/analytics" className="text-xs text-accent no-underline">
          Details →
        </Link>
      }
      loading={loading}
      isEmpty={data.length === 0}
      emptyMessage="Consistency data will appear once you start trading."
      padding="lg"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Heatmap (60%) ─────────────────────── */}
        <div className="flex-[3] min-w-0">
          <TooltipProvider>
            <div
              className="grid gap-[3px] w-full"
              style={{
                gridTemplateColumns: `32px repeat(7, 1fr)`,
                gridTemplateRows: `32px repeat(${weekCount}, 1fr)`,
              }}
            >
              {/* Day header row (top) */}
              {WEEKDAYS.map((dayName, colIdx) => (
                <div
                  key={dayName}
                  className="flex items-end justify-center"
                  style={{
                    fontSize: "var(--meta)",
                    color: "var(--text-dim)",
                    fontWeight: 500,
                    gridRow: 1,
                    gridColumn: colIdx + 2,
                  }}
                >
                  {dayName}
                </div>
              ))}

              {/* Week labels (left column) */}
              {Array.from({ length: weekCount }, (_, weekIdx) => (
                <div
                  key={weekIdx}
                  className="flex items-center justify-center"
                  style={{
                    fontSize: "var(--meta)",
                    color: "var(--text-dim)",
                    fontWeight: 500,
                    gridRow: weekIdx + 2,
                    gridColumn: 1,
                  }}
                >
                  W{weekIdx + 1}
                </div>
              ))}

              {/* Heatmap cells */}
              {Array.from({ length: weekCount }, (_, weekIdx) =>
                Array.from({ length: 7 }, (_, dayIdx) => {
                  const day = weeks[weekIdx]?.[dayIdx] ?? null;
                  const isEmpty = !day || day.trades === 0;
                  return (
                    <Tooltip key={`${weekIdx}-${dayIdx}`}>
                      <TooltipTrigger
                        className="rounded-[4px] transition-all duration-150 hover:scale-105"
                        style={{
                          width: "100%",
                          aspectRatio: "5 / 3",
                          backgroundColor: cellColor(day),
                          cursor: isEmpty ? "default" : "pointer",
                          gridRow: weekIdx + 2,
                          gridColumn: dayIdx + 2,
                        }}
                        aria-label={
                          day
                            ? `${day.date}: ${day.trades} trades, $${day.pnl}`
                            : "No trades"
                        }
                      />
                      {day && !isEmpty && (
                        <TooltipContent side="bottom" sideOffset={6}>
                          <div className="font-medium">
                            {dateFormatter.format(
                              new Date(day.date + "T00:00:00")
                            )}
                          </div>
                          <div
                            className="font-semibold"
                            style={{
                              color:
                                day.pnl >= 0
                                  ? "var(--accent-profit)"
                                  : "var(--accent-loss)",
                            }}
                          >
                            {day.pnl >= 0 ? "+" : ""}${day.pnl.toFixed(0)} ·{" "}
                            {day.trades} trade{day.trades !== 1 ? "s" : ""}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })
              )}
            </div>
          </TooltipProvider>
        </div>

        {/* ── Divider (vertical) ───────────────── */}
        <div
          className="hidden lg:block"
          style={{
            width: 1,
            background: "var(--border)",
            alignSelf: "stretch",
          }}
        />

        {/* ── Insight panel (40%) ───────────────── */}
        <div className="flex-[2] flex flex-col justify-center gap-0">
          {/* Discipline */}
          <div className="flex items-center gap-3 py-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "rgba(34, 197, 94, 0.08)",
              }}
            >
              <Target size={20} style={{ color: "var(--accent-profit)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: "var(--meta)",
                  color: "var(--text-dim)",
                  fontWeight: 500,
                }}
              >
                Discipline
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-bold"
                  style={{
                    fontSize: 22,
                    lineHeight: 1,
                    color: "var(--accent-profit)",
                  }}
                >
                  {context?.consistency ?? "—"}%
                </span>
                {context && (
                  <span
                    style={{
                      fontSize: "var(--meta)",
                      color: "var(--text-dim)",
                    }}
                  >
                    {context.disciplinedCount}/{context.totalTradingDays} days
                    clean
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* Best Day */}
          <div className="flex items-center gap-3 py-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "rgba(34, 197, 94, 0.08)",
              }}
            >
              <TrendingUp size={20} style={{ color: "var(--accent-profit)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: "var(--meta)",
                  color: "var(--text-dim)",
                  fontWeight: 500,
                }}
              >
                Best Day
              </div>
              {context?.bestDay ? (
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: "var(--label)",
                      color: "var(--accent-profit)",
                    }}
                  >
                    {context.bestDay.name}
                  </span>
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: "var(--label)",
                      color: "var(--text-primary)",
                    }}
                  >
                    +${context.bestDay.totalPnl.toFixed(0)}
                  </span>
                </div>
              ) : (
                <div
                  style={{ fontSize: "var(--label)", color: "var(--text-dim)" }}
                >
                  —
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* Worst Day */}
          <div className="flex items-center gap-3 py-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "rgba(239, 68, 68, 0.08)",
              }}
            >
              <TrendingDown size={20} style={{ color: "var(--accent-loss)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: "var(--meta)",
                  color: "var(--text-dim)",
                  fontWeight: 500,
                }}
              >
                Worst Day
              </div>
              {context?.worstDay ? (
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: "var(--label)",
                      color: "var(--accent-loss)",
                    }}
                  >
                    {context.worstDay.name}
                  </span>
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: "var(--label)",
                      color: "var(--text-primary)",
                    }}
                  >
                    -${Math.abs(context.worstDay.totalPnl).toFixed(0)}
                  </span>
                </div>
              ) : (
                <div
                  style={{ fontSize: "var(--label)", color: "var(--text-dim)" }}
                >
                  —
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}


