"use client";

import type { Trade } from "@tradezen/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function rr(t: Trade): string {
  if (!t.stop_loss || !t.take_profit || t.stop_loss === t.entry_price) return "--";
  const risk = Math.abs(t.entry_price - Number(t.stop_loss));
  const reward = Math.abs(Number(t.take_profit) - t.entry_price);
  return (reward / risk).toFixed(1);
}

function fmtPnl(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "--";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "--";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function TradeCard({ trade, onView }: { trade: Trade; onView: (t: Trade) => void }) {
  const isWin = trade.pnl >= 0;
  const isLong = trade.direction === "buy";
  const d = trade.trade_date ?? trade.created_at;
  const imageUrl = trade.chart_image ? `${API}${trade.chart_image}` : null;

  return (
    <div
      className="glass-card cursor-pointer transition-all hover:brightness-110 overflow-hidden"
      onClick={() => onView(trade)}
    >
      {/* Row 1: Symbol + WIN/LOSS + P&L */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-tight">{trade.symbol}</span>
          <span
            className="text-[10px] font-semibold tracking-widest px-1.5 py-0.5 rounded"
            style={{
              background: isWin ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: isWin ? "var(--accent-profit)" : "var(--accent-loss)",
            }}
          >
            {isWin ? "WIN" : "LOSS"}
          </span>
        </div>
        <span
          className="mono-data font-semibold text-sm"
          style={{ color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}
        >
          {fmtPnl(Number(trade.pnl))}
        </span>
      </div>

      {/* Row 2: Trade details */}
      <div className="flex items-center gap-2 px-4 pb-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <span style={{ color: isLong ? "var(--accent-profit)" : "var(--accent-loss)" }}>
          {isLong ? "LONG" : "SHORT"}
        </span>
        <span>•</span>
        <span>{trade.strategy || "—"}</span>
        <span>•</span>
        <span>RR {rr(trade)}</span>
        <span>•</span>
        <span>Lot {trade.lot_size}</span>
        <span>•</span>
        <span>{fmtDate(d)}</span>
      </div>

      {/* Row 3: Screenshot + behavioral tags + chevron */}
      <div
        className="flex items-center gap-3 px-4 pb-3 pt-2"
        style={{ borderTop: "1px solid var(--border, #23252d)" }}
      >
        {imageUrl ? (
          <div
            className="rounded overflow-hidden flex-shrink-0"
            style={{ width: 56, height: 40, background: "var(--bg-surface-hover, #1a1c23)" }}
          >
            <img
              src={imageUrl}
              alt="Chart"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div
            className="rounded flex items-center justify-center flex-shrink-0"
            style={{
              width: 56,
              height: 40,
              background: "var(--bg-surface-hover, #1a1c23)",
              color: "var(--text-dim, #6b7280)",
              fontSize: 10,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          {trade.fomo_check && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "var(--accent-loss)" }}>
              FOMO
            </span>
          )}
          {trade.vengeance_trade && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.1)", color: "rgb(249,115,22)" }}>
              REVENGE
            </span>
          )}
          {trade.trend_alignment && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent-profit)" }}>
              TREND
            </span>
          )}
          {trade.notes && (
            <span className="text-[10px] truncate max-w-[200px]" style={{ color: "var(--text-dim, #6b7280)" }}>
              {trade.notes}
            </span>
          )}
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--text-dim)", flexShrink: 0, opacity: 0.5 }}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}
