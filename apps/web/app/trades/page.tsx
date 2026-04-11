"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTrades, deleteTrade, exportCsv } from "@/lib/api";
import StatCard from "@/components/StatCard";

type Trade = {
  id: string; symbol: string; direction: string;
  entry_price: number; exit_price: number; lot_size: number; pnl: number;
  stop_loss: number | null; take_profit: number | null;
  strategy: string | null; notes: string | null;
  fomo_check: boolean; trend_alignment: boolean; vengeance_trade: boolean;
  created_at: string;
};

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function getSessionBucket(dateStr: string) {
  const h = new Date(dateStr).getUTCHours();
  if (h >= 13 && h < 18) return "NY OPEN";
  if (h >= 7 && h < 13) return "LONDON";
  return "ASIAN";
}

export default function TradeLog() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [assetFilter, setAssetFilter] = useState("ALL ASSETS");
  const [strategyFilter, setStrategyFilter] = useState("ANY STRATEGY");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const showAnomaly = useMemo(() => {
    if (trades.length < 3) return false;
    return trades.slice(0, 3).every((t) => Number(t.pnl) < 0);
  }, [trades]);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrades({
        page,
        limit: 10,
        sort: "created_at",
        order: "desc",
        symbol: assetFilter !== "ALL ASSETS" ? assetFilter : undefined,
        strategy: strategyFilter !== "ANY STRATEGY" ? strategyFilter : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setTrades(res.data);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, assetFilter, strategyFilter, fromDate, toDate]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Get all symbols/strategies for filters (fetch once)
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [allStrategies, setAllStrategies] = useState<string[]>([]);
  useEffect(() => {
    getTrades({ limit: 100 }).then((res) => {
      const syms = Array.from(new Set(res.data.map((t: Trade) => t.symbol))).filter(Boolean) as string[];
      const strats = Array.from(new Set(res.data.map((t: Trade) => t.strategy).filter(Boolean))) as string[];
      setAllSymbols(syms);
      setAllStrategies(strats);
    }).catch(() => {});
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this trade?")) return;
    try {
      await deleteTrade(id);
      fetchTrades();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleExportCsv() {
    try {
      const csv = await exportCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trades.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const totalPnl = trades.reduce((s, t) => s + Number(t.pnl), 0);
  const winRate = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) + "%" : "--";
  const rrTrades = trades.filter((t) => t.stop_loss != null && t.take_profit != null && t.stop_loss !== t.entry_price);
  const avgRR = rrTrades.length === 0 ? "--" : "1:" + (rrTrades.reduce((s, t) => s + Math.abs(t.take_profit! - t.entry_price) / Math.abs(t.entry_price - t.stop_loss!), 0) / rrTrades.length).toFixed(1);

  const sessionCounts: Record<string, number> = { "NY OPEN": 0, "LONDON": 0, "ASIAN": 0 };
  trades.forEach((t) => { sessionCounts[getSessionBucket(t.created_at)] = (sessionCounts[getSessionBucket(t.created_at)] || 0) + 1; });
  const sessionTotal = trades.length || 1;

  return (
    <div>
      {/* Filter Bar */}
      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", padding: "16px 24px", display: "flex", gap: 12, alignItems: "center", marginBottom: 1, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.1em", marginBottom: 4, fontWeight: 700 }}>DATE RANGE</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              style={{ background: "#222", border: "1px solid #2a2a2a", color: "#888", padding: "8px 12px", fontSize: 12, outline: "none" }} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              style={{ background: "#222", border: "1px solid #2a2a2a", color: "#888", padding: "8px 12px", fontSize: 12, outline: "none" }} />
          </div>
        </div>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.1em", marginBottom: 4, fontWeight: 700 }}>ASSET CLASS</div>
          <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}
            style={{ background: "#222", border: "1px solid #2a2a2a", color: "#fff", padding: "8px 12px", fontSize: 12, outline: "none" }}>
            <option>ALL ASSETS</option>
            {allSymbols.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.1em", marginBottom: 4, fontWeight: 700 }}>STRATEGY</div>
          <select value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)}
            style={{ background: "#222", border: "1px solid #2a2a2a", color: "#fff", padding: "8px 12px", fontSize: 12, outline: "none" }}>
            <option>ANY STRATEGY</option>
            {allStrategies.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => { setPage(1); fetchTrades(); }}
          style={{ alignSelf: "flex-end", background: "#fff", color: "#111", padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", border: "none", cursor: "pointer", marginTop: 18 }}>
          APPLY FILTERS
        </button>
        <button onClick={handleExportCsv}
          style={{ alignSelf: "flex-end", background: "transparent", color: "#888", padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", border: "1px solid #2a2a2a", cursor: "pointer", marginTop: 18 }}>
          EXPORT CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 1 }}>
        <StatCard label="TOTAL P&L" value={loading ? "..." : fmt(totalPnl)} valueColor={totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
        <StatCard label="WIN RATE" value={loading ? "..." : winRate} />
        <StatCard label="AVG R:R" value={loading ? "..." : avgRR} />
        <StatCard label="ACTIVE RISK" value={`${total} TRADES`} />
      </div>

      {/* Execution Archive */}
      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>EXECUTION ARCHIVE</span>
          <span style={{ color: "#888", fontSize: 11 }}>SHOWING {Math.min((page - 1) * 10 + 1, total)}–{Math.min(page * 10, total)} OF {total} TRADES</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
              {["ASSET", "STRATEGY", "SIDE", "ENTRY", "EXIT", "OUTCOME", "NET PROFIT", "ACTION"].map((h) => (
                <th key={h} style={{ color: "#888", fontWeight: 700, letterSpacing: "0.1em", textAlign: "left", paddingBottom: 12, paddingRight: 12, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr><td colSpan={8} style={{ color: "#888", padding: "20px 0", textAlign: "center" }}>No trades found.</td></tr>
            ) : trades.map((t) => {
              const isWin = t.pnl >= 0;
              const isLong = t.direction === "buy";
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "14px 12px 14px 0" }}>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{t.symbol}</div>
                    <div style={{ color: "#888", fontSize: 10 }}>{new Date(t.created_at).toISOString().replace("T", " ").slice(0, 16)}</div>
                  </td>
                  <td style={{ padding: "14px 12px 14px 0" }}>
                    {t.strategy ? (
                      <span style={{ background: "#222", border: "1px solid #2a2a2a", color: "#888", padding: "3px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>{t.strategy}</span>
                    ) : <span style={{ color: "#555" }}>--</span>}
                  </td>
                  <td style={{ padding: "14px 12px 14px 0", color: isLong ? "#fff" : "#ef4444", fontWeight: 700 }}>{isLong ? "LONG" : "SHORT"}</td>
                  <td style={{ padding: "14px 12px 14px 0", color: "#fff" }}>{t.entry_price}</td>
                  <td style={{ padding: "14px 12px 14px 0", color: "#fff" }}>{t.exit_price}</td>
                  <td style={{ padding: "14px 12px 14px 0" }}>
                    <span style={{ background: isWin ? "transparent" : "rgba(239,68,68,0.1)", border: `1px solid ${isWin ? "#2a2a2a" : "#ef4444"}`, color: isWin ? "#fff" : "#ef4444", padding: "3px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                      {isWin ? "WIN" : "LOSS"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 12px 14px 0", color: isWin ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{fmt(Number(t.pnl))}</td>
                  <td style={{ padding: "14px 0 14px 0", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => router.push(`/trades/${t.id}/edit`)}
                      style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12, fontFamily: "monospace", padding: "4px 8px" }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#fff"; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#555"; }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12, fontFamily: "monospace", padding: "4px 8px" }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#555"; }}
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 20 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: "transparent", border: "1px solid #2a2a2a", color: page === 1 ? "#555" : "#fff", padding: "6px 12px", cursor: page === 1 ? "default" : "pointer", fontSize: 12 }}>{"<"}</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                style={{ background: p === page ? "#fff" : "transparent", border: "1px solid #2a2a2a", color: p === page ? "#111" : "#fff", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ background: "transparent", border: "1px solid #2a2a2a", color: page === totalPages ? "#555" : "#fff", padding: "6px 12px", cursor: page === totalPages ? "default" : "pointer", fontSize: 12 }}>{">"}</button>
          </div>
        )}
      </div>

      {/* Bottom Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginTop: 1 }}>
        {/* Session Distribution */}
        <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", padding: 24 }}>
          <div style={{ color: "#888", fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 20, textTransform: "uppercase" }}>SESSION DISTRIBUTION</div>
          {["NY OPEN", "LONDON", "ASIAN"].map((session) => {
            const pct = Math.round((sessionCounts[session] / sessionTotal) * 100);
            return (
              <div key={session} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>{session}</span>
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: "#222", width: "100%" }}>
                  <div style={{ height: 4, background: "#fff", width: `${pct}%`, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Execution Tags */}
        <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", padding: 24 }}>
          <div style={{ color: "#888", fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 20, textTransform: "uppercase" }}>EXECUTION TAGS</div>
          {allStrategies.length === 0 ? (
            <p style={{ color: "#555", fontSize: 12 }}>No strategy tags logged yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allStrategies.map((s) => (
                <span key={s} style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", color: "#888", padding: "4px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
                  #{s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Anomalous Risk */}
      {showAnomaly && (
        <div style={{ marginTop: 1, background: "#1c1c1c", border: "1px solid #e8603c", padding: 24 }}>
          <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>ANOMALOUS RISK DETECTED</div>
          <p style={{ color: "#888", fontSize: 12, margin: "0 0 16px" }}>
            3 or more consecutive losses detected in your recent trade history. Review your protocol before continuing.
          </p>
          <button style={{ background: "transparent", border: "1px solid #e8603c", color: "#e8603c", padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}>
            REVIEW PROTOCOL
          </button>
        </div>
      )}
    </div>
  );
}
