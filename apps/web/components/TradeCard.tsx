"use client";

import type { Trade } from "@tradezen/types";

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
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TradeCard({ trade, onView }: { trade: Trade; onView: (t: Trade) => void }) {
  const isWin = trade.pnl >= 0;
  const isLong = trade.direction === "buy";
  const d = trade.trade_date ?? trade.created_at;

  return (
    <div className="glass-card px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-all hover:brightness-110" style={{ minHeight: 72 }} onClick={() => onView(trade)}>
      <div className="flex-shrink-0 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-tight">{trade.symbol}</span>
          <span className="text-[10px] font-semibold tracking-widest px-1.5 py-0.5 rounded" style={{ background: isWin ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
            {isWin ? "WIN" : "LOSS"}
          </span>
        </div>
        <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <span>{trade.strategy || "—"}</span>
          <span>•</span>
          <span style={{ color: isLong ? "var(--accent-profit)" : "var(--accent-loss)" }}>{isLong ? "LONG" : "SHORT"}</span>
          <span>•</span>
          <span>RR {rr(trade)}</span>
          <span>•</span>
          <span>Lot {trade.lot_size}</span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="mono-data font-semibold text-sm" style={{ color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
          {fmtPnl(Number(trade.pnl))}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>{fmtDate(d)}</div>
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-dim)", flexShrink: 0, opacity: 0.5 }}><path d="m9 18 6-6-6-6"/></svg>
    </div>
  );
}
