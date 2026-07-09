"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Thread, ConversationType } from "@/lib/api/assistant";
import {
  IconChart,
  IconJournal,
  IconResearch,
  IconPortfolio,
  IconRisk,
  IconCoaching,
  IconChat,
} from "./icons";
import { IconButton } from "@/components/primitives/IconButton";
import { Badge } from "@/components/primitives/Badge";

const TYPE_ICONS: Record<
  ConversationType,
  React.ComponentType<{ size?: number }>
> = {
  daily_review: IconChart,
  journal: IconJournal,
  research: IconResearch,
  portfolio: IconPortfolio,
  risk: IconRisk,
  coaching: IconCoaching,
  general: IconChat,
};

const TYPE_LABELS: Record<ConversationType, string> = {
  daily_review: "Daily Review",
  journal: "Journal",
  research: "Research",
  portfolio: "Portfolio",
  risk: "Risk Audit",
  coaching: "Coaching",
  general: "General",
};

type FilterType = "all" | ConversationType;

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "daily_review", label: "Review" },
  { id: "journal", label: "Journal" },
  { id: "research", label: "Research" },
  { id: "portfolio", label: "Portfolio" },
  { id: "risk", label: "Risk" },
  { id: "coaching", label: "Coaching" },
];

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
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function groupByDate(threads: Thread[]): Map<string, Thread[]> {
  const groups = new Map<string, Thread[]>();
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const t of threads) {
    const d = new Date(t.updatedAt);
    const dateStr = d.toDateString();
    let key: string;
    if (dateStr === today) key = "Today";
    else if (dateStr === yesterday) key = "Yesterday";
    else {
      const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (daysAgo < 7) key = "This Week";
      else key = "Earlier";
    }
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  return groups;
}

interface ConversationSidebarProps {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onSearch: (query: string) => void;
}

export default function ConversationSidebar({
  threads,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onTogglePin,
  onSearch,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch],
  );

  // Filter threads
  const filtered = threads.filter((t) => {
    if (activeFilter === "all") return true;
    return t.primaryType === activeFilter;
  });

  // Separate pinned and unpinned
  const pinned = filtered.filter((t) => t.pinned);
  const unpinned = filtered.filter((t) => !t.pinned);
  const grouped = groupByDate(unpinned);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
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
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          Assistant
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

      {/* Search */}
      <div style={{ padding: "0 8px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 6,
            background: "var(--bg-surface-hover, #1a1b23)",
            border: "1px solid var(--border, #23252d)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted, #9ca3af)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary, #fafafa)",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "0 8px 8px",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: activeFilter === f.id ? 600 : 400,
              color:
                activeFilter === f.id
                  ? "var(--text-primary, #fafafa)"
                  : "var(--text-muted, #9ca3af)",
              background:
                activeFilter === f.id
                  ? "var(--bg-surface-hover, #1a1b23)"
                  : "transparent",
              border: "1px solid",
              borderColor:
                activeFilter === f.id
                  ? "var(--border, #23252d)"
                  : "transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {f.label}
          </button>
        ))}
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
            {searchQuery ? "No results found" : "No conversations yet"}
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinned.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-dim, #6b7280)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "4px 4px",
                  }}
                >
                  Pinned
                </div>
                {pinned.map((t) => (
                  <ConversationCard
                    key={t.id}
                    thread={t}
                    isActive={t.id === activeId}
                    isHovered={t.id === hoveredId}
                    menuOpen={t.id === menuOpenId}
                    onHover={setHoveredId}
                    onClick={() => onSelect(t.id)}
                    onTogglePin={() => onTogglePin(t.id)}
                    onDelete={() => onDelete(t.id)}
                    onMenuToggle={() =>
                      setMenuOpenId(menuOpenId === t.id ? null : t.id)
                    }
                    menuRef={menuRef}
                  />
                ))}
              </div>
            )}

            {/* Date groups */}
            {Array.from(grouped.entries()).map(([date, items]) => (
              <div key={date} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-dim, #6b7280)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "4px 4px",
                  }}
                >
                  {date}
                </div>
                {items.map((t) => (
                  <ConversationCard
                    key={t.id}
                    thread={t}
                    isActive={t.id === activeId}
                    isHovered={t.id === hoveredId}
                    menuOpen={t.id === menuOpenId}
                    onHover={setHoveredId}
                    onClick={() => onSelect(t.id)}
                    onTogglePin={() => onTogglePin(t.id)}
                    onDelete={() => onDelete(t.id)}
                    onMenuToggle={() =>
                      setMenuOpenId(menuOpenId === t.id ? null : t.id)
                    }
                    menuRef={menuRef}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ConversationCard({
  thread,
  isActive,
  isHovered,
  menuOpen,
  onHover,
  onClick,
  onTogglePin,
  onDelete,
  onMenuToggle,
  menuRef,
}: {
  thread: Thread;
  isActive: boolean;
  isHovered: boolean;
  menuOpen: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onMenuToggle: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
}) {
  const IconComponent = thread.primaryType
    ? TYPE_ICONS[thread.primaryType]
    : IconChat;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onHover(thread.id)}
      onMouseLeave={() => onHover(null)}
      className="tz-lift"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 10,
        cursor: "pointer",
        background: isActive ? "var(--surface-raised)" : "transparent",
        border: isActive
          ? "1px solid var(--border-soft)"
          : "1px solid transparent",
        boxShadow: isActive ? "var(--shadow-soft)" : "none",
        marginBottom: 2,
        position: "relative",
      }}
    >
      <span
        style={{
          fontSize: 16,
          flexShrink: 0,
          marginTop: 1,
          color: "var(--text-muted, #9ca3af)",
        }}
      >
        <IconComponent size={16} />
      </span>
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
          {thread.title || "New Conversation"}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted, #9ca3af)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {thread.summary || "No summary yet"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
          {thread.tags && thread.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              {thread.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <span
            style={{
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
            }}
          >
            {formatDate(thread.updatedAt)}
          </span>
        </div>
      </div>

      {/* Menu button */}
      {(isHovered || menuOpen) && (
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <IconButton
            size={20}
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
            }}
            aria-label="Conversation options"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </IconButton>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              className="tz-panel"
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 4,
                overflow: "hidden",
                zIndex: 50,
                minWidth: 130,
                padding: 4,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin();
                  onMenuToggle();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  color: "var(--text-primary, #fafafa)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill={thread.pinned ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 17v5" />
                  <path d="M9 10.76V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5.76l2 3.24H7z" />
                </svg>
                {thread.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  onMenuToggle();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  color: "var(--accent-loss, #ef4444)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
