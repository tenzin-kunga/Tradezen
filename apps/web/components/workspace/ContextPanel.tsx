"use client";

import { useEffect, useState } from "react";
import type { WorkspaceResource, ContextSlice } from "@/lib/workspace/types";
import { getContextEngine } from "@/lib/workspace/context-engine";

interface ContextPanelProps {
  resource: WorkspaceResource | null;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ContextPanel({
  resource,
  collapsed,
  onToggle,
}: ContextPanelProps) {
  const [slices, setSlices] = useState<ContextSlice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!resource || collapsed) {
      setSlices([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const engine = getContextEngine();
    engine
      .getContext(resource)
      .then((result) => {
        if (!cancelled) {
          setSlices(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resource, collapsed]);

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
          title="Show context panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
        width: 300,
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
          Context
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
          title="Hide context panel"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!resource ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            Select a resource to see context
          </div>
        ) : loading ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            Loading...
          </div>
        ) : slices.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No context available
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {slices.map((slice, i) => (
              <div
                key={`${slice.source}-${i}`}
                className="glass-card"
                style={{ padding: "10px 12px", borderRadius: 8 }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--accent, #3b82f6)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  {slice.source}
                </div>
                {Object.entries(slice.data).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "2px 0",
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
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
