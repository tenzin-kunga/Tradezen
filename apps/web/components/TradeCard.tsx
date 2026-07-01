"use client";

import type { Trade } from "@tradezen/types";
import Image from "next/image";
import { Badge } from "@/components/ui";
import { getTradingSession } from "@/lib/session";
import { ImageLightbox } from "./ImageLightbox";
import { useState } from "react";

function fmtPnl(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = n >= 0 ? "+$" : "-$";
  return prefix + abs;
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

function fmtMetric(val: number | string | null | undefined): string {
  if (val == null || val === undefined) return "--";
  return typeof val === "number" ? val.toString() : String(val);
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
  const pnlColor = isWin ? "var(--accent-profit)" : "var(--accent-loss)";
  const dirColor = isLong ? "var(--accent-profit)" : "var(--accent-loss)";

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const showFomo = trade.fomoCheck;
  const showVengeance = trade.vengeanceTrade;
  const showTrend = trade.trendAlignment;
  const hasOverlayTags = showFomo || showVengeance || showTrend;

  return (
    <>
      {/* Desktop card */}
      <div
        className="hidden md:block surface-2 rounded-xl overflow-hidden cursor-pointer"
        onClick={() => onView(trade)}
        style={{
          transition:
            "background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--bg-surface-hover)";
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(true);
          }}
          className="relative w-full bg-[var(--bg-surface)] overflow-hidden"
          style={{ aspectRatio: "16/9" }}
        >
          {trade.previewImage ? (
            <>
              <Image
                src={trade.previewImage.url}
                alt={trade.symbol + " chart"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              />
              <div className="absolute top-3 right-3 flex gap-1">
                {(trade.imageCount ?? 0) > 1 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 h-auto"
                  >
                    {trade.imageCount}
                  </Badge>
                )}
                {trade.notes && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.5 h-auto"
                  >
                    NOTES
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5 h-auto"
                  style={{
                    background: isWin
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(239,68,68,0.15)",
                    color: pnlColor,
                  }}
                >
                  {isWin ? "WIN" : "LOSS"}
                </Badge>
              </div>
              {hasOverlayTags && (
                <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
                  {showFomo && (
                    <Badge
                      variant="destructive"
                      className="text-[9px] px-1.5 py-0.5 h-auto"
                    >
                      FOMO
                    </Badge>
                  )}
                  {showVengeance && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0.5 h-auto"
                      style={{
                        color: "rgb(249,115,22)",
                        borderColor: "rgba(249,115,22,0.3)",
                      }}
                    >
                      REVENGE
                    </Badge>
                  )}
                  {showTrend && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0.5 h-auto"
                      style={{
                        color: "var(--accent-profit)",
                        borderColor: "rgba(34,197,94,0.3)",
                      }}
                    >
                      TREND
                    </Badge>
                  )}
                </div>
              )}
            </>
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1"
              style={{ color: "var(--text-dim)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <span className="text-[10px] font-medium">No screenshot</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div
                className="font-bold tracking-tight"
                style={{
                  fontSize: "var(--metric-primary)",
                  color: pnlColor,
                }}
              >
                {fmtPnl(Number(trade.pnl))}
              </div>
              <div
                className="mt-0.5 font-semibold truncate"
                style={{
                  fontSize: "var(--text-lg)",
                  color: "var(--text-primary)",
                }}
              >
                {trade.symbol}
              </div>
              <div
                className="mt-1 flex items-center gap-1.5 flex-wrap"
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ color: dirColor }}>
                  {isLong ? "LONG" : "SHORT"}
                </span>
                <span style={{ color: "var(--text-dim)" }}>·</span>
                <span>{fmtDate(d)}</span>
                {session !== "--" && (
                  <>
                    <span style={{ color: "var(--text-dim)" }}>·</span>
                    <span>{session}</span>
                  </>
                )}
                {trade.strategy && (
                  <>
                    <span style={{ color: "var(--text-dim)" }}>·</span>
                    <span className="truncate">{trade.strategy}</span>
                  </>
                )}
              </div>
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
              style={{
                color: "var(--text-dim)",
                flexShrink: 0,
                opacity: 0.5,
                marginTop: 2,
              }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>

          <div
            className="mt-3 flex gap-4"
            style={{ fontSize: "var(--text-xs)" }}
          >
            <div>
              <div className="label-caps text-[9px]">Entry</div>
              <div
                className="font-semibold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {fmtMetric(trade.entryPrice)}
              </div>
            </div>
            <div>
              <div className="label-caps text-[9px]">Exit</div>
              <div
                className="font-semibold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {fmtMetric(trade.exitPrice)}
              </div>
            </div>
            <div>
              <div className="label-caps text-[9px]">R:R</div>
              <div
                className="font-semibold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {fmtMetric(trade.riskReward)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile card */}
      <div
        className="block md:hidden surface-2 rounded-xl overflow-hidden cursor-pointer px-4 py-3"
        onClick={() => onView(trade)}
        style={{
          transition: "background var(--duration-fast) var(--ease-out)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--bg-surface-hover)";
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-bold tracking-tight"
                style={{
                  fontSize: "var(--metric-primary)",
                  color: pnlColor,
                }}
              >
                {fmtPnl(Number(trade.pnl))}
              </span>
              <span
                className="font-semibold truncate"
                style={{
                  fontSize: "var(--text-base)",
                  color: "var(--text-primary)",
                }}
              >
                {trade.symbol}
              </span>
            </div>
            <div
              className="mt-0.5 flex items-center gap-1.5"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              <span className="font-medium" style={{ color: dirColor }}>
                {isLong ? "LONG" : "SHORT"}
              </span>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span>{fmtDate(d)}</span>
              {session !== "--" && (
                <>
                  <span style={{ color: "var(--text-dim)" }}>·</span>
                  <span>{session}</span>
                </>
              )}
            </div>
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
            style={{
              color: "var(--text-dim)",
              flexShrink: 0,
              opacity: 0.5,
            }}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </div>

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
