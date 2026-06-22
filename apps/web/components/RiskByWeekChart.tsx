"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function RiskByWeekChart({
  data,
}: {
  data: { week: string; totalRisk: number; totalPnl: number; tradeCount: number; maxRisk: number }[];
}) {
  if (data.length === 0) return null;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-4">
      <h3 className="text-xs font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-3">
        RISK EXPOSURE BY WEEK
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickLine={false}
              tickFormatter={(v: number) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  totalRisk: "Total Risk",
                  totalPnl: "Total PnL",
                  maxRisk: "Max Risk",
                  tradeCount: "Trades",
                };
                return name === "tradeCount"
                  ? [value, labels[name] || name]
                  : [`$${value.toFixed(2)}`, labels[name] || name];
              }}
            />
            <Bar dataKey="totalRisk" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.totalPnl >= 0
                      ? "var(--accent-profit)"
                      : "var(--accent-loss)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
