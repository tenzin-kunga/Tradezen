"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getTrades, deleteTrade, exportCsv, importCsv } from "@/lib/api";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [assetFilter, setAssetFilter] = useState("ALL ASSETS");
  const [strategyFilter, setStrategyFilter] = useState("ANY STRATEGY");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const showAnomaly = useMemo(() => {
    if (trades.length < 3) return false;
    return trades.slice(0, 3).every((t) => Number(t.pnl) < 0);
  }, [trades]);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrades({
        page: 1,
        limit: 100,
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

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importCsv(file);
      setImportResult(result);
      if (result.imported > 0) {
        fetchTrades();
      }
    } catch (err) {
      console.error(err);
      setImportResult({ imported: 0, errors: [err instanceof Error ? err.message : "Import failed"] });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
  void filteredTrades.filter((t) => t.pnl < 0);
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
      <div className="glass-card p-4 mb-4" style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div className="label-caps mb-2">DATE RANGE</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-glass" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-glass" />
          </div>
        </div>
        <div>
          <div className="label-caps mb-2">ASSET CLASS</div>
          <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="select-glass">
            <option>ALL ASSETS</option>
            {allSymbols.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div className="label-caps mb-2">STRATEGY</div>
          <select value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)} className="select-glass">
            <option>ANY STRATEGY</option>
            {allStrategies.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {(["ALL", "WIN", "LOSS"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setResultFilter(mode); setPage(1); }}
              className={`btn-glass ${resultFilter === mode ? 'active' : ''}`}
            >
              {mode}
            </button>
          ))}
          <button onClick={() => { setPage(1); fetchTrades(); }} className="btn-primary">
            APPLY
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCsv} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} className="btn-glass">
            IMPORT
          </button>
          <button onClick={handleExportCsv} className="btn-glass">
            EXPORT
          </button>
        </div>
      </div>

      {importResult && (
        <div className="glass-card p-4 mb-4" style={{
          background: importResult.errors.length > 0 ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)",
          border: `1px solid ${importResult.errors.length > 0 ? "var(--accent-loss)" : "var(--accent-profit)"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: importResult.errors.length > 0 ? "var(--accent-loss)" : "var(--accent-profit)", marginBottom: 4 }}>
                {importResult.imported > 0 ? `IMPORTED ${importResult.imported} TRADE${importResult.imported !== 1 ? "S" : ""}` : "IMPORT COMPLETED"}
              </div>
              {importResult.errors.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {importResult.errors.slice(0, 3).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                  {importResult.errors.length > 3 && <div>...and {importResult.errors.length - 3} more errors</div>}
                </div>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="btn-glass">DISMISS</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <div className="fade-up"><StatCard label="TOTAL P&L" value={loading ? "..." : fmt(totalPnl)} valueColor={totalPnl >= 0 ? "#10b981" : "#ef4444"} /></div>
        <div className="fade-up"><StatCard label="WIN RATE" value={loading ? "..." : winRate} /></div>
        <div className="fade-up"><StatCard label="AVG R:R" value={loading ? "..." : avgRR} /></div>
        <div className="fade-up"><StatCard label="ACTIVE TRADES" value={`${total}`} /></div>
      </div>

      <div className="glass-card p-6 fade-up" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span className="label-caps">EXECUTION ARCHIVE</span>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            SHOWING {Math.min((page - 1) * 10 + 1, total)}–{Math.min(page * 10, total)} OF {total} TRADES
          </span>
        </div>
        {filteredTrades.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: "60px 0", textAlign: "center" }}>
            {loading ? (
              "Loading trades..."
            ) : trades.length === 0 ? (
              <>
                <div style={{ marginBottom: 12, fontWeight: 600, color: "var(--text-primary)" }}>No trades found.</div>
                <div style={{ marginBottom: 16 }}>Create a new trade to see it appear here.</div>
                <button onClick={() => router.push("/add-trade")} className="btn-primary">
                  Add First Trade
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 12, fontWeight: 600, color: "var(--text-primary)" }}>No trades match filters.</div>
                <button
                  onClick={() => {
                    setAssetFilter("ALL ASSETS");
                    setStrategyFilter("ANY STRATEGY");
                    setResultFilter("ALL");
                    setFromDate("");
                    setToDate("");
                    setPage(1);
                  }}
                  className="btn-primary"
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
                <div key={t.id} className="glass-card" style={{ overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr" }}>
                  <div style={{ minHeight: 200, background: "var(--bg-primary)", position: "relative" }}>
                    {t.chart_image ? (
                      <img src={t.chart_image} alt="Trade chart" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", fontSize: 11, padding: 16, textAlign: "center" }}>
                        No chart image
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.8))" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: 700 }}>{t.symbol}</span>
                        <span style={{ fontWeight: 700, color: isWin ? "#10b981" : "#ef4444" }}>{isWin ? "WIN" : "LOSS"}</span>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>{t.strategy || "No strategy"}</div>
                    </div>
                  </div>
                  <div style={{ padding: 20, display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div className="label-caps mb-2">DIRECTION</div>
                        <div style={{ fontWeight: 600, color: isLong ? "#10b981" : "#ef4444" }}>{isLong ? "LONG" : "SHORT"}</div>
                      </div>
                      <div>
                        <div className="label-caps mb-2">RESULT</div>
                        <div className="mono-data" style={{ fontWeight: 600, color: isWin ? "#10b981" : "#ef4444" }}>{fmt(Number(t.pnl))}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">ENTRY</div>
                        <div className="mono-data" style={{ fontWeight: 600 }}>{t.entry_price}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">EXIT</div>
                        <div className="mono-data" style={{ fontWeight: 600 }}>{t.exit_price}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">DATE</div>
                        <div className="mono-data" style={{ fontWeight: 600, fontSize: 11 }}>{t.trade_date ? new Date(t.trade_date).toISOString().replace("T", " ").slice(0, 16) : new Date(t.created_at).toISOString().replace("T", " ").slice(0, 16)}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">LOT</div>
                        <div className="mono-data" style={{ fontWeight: 600 }}>{t.lot_size}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">SL</div>
                        <div className="mono-data" style={{ fontWeight: 600 }}>{t.stop_loss?.toFixed(5) ?? "--"}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">TP</div>
                        <div className="mono-data" style={{ fontWeight: 600 }}>{t.take_profit?.toFixed(5) ?? "--"}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">COMMISSION</div>
                        <div className="mono-data" style={{ fontWeight: 600 }}>${t.commission?.toFixed(2) ?? "0.00"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div className="label-caps mb-2">NOTES</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, minHeight: 60 }}>{t.notes || "No notes."}</div>
                      </div>
                      <div style={{ minWidth: 130, display: "flex", flexDirection: "column", gap: 8 }}>
                        <button onClick={() => router.push(`/trades/${t.id}/edit`)} className="btn-primary">EDIT</button>
                        <button onClick={() => handleDelete(t.id)} className="btn-glass" style={{ color: "var(--accent-loss)", borderColor: "var(--accent-loss)" }}>DELETE</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 20 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-glass" disabled={page === 1}>{"<"}</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`btn-glass ${p === page ? 'active' : ''}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn-glass" disabled={page === totalPages}>{">"}</button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="glass-card p-6 fade-up">
          <div className="label-caps mb-5">SESSION DISTRIBUTION</div>
          {["NY OPEN", "LONDON", "ASIAN"].map((session) => {
            const pct = Math.round((sessionCounts[session] / sessionTotal) * 100);
            return (
              <div key={session} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, letterSpacing: "0.05em", fontSize: 12 }}>{session}</span>
                  <span className="mono-data" style={{ fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", width: "100%", borderRadius: 2 }}>
                  <div style={{ height: 4, background: "var(--accent-cyan)", width: `${pct}%`, transition: "width 0.3s", borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-card p-6 fade-up">
          <div className="label-caps mb-5">STRATEGY TAGS</div>
          {allStrategies.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: 12 }}>No strategy tags yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allStrategies.map((s) => (
                <span key={s} className="glass-card" style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600 }}>
                  #{s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAnomaly && (
        <div className="glass-card p-6 fade-up" style={{ borderColor: "var(--accent-warn)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent-warn)", marginBottom: 8 }}>ANOMALOUS RISK</div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 16px" }}>
            3+ consecutive losses detected. Review your protocol.
          </p>
          <button className="btn-glass" style={{ borderColor: "var(--accent-warn)", color: "var(--accent-warn)" }}>REVIEW PROTOCOL</button>
        </div>
      )}
    </div>
  );
}