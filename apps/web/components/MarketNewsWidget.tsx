"use client";

import { useEffect, useState } from "react";
import { getMarketNews } from "@/lib/api";
import { WidgetShell } from "@/components/design-system";
import NewsDetailModal from "@/components/NewsDetailModal";
import {
  IMPACT_COLORS,
  formatEventTime,
  isPastEvent,
  isSpeech,
  getEventStatus,
  StatusChip,
  type MarketNewsEvent,
} from "@/lib/news";

function MetricColumn({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ minWidth: 60, flex: 1 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 3,
          lineHeight: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: highlight ? "var(--text-primary)" : "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function MarketNewsWidget({
  loading: initialLoading,
}: {
  loading?: boolean;
}) {
  const [events, setEvents] = useState<MarketNewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MarketNewsEvent | null>(
    null,
  );

  useEffect(() => {
    const abort = new AbortController();
    getMarketNews(abort.signal)
      .then((data) => {
        const now = new Date();
        const todayEvents = data
          .filter((e) => {
            if (!e.date) return false;
            if (e.impact !== "high" && e.impact !== "medium") return false;
            const t = new Date(e.date);
            if (Number.isNaN(t.getTime())) return false;
            return (
              t.getFullYear() === now.getFullYear() &&
              t.getMonth() === now.getMonth() &&
              t.getDate() === now.getDate()
            );
          })
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
        setEvents(todayEvents);
      })
      .catch((err) => {
        if ((err as Error)?.name === "AbortError") return;
        setError(err.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, []);

  return (
    <>
      <WidgetShell
        title="MARKET NEWS"
        loading={initialLoading || loading}
        error={error}
        isEmpty={events.length === 0}
        emptyMessage="No news events today."
        padding="md"
        emptyAction={
          <a
            href="https://www.forexfactory.com/calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium"
            style={{
              color: "var(--accent)",
              textDecoration: "none",
              marginTop: 4,
            }}
          >
            View Full Calendar →
          </a>
        }
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {events.map((event, i) => {
            const status = getEventStatus(event);
            const colors = IMPACT_COLORS[event.impact] ?? IMPACT_COLORS.low;
            const past = isPastEvent(event);
            const actualDisplay =
              past && event.released ? event.actual : "\u2014";

            return (
              <div
                key={event.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEvent(event)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedEvent(event);
                  }
                }}
                className="cursor-pointer rounded-[var(--radius-sm)] transition-all hover:bg-[var(--bg-surface-hover)] hover:-translate-y-px duration-150"
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 12,
                  padding: "12px 8px",
                  borderBottom:
                    i < events.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  opacity: past ? 0.6 : 1,
                }}
              >
                {/* Left accent bar */}
                <div
                  style={{
                    width: 4,
                    flexShrink: 0,
                    backgroundColor: colors.bar,
                    borderRadius: 2,
                  }}
                />

                {/* Content */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {/* Row 1: Status + Impact label + Currency */}
                  <div className="flex items-center gap-2">
                    <StatusChip status={status} />
                    <span
                      className="label-caps"
                      style={{ fontSize: 8, letterSpacing: "0.06em" }}
                    >
                      {event.impact === "high" ? "High" : "Medium"}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: 4,
                        backgroundColor: "var(--surface-2)",
                        color: "var(--text-dim)",
                        lineHeight: "16px",
                      }}
                    >
                      {event.currency || event.country}
                    </span>
                  </div>

                  {/* Row 2: Title */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {event.title}
                  </span>

                  {/* Row 3: Time */}
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      fontWeight: 500,
                    }}
                  >
                    {formatEventTime(event.timestamp || event.date)}
                  </span>

                  {/* Row 4: Metrics */}
                  {!isSpeech(event.title) && (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        marginTop: 4,
                        paddingTop: 4,
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      <MetricColumn
                        label="Actual"
                        value={actualDisplay}
                        highlight
                      />
                      <MetricColumn
                        label="Forecast"
                        value={event.forecast || "\u2014"}
                      />
                      <MetricColumn
                        label="Previous"
                        value={event.previous || "\u2014"}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* View Full Calendar button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 14,
          }}
        >
          <a
            href="https://www.forexfactory.com/calendar"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 14px",
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
      </WidgetShell>

      <NewsDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      />
    </>
  );
}
