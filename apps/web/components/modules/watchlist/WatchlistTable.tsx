"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getWatchlistItems,
  addWatchlistItem,
  deleteWatchlistItem,
  reorderWatchlist,
  type Watchlist,
  type WatchlistItem,
} from "@/lib/api/watchlist";

interface WatchlistTableProps {
  watchlist: Watchlist;
}

const PRIORITY_LABELS = ["Low", "Medium", "High"];
const PRIORITY_COLORS = [
  "var(--text-dim, #6b7280)",
  "var(--accent, #3b82f6)",
  "var(--accent-loss, #ef4444)",
];

export default function WatchlistTable({ watchlist }: WatchlistTableProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  const loadItems = useCallback(async () => {
    try {
      const data = await getWatchlistItems(watchlist.id);
      setItems(data);
    } catch (e) {
      console.error("Failed to load items:", e);
    }
  }, [watchlist.id]);

  useEffect(() => {
    loadItems().finally(() => setLoading(false));
  }, [loadItems]);

  const handleAdd = useCallback(async () => {
    const ticker = newSymbol.trim().toUpperCase();
    if (!ticker) return;
    try {
      await addWatchlistItem(watchlist.id, ticker);
      setNewSymbol("");
      setIsAdding(false);
      await loadItems();
    } catch (e) {
      console.error("Failed to add item:", e);
    }
  }, [watchlist.id, newSymbol, loadItems]);

  const handleDelete = useCallback(
    async (itemId: string) => {
      try {
        await deleteWatchlistItem(watchlist.id, itemId);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch (e) {
        console.error("Failed to delete item:", e);
      }
    },
    [watchlist.id],
  );

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === idx) return;
      const newItems = [...items];
      const [moved] = newItems.splice(dragIdx, 1);
      newItems.splice(idx, 0, moved);
      setItems(newItems);
      setDragIdx(idx);
    },
    [dragIdx, items],
  );

  const handleDragEnd = useCallback(async () => {
    setDragIdx(null);
    // Persist reorder
    if (dragIdx !== null) {
      try {
        await reorderWatchlist(watchlist.id, items[dragIdx].id, dragIdx, items.findIndex((i) => i.id === items[dragIdx].id));
      } catch (e) {
        console.error("Failed to reorder:", e);
        await loadItems();
      }
    }
  }, [dragIdx, items, watchlist.id, loadItems]);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted, #9ca3af)",
          fontSize: 12,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          height: 40,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border, #23252d)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          {watchlist.name}
        </span>
        <button
          onClick={() => setIsAdding(true)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            background: "var(--accent, #3b82f6)",
            color: "#fff",
            border: "none",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Symbol
        </button>
      </div>

      {/* Add symbol input */}
      {isAdding && (
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid var(--border, #23252d)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            autoFocus
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewSymbol("");
              }
            }}
            placeholder="Symbol (e.g., BEL, RELIANCE)..."
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--accent, #3b82f6)",
              background: "var(--bg-surface-hover, #1a1b23)",
              color: "var(--text-primary, #fafafa)",
              fontSize: 12,
              outline: "none",
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              border: "none",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: "var(--text-muted, #9ca3af)",
              fontSize: 13,
            }}
          >
            No symbols yet. Click "Add Symbol" to start tracking.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border, #23252d)",
                }}
              >
                {["Symbol", "Name", "Priority", "Notes", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-dim, #6b7280)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    borderBottom: "1px solid var(--border, #23252d)",
                    cursor: "grab",
                    background:
                      dragIdx === idx
                        ? "var(--bg-surface-hover, #1a1b23)"
                        : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    {item.ticker}
                    {item.exchange && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-dim, #6b7280)",
                          marginLeft: 4,
                        }}
                      >
                        {item.exchange}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "var(--text-secondary, #d1d5db)",
                    }}
                  >
                    {item.name || "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: PRIORITY_COLORS[item.priority] || PRIORITY_COLORS[0],
                      }}
                    >
                      {PRIORITY_LABELS[item.priority] || "Low"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {editingNotes === item.id ? (
                      <input
                        autoFocus
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        onBlur={() => setEditingNotes(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingNotes(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: "1px solid var(--accent, #3b82f6)",
                          background: "var(--bg-surface-hover, #1a1b23)",
                          color: "var(--text-primary, #fafafa)",
                          fontSize: 12,
                          outline: "none",
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingNotes(item.id);
                          setNotesValue(item.notes || "");
                        }}
                        style={{
                          color: item.notes
                            ? "var(--text-secondary, #d1d5db)"
                            : "var(--text-dim, #6b7280)",
                          cursor: "pointer",
                        }}
                      >
                        {item.notes || "Add note..."}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button
                      onClick={() => handleDelete(item.id)}
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
                      title="Remove"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
