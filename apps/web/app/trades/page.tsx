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
  chart_image?: string | null;
  commission?: number | null;
  trade_date?: string | null;
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
  const [resultFilter, setResultFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const showAnomaly = useMemo(() => {
    if (trades.length < 3) return false;
    return trades.slice(0, 3).every((t) => Number(t.pnl) < 0);
  }, [trades]);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrades({
        page: 1,
        limit: 1000,
        sort: "created_at",
        order: "desc",
        symbol: assetFilter !== "ALL ASSETS" ? assetFilter : undefined,
        strategy: strategyFilter !== "ANY STRATEGY" ? strategyFilter : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setTrades(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [assetFilter, strategyFilter, fromDate, toDate]);

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

  const filteredTrades = useMemo(() => trades.filter((t) => {
    if (resultFilter === "WIN" && Number(t.pnl) <= 0) return false;
    if (resultFilter === "LOSS" && Number(t.pnl) >= 0) return false;
    return true;
  }), [trades, resultFilter]);

  const total = filteredTrades.length;
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const totalPnl = filteredTrades.reduce((s, t) => s + Number(t.pnl), 0);
  const wins = filteredTrades.filter((t) => t.pnl > 0);
  const losses = filteredTrades.filter((t) => t.pnl < 0);
  const winRate = filteredTrades.length ? ((wins.length / filteredTrades.length) * 100).toFixed(1) + "%" : "--";
  const rrTrades = filteredTrades.filter((t) => t.stop_loss != null && t.take_profit != null && t.stop_loss !== t.entry_price);
  const avgRR = rrTrades.length === 0 ? "--" : "1:" + (rrTrades.reduce((s, t) => s + Math.abs(t.take_profit! - t.entry_price) / Math.abs(t.entry_price - t.stop_loss!), 0) / rrTrades.length).toFixed(1);

  const sessionCounts: Record<string, number> = { "NY OPEN": 0, "LONDON": 0, "ASIAN": 0 };
  filteredTrades.forEach((t) => { sessionCounts[getSessionBucket(t.created_at)] = (sessionCounts[getSessionBucket(t.created_at)] || 0) + 1; });
  const sessionTotal = filteredTrades.length || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {(["ALL", "WIN", "LOSS"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setResultFilter(mode); setPage(1); }}
              style={{
                background: resultFilter === mode ? "#fff" : "#222",
                color: resultFilter === mode ? "#111" : "#888",
                border: "1px solid #2a2a2a",
                padding: "8px 16px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                cursor: "pointer",
              }}
            >
              {mode}
            </button>
          ))}
          <button onClick={() => { setPage(1); fetchTrades(); }}
            style={{ alignSelf: "flex-end", background: "#fff", color: "#111", padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", border: "none", cursor: "pointer", marginTop: 18 }}>
            APPLY FILTERS
          </button>
        </div>
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
        {filteredTrades.length === 0 ? (
          <div style={{ color: "#888", padding: "60px 0", textAlign: "center" }}>
            {loading ? (
              "Loading trades..."
            ) : trades.length === 0 ? (
              <>
                <div style={{ marginBottom: 12, fontWeight: 700, color: "#fff" }}>
                  No trades found.
                </div>
                <div style={{ marginBottom: 16 }}>Create a new trade to see it appear in the execution archive.</div>
                <button
                  onClick={() => router.push("/add-trade")}
                  style={{ background: "#fff", color: "#111", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
                >
                  Add First Trade
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 12, fontWeight: 700, color: "#fff" }}>
                  No trades match the current filters.
                </div>
                <button
                  onClick={() => {
                    setAssetFilter("ALL ASSETS");
                    setStrategyFilter("ANY STRATEGY");
                    setResultFilter("ALL");
                    setFromDate("");
                    setToDate("");
                    setPage(1);
                  }}
                  style={{ background: "#fff", color: "#111", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
                >
                  Reset Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filteredTrades.slice((page - 1) * 10, page * 10).map((t) => {
              const isWin = t.pnl >= 0;
              const isLong = t.direction === "buy";
              return (
                <div key={t.id} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr", gap: 0 }}>
                  <div style={{ minHeight: 200, background: "#141414", position: "relative" }}>
                    {t.chart_image ? (
                      <img src={t.chart_image} alt="Trade chart" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 12, padding: 16, textAlign: "center" }}>
                        No chart image added for this trade.
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.8))" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{t.symbol}</span>
                        <span style={{ color: isWin ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 700 }}>{isWin ? "WIN" : "LOSS"}</span>
                      </div>
                      <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>{t.strategy || "No strategy tag"}</div>
                    </div>
                  </div>
                  <div style={{ padding: 20, display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 8 }}>DIRECTION</div>
                        <div style={{ color: isLong ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{isLong ? "LONG" : "SHORT"}</div>
                      </div>
                      <div>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 8 }}>RESULT</div>
                        <div style={{ color: isWin ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{fmt(Number(t.pnl))}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>ENTRY</div>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{t.entry_price}</div>
                      </div>
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>EXIT</div>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{t.exit_price}</div>
                      </div>
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>DATE</div>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{t.trade_date ? new Date(t.trade_date).toISOString().replace("T", " ").slice(0, 16) : new Date(t.created_at).toISOString().replace("T", " ").slice(0, 16)}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>LOT</div>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{t.lot_size}</div>
                      </div>
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>SL</div>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{t.stop_loss?.toFixed(5) ?? "--"}</div>
                      </div>
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>TP</div>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{t.take_profit?.toFixed(5) ?? "--"}</div>
                      </div>
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>COMMISSION</div>
                        <div style={{ color: "#fff", fontWeight: 700 }}>${t.commission?.toFixed(2) ?? "0.00"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ color: "#888", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>NOTES</div>
                        <div style={{ color: "#ccc", fontSize: 12, lineHeight: 1.6, minHeight: 60 }}>{t.notes || "No additional notes."}</div>
                      </div>
                      <div style={{ minWidth: 130, display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          onClick={() => router.push(`/trades/${t.id}/edit`)}
                          style={{ background: "#fff", color: "#111", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer" }}
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer" }}
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
