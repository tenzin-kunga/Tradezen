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
  Area,
  AreaChart,
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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="label-caps">
          EQUITY GROWTH
        </span>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn-glass ${activeTab === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 260, color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.1em' }}
        >
          NO DATA
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={filtered} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray=""
              horizontal
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis dataKey="date" hide />
            <YAxis
              tickFormatter={(v) => v.toLocaleString()}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Equity"]}
              labelStyle={{ display: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#equityGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#22d3ee',
                stroke: 'var(--bg-surface)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}