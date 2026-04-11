"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = { date: string; equity: number };

type Props = { data: DataPoint[] };

const tabs = ["1D", "1W", "1M", "ALL"] as const;

function filterByTab(data: DataPoint[], tab: string): DataPoint[] {
  if (tab === "ALL" || data.length === 0) return data;
  const now = new Date();
  const cutoff = new Date(now);
  if (tab === "1D") cutoff.setDate(now.getDate() - 1);
  else if (tab === "1W") cutoff.setDate(now.getDate() - 7);
  else if (tab === "1M") cutoff.setMonth(now.getMonth() - 1);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

export default function EquityChart({ data }: Props) {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const filtered = useMemo(() => filterByTab(data, activeTab), [data, activeTab]);

  return (
    <div
      className="p-6"
      style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span
          className="text-xs font-bold tracking-widest"
          style={{ color: "#888888", letterSpacing: "0.12em" }}
        >
          EQUITY GROWTH (TOTAL)
        </span>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1 text-xs font-bold tracking-wider transition-colors"
              style={{
                color: activeTab === tab ? "#ffffff" : "#888888",
                borderBottom: activeTab === tab ? "2px solid #ffffff" : "2px solid transparent",
                background: "transparent",
                letterSpacing: "0.1em",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {filtered.length === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 260, color: "#888888", fontSize: 12, letterSpacing: "0.1em" }}
        >
          NO DATA
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={filtered} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray=""
              horizontal
              vertical={false}
              stroke="#2a2a2a"
            />
            <XAxis dataKey="date" hide />
            <YAxis
              tickFormatter={(v) => v.toLocaleString()}
              stroke="#888888"
              tick={{ fill: "#888888", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1c1c1c",
                border: "1px solid #2a2a2a",
                color: "#fff",
                fontSize: 12,
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Equity"]}
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#ffffff"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
