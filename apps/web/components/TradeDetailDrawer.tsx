"use client";

import type { Trade } from "@tradezen/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "--";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "--";
  return dt.toISOString().replace("T", " ").slice(0, 16);
}

export default function TradeDetailDrawer({
  trade,
  open,
  onClose,
  onEdit,
  onDelete,
}: {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!trade) return null;

  const isWin = trade.pnl >= 0;
  const isLong = trade.direction === "buy";
  const imageUrl = trade.chart_image ? `${API}${trade.chart_image}` : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-y-auto"
      >
        <SheetHeader
          className="border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-bold tracking-wider">
              {trade.symbol}
            </SheetTitle>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(trade.id)}
                className="btn-primary text-xs"
              >
                EDIT
              </button>
              <button
                onClick={() => onDelete(trade.id)}
                className="btn-glass text-xs"
                style={{
                  color: "var(--accent-loss)",
                  borderColor: "var(--accent-loss)",
                }}
              >
                DELETE
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] font-semibold tracking-widest px-1.5 py-0.5 rounded"
              style={{
                background: isWin
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(239,68,68,0.15)",
                color: isWin ? "var(--accent-profit)" : "var(--accent-loss)",
              }}
            >
              {isWin ? "WIN" : "LOSS"}
            </span>
            <span
              className="mono-data font-semibold text-xs"
              style={{
                color: isWin ? "var(--accent-profit)" : "var(--accent-loss)",
              }}
            >
              {fmt(Number(trade.pnl))}
            </span>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          {imageUrl && (
            <div
              className="rounded overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <img
                src={imageUrl}
                alt="Trade chart"
                className="w-full object-cover"
                style={{ maxHeight: 240 }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="ENTRY" value={String(trade.entry_price)} mono />
            <Field label="EXIT" value={String(trade.exit_price)} mono />
            <Field
              label="STOP LOSS"
              value={trade.stop_loss != null ? String(trade.stop_loss) : "--"}
              mono
            />
            <Field
              label="TAKE PROFIT"
              value={
                trade.take_profit != null ? String(trade.take_profit) : "--"
              }
              mono
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="LOT SIZE" value={String(trade.lot_size)} />
            <Field
              label="COMMISSION"
              value={`$${Number(trade.commission ?? 0).toFixed(2)}`}
            />
            <Field label="DIRECTION" value={isLong ? "LONG" : "SHORT"} />
            <Field
              label="DATE"
              value={fmtDate(trade.trade_date ?? trade.created_at)}
            />
          </div>

          {trade.strategy && (
            <div>
              <div className="label-caps mb-1">STRATEGY</div>
              <div className="text-sm font-semibold">{trade.strategy}</div>
            </div>
          )}

          {(trade.fomo_check ||
            trade.trend_alignment ||
            trade.vengeance_trade) && (
            <div>
              <div className="label-caps mb-2">PSYCHOLOGY</div>
              <div className="flex flex-col gap-1.5">
                {trade.fomo_check && <PsychologyLabel label="FOMO ENTRY" />}
                {trade.trend_alignment && (
                  <PsychologyLabel label="TREND ALIGNED" positive />
                )}
                {trade.vengeance_trade && (
                  <PsychologyLabel label="VENGEANCE TRADE" />
                )}
              </div>
            </div>
          )}

          {trade.notes && (
            <div>
              <div className="label-caps mb-1">NOTES</div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}
              >
                {trade.notes}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="glass-card p-2.5">
      <div className="label-caps mb-0.5">{label}</div>
      <div
        className={
          mono ? "mono-data font-semibold text-sm" : "font-semibold text-sm"
        }
      >
        {value}
      </div>
    </div>
  );
}

function PsychologyLabel({
  label,
  positive,
}: {
  label: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: positive ? "var(--accent-profit)" : "var(--accent-warn)",
          flexShrink: 0,
        }}
      />
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
