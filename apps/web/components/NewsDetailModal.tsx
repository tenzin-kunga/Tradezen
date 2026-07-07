"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MarketNewsEvent, Impact } from "@/lib/api";
import {
  lookupEventMetadata,
  type EventMetadata,
} from "@/lib/economic-event-metadata";
import {
  IMPACT_COLORS,
  formatEventTime,
  isPastEvent,
  isSpeech,
  getEventStatus,
  StatusChip,
} from "@/lib/news";
import { CURRENCY_MARKET_INFO } from "@/lib/currency-pairs";

function ImpactBadge({ impact }: { impact: Impact }) {
  const colors = IMPACT_COLORS[impact] ?? IMPACT_COLORS.low;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 4,
        backgroundColor: colors.badge,
        color: "#fff",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        lineHeight: "16px",
      }}
    >
      {impact === "high"
        ? "High Impact"
        : impact === "medium"
          ? "Medium Impact"
          : "Low Impact"}
    </span>
  );
}

function StatCard({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${highlight ? (color ?? "var(--border)") : "var(--border)"}`,
        padding: "16px 12px",
        textAlign: "center",
        backgroundColor: highlight ? IMPACT_COLORS.high.bg : "transparent",
        borderColor: highlight
          ? (color ?? IMPACT_COLORS.high.bar)
          : "var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 16 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
        }}
      >
        {label}
      </span>
      <div
        style={{
          height: 1,
          backgroundColor: "var(--border)",
          marginTop: 8,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

function ModalField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--text-primary)",
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function VolatilityStars({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            fontSize: 16,
            color: i <= level ? "#f59e0b" : "var(--text-dim)",
            opacity: i <= level ? 1 : 0.3,
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function Badge({
  children,
  mono,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 4,
        backgroundColor: "var(--surface-2)",
        color: "var(--text-dim)",
        fontFamily: mono ? "var(--font-mono)" : undefined,
      }}
    >
      {children}
    </span>
  );
}

function TimelineItem({
  time,
  label,
  isLast,
  color,
}: {
  time?: string;
  label: string;
  isLast?: boolean;
  color: string;
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          width: 16,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <div
            style={{
              width: 1,
              flex: 1,
              backgroundColor: "var(--border)",
              minHeight: 16,
              margin: "2px 0",
            }}
          />
        )}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 12 }}>
        {time && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {time}
          </div>
        )}
        <div
          style={{
            fontSize: 13,
            color: time ? "var(--text-muted)" : "var(--text-primary)",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function extractTimezone(dateStr: string): string {
  const m = dateStr.match(/([+-]\d{2}:\d{2})$/);
  return m ? `UTC${m[1]}` : "—";
}

export default function NewsDetailModal({
  event,
  open,
  onOpenChange,
}: {
  event: MarketNewsEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [metadata, setMetadata] = useState<EventMetadata | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    lookupEventMetadata(event.title).then((m) => {
      if (!cancelled) setMetadata(m);
    });
    return () => {
      cancelled = true;
    };
  }, [event]);

  if (!event) return null;

  const status = getEventStatus(event);
  const past = isPastEvent(event);
  const showActual = past && event.released ? event.actual : "\u2014";
  const marketInfo =
    CURRENCY_MARKET_INFO[event.currency] ?? CURRENCY_MARKET_INFO[event.country];
  const colors = IMPACT_COLORS[event.impact] ?? IMPACT_COLORS.low;
  const volatility =
    metadata?.tradingImpact.volatility ?? (event.impact === "high" ? 4 : 3);
  const speech = isSpeech(event.title);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[720px] max-h-[80vh] overflow-y-auto !p-0"
        overlayClassName="bg-black/40 backdrop-blur-md"
        showCloseButton={false}
        style={{
          background: "var(--bg-surface, #111214)",
          border: "1px solid var(--border, #23252d)",
          boxShadow: "var(--shadow-2xl)",
          overflow: "hidden",
        }}
      >
        <DialogTitle className="sr-only">{event.title} details</DialogTitle>

        {/* Top accent bar */}
        <div style={{ height: 3, backgroundColor: colors.bar }} />

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="transition-colors duration-150"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: "var(--radius-sm)",
            color: "var(--text-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-dim)";
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Content */}
        <div style={{ padding: "24px 28px 32px" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 14, flexWrap: "wrap" }}
            >
              <ImpactBadge impact={event.impact} />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 4,
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-dim)",
                }}
              >
                {event.currency || event.country}
              </span>
              <StatusChip status={status} />
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.3,
                marginBottom: 6,
              }}
            >
              {event.title}
            </h2>
            <div
              className="flex items-center gap-3"
              style={{ fontSize: 13, color: "var(--text-dim)" }}
            >
              <span style={{ fontWeight: 500 }}>
                Released: {formatEventTime(event.date)}
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span>
                {status === "upcoming"
                  ? "Today"
                  : status === "live"
                    ? "Live now"
                    : "Today"}
              </span>
            </div>
          </div>

          {/* Stats */}
          {!speech && (
            <div className="flex gap-3">
              <StatCard
                label="Actual"
                value={showActual}
                highlight
                color={colors.bar}
              />
              <StatCard label="Forecast" value={event.forecast || "\u2014"} />
              <StatCard label="Previous" value={event.previous || "\u2014"} />
            </div>
          )}

          {/* Market Impact */}
          <SectionHeader label="Market Impact" />
          <ModalField label="Expected Volatility">
            <VolatilityStars level={volatility} />
          </ModalField>
          {metadata?.tradingImpact.typicalMovement && (
            <ModalField label="Typical Movement">
              {metadata.tradingImpact.typicalMovement}
            </ModalField>
          )}
          {marketInfo && marketInfo.pairs.length > 0 && (
            <ModalField label="Affected Pairs">
              <div
                className="flex gap-1.5"
                style={{ flexWrap: "wrap", marginTop: 2 }}
              >
                {marketInfo.pairs.map((p) => (
                  <Badge key={p} mono>
                    {p}
                  </Badge>
                ))}
              </div>
            </ModalField>
          )}
          {marketInfo && marketInfo.assets.length > 0 && (
            <ModalField label="Related Assets">
              <div
                className="flex gap-1.5"
                style={{ flexWrap: "wrap", marginTop: 2 }}
              >
                {marketInfo.assets.map((a) => (
                  <Badge key={a}>{a}</Badge>
                ))}
              </div>
            </ModalField>
          )}
          {!metadata && (
            <ModalField label="Market Impact">
              <span style={{ color: "var(--text-dim)" }}>
                Volatility data is estimated based on impact level.
              </span>
            </ModalField>
          )}

          {/* About */}
          {metadata && (
            <>
              <SectionHeader label="About" />
              <ModalField label="Source">{metadata.source}</ModalField>
              <ModalField label="Measures">{metadata.measures}</ModalField>
              <ModalField label="Usual Effect">
                {metadata.usualEffect}
              </ModalField>
              <ModalField label="Frequency">{metadata.frequency}</ModalField>
            </>
          )}

          {/* Release */}
          <SectionHeader label="Release" />
          {metadata && (
            <ModalField label="Schedule">{metadata.releaseSchedule}</ModalField>
          )}
          <ModalField label="Timezone">
            {extractTimezone(event.date)}
          </ModalField>

          {/* Notes */}
          {metadata && (
            <>
              <SectionHeader label="Notes" />
              <ModalField label="FF Notes">{metadata.ffNotes}</ModalField>
              <ModalField label="Why Traders Care">
                {metadata.whyTradersCare}
              </ModalField>
              <ModalField label="Derived Via">{metadata.derivedVia}</ModalField>
              <ModalField label="Acro Expand">{metadata.acroExpand}</ModalField>
            </>
          )}

          {/* Timeline */}
          <SectionHeader label="Timeline" />
          <div
            style={{
              background: "var(--bg-surface-hover)",
              borderRadius: "var(--radius-sm)",
              padding: "16px 16px 8px",
            }}
          >
            {speech ? (
              <>
                <TimelineItem
                  time={formatEventTime(event.date)}
                  label="Speech begins"
                  color={colors.bar}
                />
                <TimelineItem label="Prepared remarks" color={colors.bar} />
                <TimelineItem label="Q&A session" color={colors.bar} />
                <TimelineItem
                  label="Market reaction"
                  isLast
                  color={colors.bar}
                />
              </>
            ) : (
              <>
                <TimelineItem
                  time={formatEventTime(event.date)}
                  label="Data released"
                  color={colors.bar}
                />
                <TimelineItem label="Market reaction" color={colors.bar} />
                <TimelineItem
                  label="Analysis &amp; revisions"
                  isLast
                  color={colors.bar}
                />
              </>
            )}
          </div>

          {/* Missing metadata fallback */}
          {!metadata && (
            <p
              style={{
                marginTop: 20,
                textAlign: "center",
                fontSize: 14,
                color: "var(--text-dim)",
                padding: "24px 0",
                lineHeight: 1.5,
              }}
            >
              Additional economic information is unavailable for this event.
            </p>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <a
              href="https://www.forexfactory.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 20px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                backgroundColor: "var(--surface-1)",
                textDecoration: "none",
                transition:
                  "background-color 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface-2)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface-1)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              View Full Calendar →
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
