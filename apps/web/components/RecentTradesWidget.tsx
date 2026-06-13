"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteTrade } from "@/lib/api";

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  pnl: number;
  entry_price: number;
  exit_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  created_at: string;
};

type Props = { trades: Trade[]; onDelete?: (id: string) => void; loading?: boolean };

function fmtPnl(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function RecentTradesWidget({ trades, onDelete, loading }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 120, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 32, background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (trades.length === 0) return null;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trade?")) return;
    setDeleting(id);
    try {
      await deleteTrade(id);
      onDelete?.(id);
    } catch {
      alert("Failed to delete trade");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">RECENT TRADES</span>
        <Link href="/trades" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          View All →
        </Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["SYMBOL", "DIRECTION", "P&L", "R:R", "DATE", ""].map((h) => (
                <th key={h} className="label-caps" style={{ textAlign: "left", paddingBottom: 8, paddingRight: 12, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const isWin = t.pnl >= 0;
              const isLong = t.direction === "buy";
              const rr =
                t.stop_loss && t.take_profit && t.entry_price
                  ? Math.abs(t.take_profit - t.entry_price) / Math.abs(t.entry_price - t.stop_loss)
                  : 0;
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px 10px 0", fontWeight: 600, fontSize: 14 }}>{t.symbol}</td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 13, fontWeight: 600, color: isLong ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                    {isLong ? "LONG" : "SHORT"}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 14, fontWeight: 600, color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                    {fmtPnl(t.pnl)}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 13, color: "var(--text-muted)" }}>
                    {rr > 0 ? `${rr.toFixed(1)}R` : "--"}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 12, color: "var(--text-muted)" }}>
                    {timeAgo(t.created_at)}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <button
                        onClick={(e) => {
                          const menu = e.currentTarget.nextElementSibling as HTMLElement;
                          if (menu) menu.style.display = menu.style.display === "block" ? "none" : "block";
                        }}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}
                      >
                        ⋮
                      </button>
                      <div
                        style={{ display: "none", position: "absolute", right: 0, top: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 10, minWidth: 120 }}
                      >
                        <Link href={`/trades/${t.id}`} style={{ display: "block", padding: "8px 12px", fontSize: 12, color: "var(--text-primary)", textDecoration: "none" }}>
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, color: "var(--accent-loss)", background: "none", border: "none", cursor: "pointer" }}
                        >
                          {deleting === t.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
