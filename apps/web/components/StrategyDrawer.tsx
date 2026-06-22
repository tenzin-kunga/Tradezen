"use client";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getStrategyPerformance } from "@/lib/api";

interface MonthlyData {
  month: string;
  trades: number;
  pnl: number;
  winRate: number;
}

export default function StrategyDrawer({
  strategy,
  metrics,
  onClose,
}: {
  strategy: string;
  metrics: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
    avgRr: number;
    maxDrawdown: number;
    totalPnl: number;
  };
  onClose: () => void;
}) {
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getStrategyPerformance(strategy)
      .then((res) => setMonthly(res.monthly ?? []))
      .catch(() => setMonthly([]))
      .finally(() => setLoading(false));
  }, [strategy]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 998,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          backgroundColor: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 999,
          overflowY: "auto",
          fontFamily: "var(--font-mono)",
          padding: "24px",
        }}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-sm tracking-widest m-0" style={{ color: "var(--text-primary)" }}>
              #{strategy}
            </h2>
            <div
              className="text-lg font-bold mt-1"
              style={{ color: metrics.totalPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}
            >
              {metrics.totalPnl >= 0 ? "+" : ""}${metrics.totalPnl.toFixed(2)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs tracking-widest cursor-pointer"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              padding: "4px 10px",
            }}
          >
            CLOSE
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "TRADES", value: metrics.totalTrades.toString() },
            {
              label: "WIN RATE",
              value: `${metrics.winRate.toFixed(2)}%`,
              color: metrics.winRate >= 50 ? "var(--accent-profit)" : "var(--accent-loss)",
            },
            {
              label: "PROFIT FACTOR",
              value: metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2),
              color: metrics.profitFactor >= 1.5 ? "var(--accent-profit)" : "var(--accent-warn)",
            },
            {
              label: "EXPECTANCY",
              value: `${metrics.expectancy >= 0 ? "+" : ""}$${metrics.expectancy.toFixed(2)}`,
              color: metrics.expectancy >= 0 ? "var(--accent-profit)" : "var(--accent-loss)",
            },
            {
              label: "AVG RR",
              value: metrics.avgRr.toFixed(2),
              color: metrics.avgRr >= 1.5 ? "var(--accent-profit)" : "var(--accent-warn)",
            },
            {
              label: "MAX DD",
              value: `-$${metrics.maxDrawdown.toFixed(2)}`,
              color: "var(--accent-loss)",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded p-3"
              style={{ backgroundColor: "var(--bg-primary)" }}
            >
              <div className="text-[10px] tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
                {m.label}
              </div>
              <div className="text-sm font-bold font-mono" style={{ color: m.color ?? "var(--text-primary)" }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-2 text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
          MONTHLY P&L TREND
        </div>
        {loading ? (
          <div className="text-xs text-center py-10" style={{ color: "var(--text-dim)" }}>
            LOADING...
          </div>
        ) : monthly.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                }}
              />
              <Line type="monotone" dataKey="pnl" stroke="var(--accent-profit)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-center py-10" style={{ color: "var(--text-dim)" }}>
            {monthly.length === 1 ? "SINGLE MONTH — MORE DATA NEEDED" : "NO MONTHLY DATA"}
          </div>
        )}
      </div>
    </>
  );
}
