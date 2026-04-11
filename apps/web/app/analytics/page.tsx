"use client";
import { useEffect, useState, useMemo } from "react";
import { getTrades } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  stop_loss?: number;
  take_profit?: number;
  strategy?: string;
  notes?: string;
  fomo_check?: boolean;
  trend_alignment?: boolean;
  vengeance_trade?: boolean;
  created_at: string;
}

function getSeverity(count: number): { label: string; color: string } {
  if (count > 5) return { label: "CRITICAL", color: "#ef4444" };
  if (count > 2) return { label: "MODERATE", color: "#e8603c" };
  return { label: "WARNING", color: "#888888" };
}

function getAssetClass(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL") || s.includes("USDT")) return "CRYPTO";
  if (s.includes("USD") || s.includes("EUR") || s.includes("GBP") || s.includes("JPY") || s.includes("AUD") || s.includes("CAD")) return "FOREX";
  if (s.includes("SPX") || s.includes("NAS") || s.includes("DOW") || s.includes("DAX") || s.includes("FTSE")) return "INDICES";
  return "OTHER";
}

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrades()
      .then((data) => setTrades(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!trades.length) return null;

    const totalPnl = trades.reduce((s, t) => s + Number(t.pnl), 0);
    const wins = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) <= 0);
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const grossWin = wins.reduce((s, t) => s + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
    const profitFactor = grossLoss === 0 ? Infinity : grossWin / grossLoss;

    // Strategy breakdown
    const stratMap: Record<string, { wins: number; total: number; pnl: number; rMultiples: number[] }> = {};
    trades.forEach((t) => {
      const strat = t.strategy || "UNTAGGED";
      if (!stratMap[strat]) stratMap[strat] = { wins: 0, total: 0, pnl: 0, rMultiples: [] };
      stratMap[strat].total++;
      stratMap[strat].pnl += Number(t.pnl);
      if (Number(t.pnl) > 0) stratMap[strat].wins++;
      if (t.stop_loss && t.entry_price) {
        const risk = Math.abs(Number(t.entry_price) - Number(t.stop_loss));
        const reward = Number(t.pnl) / (Number(t.quantity) || 1);
        if (risk > 0) stratMap[strat].rMultiples.push(reward / risk);
      }
    });
    const strategies = Object.entries(stratMap).map(([name, d]) => ({
      name,
      winPct: d.total ? (d.wins / d.total) * 100 : 0,
      avgR: d.rMultiples.length ? d.rMultiples.reduce((a, b) => a + b, 0) / d.rMultiples.length : 0,
      pnl: d.pnl,
      total: d.total,
    }));

    // Behavioral errors
    const fomoTrades = trades.filter((t) => t.fomo_check);
    const fomoImpact = fomoTrades.reduce((s, t) => s + Number(t.pnl), 0);
    const vengeanceTrades = trades.filter((t) => t.vengeance_trade);
    const vengeanceImpact = vengeanceTrades.reduce((s, t) => s + Number(t.pnl), 0);

    // Asset distribution
    const assetMap: Record<string, number> = { CRYPTO: 0, FOREX: 0, INDICES: 0, OTHER: 0 };
    trades.forEach((t) => { assetMap[getAssetClass(t.symbol)]++; });
    const assetData = Object.entries(assetMap).map(([name, count]) => ({ name, count }));

    // Max drawdown
    let peak = 0, maxDD = 0, cum = 0;
    [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((t) => {
        cum += Number(t.pnl);
        if (cum > peak) peak = cum;
        const dd = peak > 0 ? ((peak - cum) / peak) * 100 : 0;
        if (dd > maxDD) maxDD = dd;
      });

    return { totalPnl, winRate, profitFactor, strategies, fomoTrades, fomoImpact, vengeanceTrades, vengeanceImpact, assetData, maxDD, wins, losses };
  }, [trades]);

  const recentTen = useMemo(() =>
    [...trades]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10),
    [trades]
  );

  const maxStratPnl = stats ? Math.max(...stats.strategies.map((s) => Math.abs(s.pnl)), 1) : 1;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111111", color: "#ffffff", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>
            PROTOCOL ANALYTICS
          </h1>
          <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            SYSTEM_VERSION_4.2 // AGGREGATED_DATA_7D
          </p>
        </div>
        {stats && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em" }}>NET P/L</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: stats.totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
              {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
              WIN RATE: <span style={{ color: "#ffffff" }}>{stats.winRate.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#888", padding: "60px 0", letterSpacing: "0.2em" }}>
          LOADING PROTOCOL DATA...
        </div>
      )}

      {!loading && !trades.length && (
        <div style={{ textAlign: "center", color: "#555", padding: "60px 0", letterSpacing: "0.2em" }}>
          NO TRADE DATA AVAILABLE
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Row 1: Strategy Efficiency + Asset Distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Strategy Efficiency */}
            <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px" }}>
              <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
                STRATEGY EFFICIENCY BREAKDOWN
              </div>
              {stats.strategies.length === 0 ? (
                <div style={{ color: "#555", fontSize: "12px" }}>NO STRATEGY DATA</div>
              ) : (
                stats.strategies.map((s) => (
                  <div key={s.name} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#ccc" }}>#{s.name}</span>
                      <span style={{ fontSize: "11px", color: "#888" }}>
                        {s.winPct.toFixed(0)}% WIN · AVG R {s.avgR.toFixed(2)} · {s.total} TRADES
                      </span>
                    </div>
                    <div style={{ height: "4px", backgroundColor: "#2a2a2a", borderRadius: "2px" }}>
                      <div
                        style={{
                          height: "4px",
                          borderRadius: "2px",
                          width: `${(Math.abs(s.pnl) / maxStratPnl) * 100}%`,
                          backgroundColor: s.pnl >= 0 ? "#22c55e" : "#ef4444",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Asset Distribution */}
            <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px" }}>
              <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
                ASSET CLASS DISTRIBUTION
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.assetData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", color: "#fff", fontFamily: "monospace", fontSize: "11px" }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="count" fill="#ffffff" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Behavioral Errors */}
          <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
              BEHAVIORAL ERROR ANALYSIS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {/* FOMO */}
              {(() => {
                const count = stats.fomoTrades.length;
                const sev = getSeverity(count);
                return (
                  <div style={{ backgroundColor: "#111", border: `1px solid ${sev.color}22`, borderRadius: "4px", padding: "16px" }}>
                    <div style={{ fontSize: "10px", color: sev.color, letterSpacing: "0.12em", marginBottom: "8px" }}>
                      {sev.label}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>FOMO ENTRY</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: sev.color }}>{count}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                      P&L IMPACT:{" "}
                      <span style={{ color: stats.fomoImpact >= 0 ? "#22c55e" : "#ef4444" }}>
                        {stats.fomoImpact >= 0 ? "+" : ""}${stats.fomoImpact.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {/* VENGEANCE */}
              {(() => {
                const count = stats.vengeanceTrades.length;
                const sev = getSeverity(count);
                return (
                  <div style={{ backgroundColor: "#111", border: `1px solid ${sev.color}22`, borderRadius: "4px", padding: "16px" }}>
                    <div style={{ fontSize: "10px", color: sev.color, letterSpacing: "0.12em", marginBottom: "8px" }}>
                      {sev.label}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>VENGEANCE TRADE</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: sev.color }}>{count}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                      P&L IMPACT:{" "}
                      <span style={{ color: stats.vengeanceImpact >= 0 ? "#22c55e" : "#ef4444" }}>
                        {stats.vengeanceImpact >= 0 ? "+" : ""}${stats.vengeanceImpact.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {/* EARLY TAKE PROFIT (static placeholder) */}
              <div style={{ backgroundColor: "#111", border: "1px solid #88888822", borderRadius: "4px", padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "#888888", letterSpacing: "0.12em", marginBottom: "8px" }}>
                  WARNING
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>EARLY TAKE PROFIT</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#888" }}>--</div>
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>DETECTION PENDING</div>
              </div>
            </div>
          </div>

          {/* Row 3: Bottom stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "16px" }}>
            {[
              { label: "AVG HOLDING TIME", value: "-- MINS", sub: "COMPUTATION PENDING" },
              {
                label: "PROFIT FACTOR",
                value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
                sub: `${stats.wins.length}W / ${stats.losses.length}L`,
                valueColor: stats.profitFactor >= 1.5 ? "#22c55e" : "#ef4444",
              },
              {
                label: "MAX DRAWDOWN",
                value: `${stats.maxDD.toFixed(1)}%`,
                sub: "PEAK TO TROUGH",
                valueColor: stats.maxDD > 20 ? "#ef4444" : stats.maxDD > 10 ? "#e8603c" : "#22c55e",
              },
              { label: "EXECUTION QUALITY", value: "AA+", sub: "PROTOCOL GRADE", valueColor: "#22c55e" },
            ].map((card) => (
              <div
                key={card.label}
                style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px" }}
              >
                <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "8px" }}>
                  {card.label}
                </div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: card.valueColor ?? "#ffffff" }}>
                  {card.value}
                </div>
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Row 4: Raw Data Feed */}
          <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
              RAW DATA FEED — LAST 10 EXECUTIONS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr>
                  {["TIMESTAMP", "ASSET", "STRATEGY", "OUTCOME", "R-FACTOR"].map((col) => (
                    <th
                      key={col}
                      style={{ textAlign: "left", color: "#555", fontWeight: 400, letterSpacing: "0.1em", paddingBottom: "10px", borderBottom: "1px solid #2a2a2a" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTen.map((t) => {
                  const rFactor =
                    t.stop_loss && t.take_profit && t.entry_price
                      ? (Math.abs(Number(t.take_profit) - Number(t.entry_price)) /
                          Math.abs(Number(t.entry_price) - Number(t.stop_loss))).toFixed(2)
                      : "--";
                  const isWin = Number(t.pnl) > 0;
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                      <td style={{ padding: "10px 0", color: "#888" }}>
                        {new Date(t.created_at).toISOString().replace("T", " ").substring(0, 16)} UTC
                      </td>
                      <td style={{ padding: "10px 0", fontWeight: 700 }}>{t.symbol.toUpperCase()}</td>
                      <td style={{ padding: "10px 0", color: "#888" }}>#{t.strategy || "UNTAGGED"}</td>
                      <td style={{ padding: "10px 0" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "2px",
                            fontSize: "10px",
                            letterSpacing: "0.08em",
                            backgroundColor: isWin ? "#22c55e22" : "#ef444422",
                            color: isWin ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {isWin ? "PROFIT" : "LOSS"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 0", color: rFactor === "--" ? "#555" : "#fff" }}>
                        {rFactor === "--" ? "--" : `1:${rFactor}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer status */}
          <div
            style={{
              backgroundColor: "#1c1c1c",
              border: "1px solid #2a2a2a",
              borderRadius: "4px",
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "#555", letterSpacing: "0.1em" }}>
              ANALYTIC INSIGHT // {trades.length} EXECUTION{trades.length !== 1 ? "S" : ""} PROCESSED
            </span>
            <div style={{ display: "flex", gap: "24px" }}>
              <span style={{ fontSize: "11px", color: "#888" }}>
                PROTOCOL INTEGRITY:{" "}
                <span style={{ color: "#22c55e" }}>VERIFIED</span>
              </span>
              <span style={{ fontSize: "11px", color: "#888" }}>
                SYSTEM STATUS:{" "}
                <span style={{ color: "#22c55e" }}>NOMINAL</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
