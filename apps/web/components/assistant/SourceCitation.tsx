"use client";

import { useState } from "react";

export interface Source {
  name: string;
  count?: number;
  match?: string;
  detail?: string;
  onClick?: () => void;
}

interface SourceCitationProps {
  sources: Source[];
}

export default function SourceCitation({ sources }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span style={{ fontWeight: 500 }}>Sources: {sources.length}</span>
        <span>—</span>
        <span>
          {sources
            .map((s) => `${s.name}${s.count ? ` (${s.count})` : ""}`)
            .join(" · ")}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {sources.map((s, i) => (
            <button
              key={i}
              onClick={s.onClick}
              disabled={!s.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                background: s.onClick
                  ? "var(--bg-surface-hover, #1a1b23)"
                  : "transparent",
                border: "none",
                cursor: s.onClick ? "pointer" : "default",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span style={{ color: "var(--text-primary, #fafafa)" }}>
                {s.name}
                {s.count ? ` (${s.count})` : ""}
              </span>
              {s.match && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted, #9ca3af)",
                  }}
                >
                  {s.match}
                </span>
              )}
              {s.detail && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim, #6b7280)",
                  }}
                >
                  {s.detail}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
