"use client";

import { useEffect, useState, useCallback } from "react";
import { getTrades, getAnalytics } from "@/lib/api";
import StatCard from "@/components/StatCard";
import WelcomeBanner from "@/components/WelcomeBanner";
import EmptyState from "@/components/EmptyState";
import { StatCardSkeleton } from "@/components/Skeleton";
import EquityChart from "@/components/EquityChart";
import Link from "next/link";
import { useRealtime } from "@/hooks/use-realtime";

type Trade = {
  id: string; symbol: string; direction: string;
  entry_price: number; exit_price: number; lot_size: number; pnl: number;
  stop_loss: number | null; take_profit: number | null;
  created_at: string;
};

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function buildEquityCurve(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let cum = 0;
  return sorted.map((t) => {
    cum += t.pnl;
    return { date: t.created_at, equity: Math.round(cum * 100) / 100 };
  });
}

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    Promise.all([
      getTrades({ limit: 100, sort: "created_at", order: "desc" }),
      getAnalytics(),
    ])
      .then(([tradesRes, analyticsRes]) => {
        setTrades(tradesRes.data);
        setAnalytics(analyticsRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime('trade:created', () => {
    loadData();
  });

  useRealtime('trade:updated', () => {
    loadData();
  });

  useRealtime('trade:deleted', () => {
    loadData();
  });

  const equityData = buildEquityCurve(trades);
  const recent = trades.slice(0, 5);

  const pnlStr = analytics ? fmt(analytics.totalPnl) : "--";
  const pnlColor = analytics ? (analytics.totalPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)") : undefined;
  const winRateStr = analytics ? `${analytics.winRate}%` : "--";
  const pfStr = analytics ? String(analytics.profitFactor) : "--";
  const rrStr = analytics ? (analytics.avgRR > 0 ? `1:${analytics.avgRR.toFixed(1)}` : "--") : "--";

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Welcome Banner */}
      <div style={{ marginBottom: 24 }}>
        <WelcomeBanner />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fade-up"><StatCardSkeleton /></div>
            ))}
          </>
        ) : (
          <>
            <StatCard title="Total P&L" value={pnlStr} />
            <StatCard title="Win Rate" value={winRateStr} />
            <StatCard title="Profit Factor" value={pfStr} />
            <StatCard title="Avg Risk:Reward" value={rrStr} />
          </>
        )}
      </div>

      <div className="fade-up mb-4">
        <EquityChart data={equityData} />
      </div>

      <div className="glass-card p-4 md:p-6 fade-up mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-5">
          <span className="label-caps">
            RECENT TRADES
          </span>
          <Link href="/trades" className="btn-glass" style={{ textDecoration: "none" }}>
            VIEW ALL
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="Start Your Trading Journey"
            description="Log your first trade to see your performance data and analytics."
            actionLabel="Log First Trade"
            actionHref="/add-trade"
          />
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["SYMBOL", "DIRECTION", "RESULT", "EXIT PRICE", "NET P&L"].map((h) => (
                    <th key={h} className="label-caps whitespace-nowrap" style={{ textAlign: "left", paddingBottom: 12, paddingRight: 16 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => {
                  const isWin = t.pnl >= 0;
                  const isLong = t.direction === "buy";
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="whitespace-nowrap" style={{ padding: "12px 16px 12px 0", fontWeight: 700 }}>{t.symbol}</td>
                      <td className="whitespace-nowrap" style={{ padding: "12px 16px 12px 0", fontWeight: 700, color: isLong ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                        {isLong ? "LONG" : "SHORT"}
                      </td>
                      <td className="whitespace-nowrap" style={{ padding: "12px 16px 12px 0", fontWeight: 700, color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                        {isWin ? "WIN" : "LOSS"}
                      </td>
                      <td className="mono-data whitespace-nowrap" style={{ padding: "12px 16px 12px 0" }}>{t.exit_price}</td>
                      <td className="mono-data whitespace-nowrap" style={{ padding: "12px 0 12px 0", fontWeight: 700, color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                        {fmt(t.pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
