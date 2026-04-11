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
  const pnlColor = analytics ? (analytics.totalPnl >= 0 ? "#22c55e" : "#ef4444") : "#ffffff";
  const winRateStr = analytics ? `${analytics.winRate}%` : "--";
  const pfStr = analytics ? String(analytics.profitFactor) : "--";
  const rrStr = analytics ? (analytics.avgRR > 0 ? `1:${analytics.avgRR.toFixed(1)}` : "--") : "--";

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 1 }}>
        <StatCard label="TOTAL P&L" value={loading ? "..." : pnlStr} valueColor={pnlColor} />
        <StatCard label="WIN RATE" value={loading ? "..." : winRateStr} />
        <StatCard label="PROFIT FACTOR" value={loading ? "..." : pfStr} />
        <StatCard label="AVG R:R" value={loading ? "..." : rrStr} />
      </div>

      {/* Equity Chart */}
      <div style={{ marginTop: 1 }}>
        <EquityChart data={equityData} />
      </div>

      {/* Recent Trades */}
      <div style={{ marginTop: 1, background: "#1c1c1c", border: "1px solid #2a2a2a", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ color: "#888", fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, textTransform: "uppercase" }}>
            RECENT TRADES
          </span>
          <Link href="/trades" style={{ color: "#888", fontSize: 11, letterSpacing: "0.1em", textDecoration: "none" }}>
            VIEW ALL TRADES
          </Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: "#888", fontSize: 12, margin: 0 }}>No trades logged yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                {["SYMBOL", "DIRECTION", "RESULT", "EXIT PRICE", "NET P&L"].map((h) => (
                  <th key={h} style={{ color: "#888", fontWeight: 700, letterSpacing: "0.1em", textAlign: "left", paddingBottom: 12, paddingRight: 16, fontSize: 10, textTransform: "uppercase" }}>
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
                  <tr key={t.id} style={{ borderBottom: "1px solid #2a2a2a" }}>
                    <td style={{ padding: "14px 16px 14px 0", color: "#fff", fontWeight: 700 }}>{t.symbol}</td>
                    <td style={{ padding: "14px 16px 14px 0", color: isLong ? "#fff" : "#ef4444", fontWeight: 700 }}>
                      {isLong ? "LONG" : "SHORT"}
                    </td>
                    <td style={{ padding: "14px 16px 14px 0", color: isWin ? "#fff" : "#ef4444", fontWeight: 700 }}>
                      {isWin ? "PROFIT" : "LOSS"}
                    </td>
                    <td style={{ padding: "14px 16px 14px 0", color: "#fff" }}>{t.exit_price}</td>
                    <td style={{ padding: "14px 0 14px 0", color: isWin ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
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
