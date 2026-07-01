"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StrategyMetric {
  name: string;
  value: number;
  pnl: number;
}

const METRICS = [
  {
    key: "winRate",
    label: "WIN RATE",
    suffix: "%",
    color: "var(--accent-profit)",
  },
  {
    key: "profitFactor",
    label: "PROFIT FACTOR",
    suffix: "",
    color: "var(--accent-cyan)",
  },
  {
    key: "expectancy",
    label: "EXPECTANCY",
    prefix: "$",
    suffix: "",
    color: "var(--accent-purple)",
  },
  { key: "avgRr", label: "AVG RR", suffix: "", color: "var(--accent-warn)" },
  {
    key: "maxDrawdown",
    label: "MAX DRAWDOWN",
    prefix: "-$",
    suffix: "",
    color: "var(--accent-loss)",
  },
];

export default function StrategyBarCharts({
  strategies,
}: {
  strategies: {
    strategy: string;
    winRate: number;
    profitFactor: number;
    expectancy: number;
    avgRr: number;
    maxDrawdown: number;
    totalPnl: number;
  }[];
}) {
  if (strategies.length === 0) return null;

  const chartData = (metric: string) =>
    strategies.map((s) => ({
      name: s.strategy,
      value:
        metric === "winRate"
          ? s.winRate
          : metric === "profitFactor"
            ? s.profitFactor === Infinity
              ? 5
              : s.profitFactor
            : metric === "expectancy"
              ? s.expectancy
              : metric === "avgRr"
                ? s.avgRr
                : s.maxDrawdown,
      pnl: s.totalPnl,
    }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {METRICS.map((m) => {
        const data = chartData(m.key);
        return (
          <div key={m.key} className="surface-1 rounded-xl p-4">
            <div
              className="text-xs tracking-widest mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              {m.label}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 9 }}
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
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  formatter={(value: number, _name: string, props: any) => {
                    const prefix =
                      m.key === "maxDrawdown" ? "-$" : (m.prefix ?? "");
                    const suffix = m.suffix ?? "";
                    const label = `${prefix}${value.toFixed(2)}${suffix}`;
                    const pnlStr = props.payload.pnl >= 0 ? "+" : "";
                    return [
                      label,
                      `${props.payload.name} (${pnlStr}$${props.payload.pnl.toFixed(2)})`,
                    ];
                  }}
                />
                <Bar dataKey="value" fill={m.color} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
