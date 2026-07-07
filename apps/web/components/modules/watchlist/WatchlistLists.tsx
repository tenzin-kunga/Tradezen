"use client";

import { useState } from "react";
import type { Watchlist } from "@/lib/api/watchlist";

interface WatchlistListsProps {
  watchlists: Watchlist[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function WatchlistLists({
  watchlists,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: WatchlistListsProps) {
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewName("");
    setIsCreating(false);
  }

  return (
    <div
      style={{
        width: 200,
        borderRight: "1px solid var(--border, #23252d)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        background: "var(--bg-sidebar, #0c0c0f)",
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
        }}
      >
        <span
          className="label-caps"
          style={{ color: "var(--text-dim, #6b7280)" }}
        >
          Lists
        </span>
        <button
          onClick={() => setIsCreating(true)}
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
          }}
          title="New list"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* New list input */}
      {isCreating && (
        <div style={{ padding: "8px 12px" }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewName("");
              }
            }}
            onBlur={handleCreate}
            placeholder="List name..."
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--accent, #3b82f6)",
              background: "var(--bg-surface-hover, #1a1b23)",
              color: "var(--text-primary, #fafafa)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      )}

      {/* List items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {watchlists.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
            }}
          >
            No watchlists yet
          </div>
        ) : (
          watchlists.map((wl) => {
            const isActive = wl.id === activeId;
            const isHovered = wl.id === hoveredId;
            return (
              <div
                key={wl.id}
                onClick={() => onSelect(wl.id)}
                onMouseEnter={() => setHoveredId(wl.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
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
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? "var(--text-primary, #fafafa)"
                      : "var(--text-secondary, #d1d5db)",
                  }}
                >
                  {wl.name}
                </span>
                {isHovered && watchlists.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(wl.id);
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted, #9ca3af)",
                    }}
                    title="Delete"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
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
