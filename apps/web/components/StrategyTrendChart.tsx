"use client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "var(--accent-profit)",
  "var(--accent-cyan)",
  "var(--accent-purple)",
  "var(--accent-warn)",
  "var(--accent-loss)",
  "#8884d8",
];

interface MonthlyData {
  month: string;
  trades: number;
  pnl: number;
  winRate: number;
}

export default function StrategyTrendChart({
  series,
}: {
  series: { strategy: string; monthly: MonthlyData[] }[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (series.length === 0) return null;

  const allMonths = [
    ...new Set(series.flatMap((s) => s.monthly.map((m) => m.month))),
  ].sort();

  const combined = allMonths.map((month) => {
    const row: Record<string, any> = { month };
    for (const s of series) {
      const entry = s.monthly.find((m) => m.month === month);
      row[s.strategy] = entry ? entry.pnl : null;
    }
    return row;
  });

  const toggleLine = (strategy: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(strategy)) next.delete(strategy);
      else next.add(strategy);
      return next;
    });
  };

  return (
    <div
      className="rounded p-4 md:p-5 mb-4"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
        STRATEGY P&L TREND
      </div>
      {combined.length > 1 ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={combined} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--text-muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: "11px",
              }}
            />
            <Legend
              onClick={(e) => toggleLine(e.value)}
              wrapperStyle={{ fontSize: "10px", cursor: "pointer", fontFamily: "var(--font-display)" }}
            />
            {series.map((s, i) => (
              <Line
                key={s.strategy}
                type="monotone"
                dataKey={s.strategy}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                hide={hidden.has(s.strategy)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-xs text-center py-10" style={{ color: "var(--text-dim)" }}>
          INSUFFICIENT DATA FOR TREND CHART
        </div>
      )}
    </div>
  );
}
