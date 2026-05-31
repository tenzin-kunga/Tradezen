"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getTrades, deleteTrade, exportCsv, importCsv, getImportJobStatus } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { useRealtime } from "@/hooks/use-realtime";

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
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const importJobIdRef = useRef<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number; imported: number; errors: string[] } | null>(null);

  useEffect(() => {
    importJobIdRef.current = importJobId;
  }, [importJobId]);

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

  useRealtime('trade:created', () => {
    fetchTrades();
  });

  useRealtime('trade:updated', () => {
    fetchTrades();
  });

  useRealtime('trade:deleted', () => {
    fetchTrades();
  });

  useRealtime('job:progress', (data) => {
    const payload = data as {
      jobId?: string;
      queue?: string;
      progress?: { processed: number; total: number; imported: number; errors: string[] };
    };
    if (payload.queue !== 'csv-import' || !payload.jobId || payload.jobId !== importJobIdRef.current) {
      return;
    }
    if (payload.progress) {
      setImportProgress(payload.progress);
    }
  });

  useRealtime('job:completed', (data) => {
    const payload = data as {
      jobId?: string;
      queue?: string;
      result?: { imported: number; errors: string[] };
    };
    if (payload.queue !== 'csv-import' || !payload.jobId || payload.jobId !== importJobIdRef.current) {
      return;
    }
    if (payload.result) {
      setImportResult(payload.result);
      setImportProgress(null);
      setImportJobId(null);
      if (payload.result.imported > 0) {
        fetchTrades();
      }
    }
  });

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

    setImportResult(null);
    setImportProgress(null);

    try {
      const { jobId } = await importCsv(file);
      setImportJobId(jobId);

      const poll = async () => {
        const status = await getImportJobStatus(jobId);
        if (!status) return;

        if (typeof status.progress === 'object' && status.progress !== null) {
          setImportProgress(status.progress as {
            processed: number;
            total: number;
            imported: number;
            errors: string[];
          });
        }

        if (status.state === 'completed' && status.result) {
          setImportResult(status.result);
          setImportProgress(null);
          setImportJobId(null);
          if (status.result.imported > 0) {
            fetchTrades();
          }
          return;
        }

        if (status.state === 'failed') {
          setImportResult({
            imported: 0,
            errors: [status.failedReason ?? 'Import failed'],
          });
          setImportProgress(null);
          setImportJobId(null);
          return;
        }

        window.setTimeout(poll, 1500);
      };

      void poll();
    } catch (err) {
      console.error(err);
      setImportResult({ imported: 0, errors: [err instanceof Error ? err.message : "Import failed"] });
      setImportJobId(null);
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
      {/* Filters - stack on mobile, row on desktop */}
      <div className="glass-card p-3 md:p-4 mb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end flex-wrap">
            <div>
              <div className="label-caps mb-2">DATE RANGE</div>
              <div className="flex gap-2">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-glass text-xs" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-glass text-xs" />
              </div>
            </div>
            <div>
              <div className="label-caps mb-2">ASSET CLASS</div>
              <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="select-glass text-xs">
                <option>ALL ASSETS</option>
                {allSymbols.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="label-caps mb-2">STRATEGY</div>
              <select value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)} className="select-glass text-xs">
                <option>ANY STRATEGY</option>
                {allStrategies.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {(["ALL", "WIN", "LOSS"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setResultFilter(mode); setPage(1); }}
                className={`btn-glass text-xs ${resultFilter === mode ? 'active' : ''}`}
              >
                {mode}
              </button>
            ))}
            <button onClick={() => { setPage(1); fetchTrades(); }} className="btn-primary text-xs">
              APPLY
            </button>
            <div className="flex gap-2 ml-auto">
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCsv} style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()} className="btn-glass text-xs">
                IMPORT
              </button>
              <button onClick={handleExportCsv} className="btn-glass text-xs">
                EXPORT
              </button>
            </div>
          </div>
        </div>
      </div>

      {importProgress && (
        <div className="glass-card p-3 md:p-4 mb-4" style={{
          background: "rgba(59,130,246,0.05)",
          border: "1px solid rgba(59,130,246,0.35)",
        }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--accent-primary, #3b82f6)" }}>
            IMPORTING CSV… {importProgress.processed}/{importProgress.total} rows
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {importProgress.imported} imported
            {importProgress.errors.length > 0 ? ` · ${importProgress.errors.length} row errors` : ""}
          </div>
        </div>
      )}

      {importResult && (
        <div className="glass-card p-3 md:p-4 mb-4" style={{
          background: importResult.errors.length > 0 ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)",
          border: `1px solid ${importResult.errors.length > 0 ? "var(--accent-loss)" : "var(--accent-profit)"}`,
        }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: importResult.errors.length > 0 ? "var(--accent-loss)" : "var(--accent-profit)" }}>
                {importResult.imported > 0 ? `IMPORTED ${importResult.imported} TRADE${importResult.imported !== 1 ? "S" : ""}` : "IMPORT COMPLETED"}
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {importResult.errors.slice(0, 3).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                  {importResult.errors.length > 3 && <div>...and {importResult.errors.length - 3} more errors</div>}
                </div>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="btn-glass text-xs">DISMISS</button>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        <div className="fade-up"><StatCard label="TOTAL P&L" value={loading ? "..." : fmt(totalPnl)} valueColor={totalPnl >= 0 ? "#10b981" : "#ef4444"} /></div>
        <div className="fade-up"><StatCard label="WIN RATE" value={loading ? "..." : winRate} /></div>
        <div className="fade-up"><StatCard label="AVG R:R" value={loading ? "..." : avgRR} /></div>
        <div className="fade-up"><StatCard label="ACTIVE TRADES" value={`${total}`} /></div>
      </div>

      {/* Trade cards */}
      <div className="glass-card p-4 md:p-6 fade-up mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 md:mb-5">
          <span className="label-caps">EXECUTION ARCHIVE</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            SHOWING {Math.min((page - 1) * 10 + 1, total)}–{Math.min(page * 10, total)} OF {total} TRADES
          </span>
        </div>
        {filteredTrades.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>
            {loading ? (
              "Loading trades..."
            ) : trades.length === 0 ? (
              <>
                <div className="mb-3 font-semibold" style={{ color: "var(--text-primary)" }}>No trades found.</div>
                <div className="mb-4">Create a new trade to see it appear here.</div>
                <button onClick={() => router.push("/add-trade")} className="btn-primary">
                  Add First Trade
                </button>
              </>
            ) : (
              <>
                <div className="mb-3 font-semibold" style={{ color: "var(--text-primary)" }}>No trades match filters.</div>
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
          <div className="flex flex-col gap-4">
            {filteredTrades.slice((page - 1) * 10, page * 10).map((t) => {
              const isWin = t.pnl >= 0;
              const isLong = t.direction === "buy";
              return (
                <div key={t.id} className="glass-card overflow-hidden">
                  {/* Image section - full width mobile, left side desktop */}
                  <div className="w-full md:w-[280px] min-h-[160px] md:min-h-[200px] relative" style={{ background: "var(--bg-primary)" }}>
                    {t.chart_image ? (
                      <img src={t.chart_image} alt="Trade chart" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs p-4 text-center" style={{ color: "var(--text-dim)" }}>
                        No chart image
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.8))" }}>
                      <div className="flex justify-between gap-2">
                        <span className="font-bold text-sm">{t.symbol}</span>
                        <span className="font-bold text-sm" style={{ color: isWin ? "#10b981" : "#ef4444" }}>{isWin ? "WIN" : "LOSS"}</span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t.strategy || "No strategy"}</div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="label-caps mb-1">DIRECTION</div>
                        <div className="font-semibold text-sm" style={{ color: isLong ? "#10b981" : "#ef4444" }}>{isLong ? "LONG" : "SHORT"}</div>
                      </div>
                      <div>
                        <div className="label-caps mb-1">RESULT</div>
                        <div className="mono-data font-semibold text-sm" style={{ color: isWin ? "#10b981" : "#ef4444" }}>{fmt(Number(t.pnl))}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">ENTRY</div>
                        <div className="mono-data font-semibold text-sm">{t.entry_price}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">EXIT</div>
                        <div className="mono-data font-semibold text-sm">{t.exit_price}</div>
                      </div>
                      <div className="glass-card p-3 col-span-2 sm:col-span-1">
                        <div className="label-caps mb-1">DATE</div>
                        <div className="mono-data font-semibold text-xs">{t.trade_date ? new Date(t.trade_date).toISOString().replace("T", " ").slice(0, 16) : new Date(t.created_at).toISOString().replace("T", " ").slice(0, 16)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">LOT</div>
                        <div className="mono-data font-semibold text-sm">{t.lot_size}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">SL</div>
                        <div className="mono-data font-semibold text-sm">{t.stop_loss?.toFixed(5) ?? "--"}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">TP</div>
                        <div className="mono-data font-semibold text-sm">{t.take_profit?.toFixed(5) ?? "--"}</div>
                      </div>
                      <div className="glass-card p-3">
                        <div className="label-caps mb-1">COMMISSION</div>
                        <div className="mono-data font-semibold text-sm">${t.commission?.toFixed(2) ?? "0.00"}</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1 w-full">
                        <div className="label-caps mb-2">NOTES</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, minHeight: 40 }}>{t.notes || "No notes."}</div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => router.push(`/trades/${t.id}/edit`)} className="btn-primary text-xs flex-1 sm:flex-initial">EDIT</button>
                        <button onClick={() => handleDelete(t.id)} className="btn-glass text-xs flex-1 sm:flex-initial" style={{ color: "var(--accent-loss)", borderColor: "var(--accent-loss)" }}>DELETE</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex gap-1 justify-center mt-5 flex-wrap">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-glass text-xs" disabled={page === 1}>{"<"}</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`btn-glass text-xs ${p === page ? 'active' : ''}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn-glass text-xs" disabled={page === totalPages}>{">"}</button>
          </div>
        )}
      </div>

      {/* Session + Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="glass-card p-4 md:p-6 fade-up">
          <div className="label-caps mb-4">SESSION DISTRIBUTION</div>
          {["NY OPEN", "LONDON", "ASIAN"].map((session) => {
            const pct = Math.round((sessionCounts[session] / sessionTotal) * 100);
            return (
              <div key={session} className="mb-4">
                <div className="flex justify-between mb-1.5">
                  <span className="font-semibold tracking-wide text-xs">{session}</span>
                  <span className="mono-data font-semibold">{pct}%</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", width: "100%", borderRadius: 2 }}>
                  <div style={{ height: 4, background: "var(--accent-cyan)", width: `${pct}%`, transition: "width 0.3s", borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-card p-4 md:p-6 fade-up">
          <div className="label-caps mb-4">STRATEGY TAGS</div>
          {allStrategies.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: 12 }}>No strategy tags yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allStrategies.map((s) => (
                <span key={s} className="glass-card px-3 py-1.5 text-xs font-semibold">
                  #{s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAnomaly && (
        <div className="glass-card p-4 md:p-6 fade-up" style={{ borderColor: "var(--accent-warn)" }}>
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "var(--accent-warn)" }}>ANOMALOUS RISK</div>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)", margin: "0 0 16px" }}>
            3+ consecutive losses detected. Review your protocol.
          </p>
          <button className="btn-glass text-xs" style={{ borderColor: "var(--accent-warn)", color: "var(--accent-warn)" }}>REVIEW PROTOCOL</button>
        </div>
      )}
    </div>
  );
}
