"use client";

import { NotificationBell } from "./NotificationBell";

export default function TopBar({
  onSearchClick,
}: {
  onSearchClick?: () => void;
}) {
  return (
    <header
      style={{
        height: 48,
        borderBottom: "1px solid var(--border, #23252d)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 20px",
        gap: 12,
        flexShrink: 0,
        background: "var(--bg-primary, #09090b)",
      }}
    >
      {/* Search */}
      <button
        onClick={onSearchClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 6,
          background: "var(--bg-surface, #111214)",
          border: "1px solid var(--border, #23252d)",
          color: "var(--text-muted, #9ca3af)",
          fontSize: 12,
          width: 180,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span style={{ color: "var(--text-muted, #9ca3af)" }}>Search</span>
        <kbd
          style={{
            marginLeft: "auto",
            fontSize: 9,
            padding: "1px 4px",
            borderRadius: 3,
            background: "var(--bg-surface-hover, #17181c)",
            color: "var(--text-dim, #6b7280)",
            border: "1px solid var(--border, #23252d)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.05em",
          }}
        >
          Ctrl+K
        </kbd>
      </button>

      {/* Notifications */}
      <NotificationBell />
    </header>
  );
}
