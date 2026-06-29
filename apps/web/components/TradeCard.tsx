"use client";

import type { Trade } from "@tradezen/types";
import Image from "next/image";
import {
  Card,
  CardContent,
  Badge,
  Separator,
} from "@/components/ui";
import { getTradingSession } from "@/lib/session";
import { ImageLightbox } from "./ImageLightbox";
import { useState } from "react";

function fmtPnl(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = n >= 0 ? '+$' : '-$'; return prefix + abs;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "--";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "--";
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

export default function TradeCard({
  trade,
  onView,
}: {
  trade: Trade;
  onView: (t: Trade) => void;
}) {
  const isWin = trade.pnl >= 0;
  const isLong = trade.direction === "buy";
  const d = trade.tradeDate ?? trade.createdAt;
  const session = getTradingSession(d);

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const metrics = [
    { label: "Entry", value: trade.entryPrice },
    { label: "Exit", value: trade.exitPrice },
    { label: "Stop Loss", value: trade.stopLoss },
    { label: "Take Profit", value: trade.takeProfit },
    { label: "R:R", value: trade.riskReward },
    { label: "Lot Size", value: trade.lotSize },
  ];

  function fmtMetric(val: number | string | null | undefined): string {
    if (val == null || val === undefined) return "--";
    if (typeof val === "number") {
      return val.toString();
    }
    return String(val);
  }

  return (
    <>
      <Card
        className="cursor-pointer transition-all hover:brightness-110 overflow-hidden p-4"
        onClick={() => onView(trade)}
      >
        {/* Screenshot area */}
        <div onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}>
          <div className="relative w-full bg-[var(--bg-surface-hover)] rounded-lg overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
            {trade.previewImage ? (
              <Image
                src={trade.previewImage.url}
                alt={trade.symbol + " chart"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ color: "var(--text-dim)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span className="text-[10px] font-medium">No screenshot</span>
              </div>
            )}
            {/* Overlay badges */}
            <div className="absolute top-3 right-3 flex gap-1">
              {(trade.imageCount ?? 0) > 1 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
                  {trade.imageCount}
                </Badge>
              )}
              {trade.notes && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
                  NOTES
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Header: Symbol + P&L */}
        <CardContent className="pb-0 mb-4">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">{trade.symbol}</span>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 h-auto"
                style={{
                  background: isWin
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)",
                  color: isWin ? "var(--accent-profit)" : "var(--accent-loss)",
                }}
              >
                {isWin ? "WIN" : "LOSS"}
              </Badge>
            </div>
            <span
              className="mono-data text-lg font-bold"
              style={{
                color: isWin ? "var(--accent-profit)" : "var(--accent-loss)",
              }}
            >
              {fmtPnl(Number(trade.pnl))}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] flex-wrap" style={{ color: "var(--text-muted)" }}>
            {[
              { el: <span key="dir" style={{ color: isLong ? "var(--accent-profit)" : "var(--accent-loss)" }}>{isLong ? "LONG" : "SHORT"}</span> },
              trade.strategy && { el: <span key="strat">{trade.strategy}</span> },
              { el: <span key="date">{fmtDate(d)}</span> },
              session !== "--" && { el: <span key="sess">{session}</span> },
            ].filter(Boolean).reduce<React.ReactNode[]>((acc, item, i) => {
              if (i === 0) return [item.el];
              return [...acc, <span key={`dot-${i}`}>·</span>, item.el];
            }, [])}
          </div>
        </CardContent>

        <Separator className="my-2.5" />

        {/* Metrics grid */}
        <CardContent className="pb-0">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {metrics.map((m) => (
              <div key={m.label}>
                <div className="label-caps text-[9px]">{m.label}</div>
                <div className="mono-data font-semibold text-sm leading-snug">
                  {fmtMetric(m.value)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <Separator className="my-2.5" />

        {/* Footer: tags + notes + chevron */}
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            {trade.fomoCheck && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 h-auto">
                FOMO
              </Badge>
            )}
            {trade.vengeanceTrade && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-auto" style={{ color: "rgb(249,115,22)", borderColor: "rgba(249,115,22,0.3)" }}>
                REVENGE
              </Badge>
            )}
            {trade.trendAlignment && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-auto" style={{ color: "var(--accent-profit)", borderColor: "rgba(34,197,94,0.3)" }}>
                TREND
              </Badge>
            )}
            <div className="flex-1" />
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
        </CardContent>
      </Card>

      {trade.previewImage && (
        <ImageLightbox
          tradeId={trade.id}
          previewImage={trade.previewImage}
          imageCount={trade.imageCount ?? 0}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
