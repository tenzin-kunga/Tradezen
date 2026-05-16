"use client";

import { useEffect, useState } from "react";
import { getTrades, getAnalytics } from "@/lib/api";
import StatCard from "@/components/StatCard";
import EquityChart from "@/components/EquityChart";
import Link from "next/link";

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

  useEffect(() => {
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

  const equityData = buildEquityCurve(trades);
  const recent = trades.slice(0, 5);

  const pnlStr = analytics ? fmt(analytics.totalPnl) : "--";
  const pnlColor = analytics ? (analytics.totalPnl >= 0 ? "#10b981" : "#ef4444") : undefined;
  const winRateStr = analytics ? `${analytics.winRate}%` : "--";
  const pfStr = analytics ? String(analytics.profitFactor) : "--";
  const rrStr = analytics ? (analytics.avgRR > 0 ? `1:${analytics.avgRR.toFixed(1)}` : "--") : "--";

  return (
    <div style={{ minHeight: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <div className="fade-up"><StatCard label="TOTAL P&L" value={loading ? "..." : pnlStr} valueColor={pnlColor} /></div>
        <div className="fade-up"><StatCard label="WIN RATE" value={loading ? "..." : winRateStr} /></div>
        <div className="fade-up"><StatCard label="PROFIT FACTOR" value={loading ? "..." : pfStr} /></div>
        <div className="fade-up"><StatCard label="AVG R:R" value={loading ? "..." : rrStr} /></div>
      </div>

      <div className="fade-up" style={{ marginBottom: 16 }}>
        <EquityChart data={equityData} />
      </div>

      <div className="glass-card p-6 fade-up" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span className="label-caps">
            RECENT TRADES
          </span>
          <Link href="/trades" className="btn-glass" style={{ textDecoration: "none" }}>
            VIEW ALL
          </Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>No trades logged yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["SYMBOL", "DIRECTION", "RESULT", "EXIT PRICE", "NET P&L"].map((h) => (
                  <th key={h} className="label-caps" style={{ textAlign: "left", paddingBottom: 12, paddingRight: 16 }}>
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
                    <td style={{ padding: "16px 16px 16px 0", fontWeight: 700 }}>{t.symbol}</td>
                    <td style={{ padding: "16px 16px 16px 0", fontWeight: 700, color: isLong ? "#10b981" : "#ef4444" }}>
                      {isLong ? "LONG" : "SHORT"}
                    </td>
                    <td style={{ padding: "16px 16px 16px 0", fontWeight: 700, color: isWin ? "#10b981" : "#ef4444" }}>
                      {isWin ? "WIN" : "LOSS"}
                    </td>
                    <td className="mono-data" style={{ padding: "16px 16px 16px 0" }}>{t.exit_price}</td>
                    <td className="mono-data" style={{ padding: "16px 0 16px 0", fontWeight: 700, color: isWin ? "#10b981" : "#ef4444" }}>
                      {fmt(t.pnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}