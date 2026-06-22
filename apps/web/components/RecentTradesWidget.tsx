"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteTrade } from "@/lib/api";
import { WidgetShell } from "@/components/design-system";

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
    <WidgetShell
      title="RECENT TRADES"
      headerAction={<Link href="/trades" className="text-xs text-accent no-underline">View All →</Link>}
      loading={loading}
      isEmpty={trades.length === 0}
      emptyMessage="No trades yet. Log your first trade to get started."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 400 }}>
          <thead>
            <tr className="border-b border-border">
              {["SYMBOL", "DIRECTION", "P&L", "R:R", "DATE", ""].map((h) => (
                <th key={h} className="label-caps text-left pb-2 pr-3 whitespace-nowrap">{h}</th>
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
                <tr key={t.id} className="border-b border-border">
                  <td className="py-2.5 pr-3 font-semibold text-base">{t.symbol}</td>
                  <td className={`py-2.5 pr-3 text-sm font-semibold ${isLong ? "text-profit" : "text-loss"}`}>
                    {isLong ? "LONG" : "SHORT"}
                  </td>
                  <td className={`py-2.5 pr-3 text-base font-semibold ${isWin ? "text-profit" : "text-loss"}`}>
                    {fmtPnl(t.pnl)}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-text-muted">
                    {rr > 0 ? `${rr.toFixed(1)}R` : "--"}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-text-muted">
                    {timeAgo(t.created_at)}
                  </td>
                  <td className="py-2.5">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          const menu = e.currentTarget.nextElementSibling as HTMLElement;
                          if (menu) menu.style.display = menu.style.display === "block" ? "none" : "block";
                        }}
                        className="bg-transparent border-none text-text-muted cursor-pointer text-base px-1.5 py-0.5"
                      >
                        ⋮
                      </button>
                      <div
                        className="hidden absolute right-0 top-full bg-bg-surface border border-border rounded-lg z-10"
                        style={{ minWidth: 120 }}
                      >
                        <Link href={`/trades/${t.id}`} className="block px-3 py-2 text-xs text-text-primary no-underline">
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          className="block w-full text-left px-3 py-2 text-xs text-loss bg-transparent border-none cursor-pointer"
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
    </WidgetShell>
  );
}
