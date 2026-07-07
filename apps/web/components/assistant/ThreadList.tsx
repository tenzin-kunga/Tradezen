"use client";

import { useState } from "react";
import type { Thread } from "@/lib/api/assistant";

interface ThreadListProps {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function ThreadList({
  threads,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: ThreadListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 12px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="label-caps"
          style={{ color: "var(--text-dim, #6b7280)" }}
        >
          Conversations
        </span>
        <button
          onClick={onCreate}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "var(--bg-surface-hover, #1a1b23)",
            border: "1px solid var(--border, #23252d)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted, #9ca3af)",
            transition: "color 0.15s",
          }}
          title="New conversation"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Thread list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 8px",
        }}
      >
        {threads.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
            }}
          >
            No conversations yet
          </div>
        ) : (
          threads.map((t) => {
            const isActive = t.id === activeId;
            const isHovered = t.id === hoveredId;
            return (
              <div
                key={t.id}
                onClick={() => onSelect(t.id)}
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isActive
                    ? "var(--bg-surface-hover, #1a1b23)"
                    : "transparent",
                  transition: "background 0.15s",
                  marginBottom: 2,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? "var(--text-primary, #fafafa)"
                        : "var(--text-secondary, #d1d5db)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.title || "New Conversation"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim, #6b7280)",
                      marginTop: 2,
                    }}
                  >
                    {formatDate(t.updatedAt)}
                  </div>
                </div>
                {isHovered && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t.id);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted, #9ca3af)",
                      flexShrink: 0,
                    }}
                    title="Delete"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
