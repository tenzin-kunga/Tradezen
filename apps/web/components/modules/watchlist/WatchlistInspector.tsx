"use client";

import type { WatchlistItem } from "@/lib/api/watchlist";

interface WatchlistInspectorProps {
  collapsed: boolean;
  onToggle: () => void;
  item: WatchlistItem | null;
}

export default function WatchlistInspector({
  collapsed,
  onToggle,
  item,
}: WatchlistInspectorProps) {
  if (collapsed) {
    return (
      <div
        style={{
          width: 36,
          borderLeft: "1px solid var(--border, #23252d)",
          background: "var(--bg-sidebar, #0c0c0f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onToggle}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted, #9ca3af)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Show inspector"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 280,
        borderLeft: "1px solid var(--border, #23252d)",
        background: "var(--bg-sidebar, #0c0c0f)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 40,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border, #23252d)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary, #d1d5db)",
          }}
        >
          Inspector
        </span>
        <button
          onClick={onToggle}
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted, #9ca3af)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Hide inspector"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!item ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            Select a symbol to inspect
          </div>
        ) : (
          <>
            <InspectorSection title="Symbol">
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary, #fafafa)",
                }}
              >
                {item.ticker}
                {item.exchange && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: "var(--text-dim, #6b7280)",
                      marginLeft: 6,
                    }}
                  >
                    {item.exchange}
                  </span>
                )}
              </div>
              {item.name && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary, #d1d5db)",
                    marginTop: 2,
                  }}
                >
                  {item.name}
                </div>
              )}
            </InspectorSection>

            <InspectorSection title="Notes">
              {item.notes ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary, #d1d5db)",
                    lineHeight: 1.5,
                  }}
                >
                  {item.notes}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim, #6b7280)",
                    fontStyle: "italic",
                  }}
                >
                  No notes yet
                </div>
              )}
            </InspectorSection>

            <InspectorSection title="Alerts">
              {item.alerts && Object.keys(item.alerts).length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {Object.entries(item.alerts).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                        {key}
                      </span>
                      <span
                        style={{
                          color: "var(--text-primary, #fafafa)",
                          fontWeight: 500,
                        }}
                      >
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim, #6b7280)",
                    fontStyle: "italic",
                  }}
                >
                  No alerts configured
                </div>
              )}
            </InspectorSection>

            <InspectorSection title="Tags">
              {item.tags && item.tags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "var(--bg-surface-hover, #1a1b23)",
                        fontSize: 11,
                        color: "var(--text-secondary, #d1d5db)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim, #6b7280)",
                    fontStyle: "italic",
                  }}
                >
                  No tags
                </div>
              )}
            </InspectorSection>
          </>
        )}
      </div>
    </div>
  );
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="label-caps"
        style={{
          color: "var(--text-dim, #6b7280)",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
