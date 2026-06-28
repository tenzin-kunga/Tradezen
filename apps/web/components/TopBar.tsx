"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";

export default function TopBar({ onSearchClick }: { onSearchClick?: () => void }) {
  const { user, logout } = useAuth();

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "OP";

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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* User Avatar */}
      <div className="group" style={{ position: "relative" }}>
        <button
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--border, #23252d)",
            border: "1px solid var(--border, #23252d)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-muted, #9ca3af)",
          }}
          aria-label="User menu"
        >
          {initials}
        </button>
        <div
          className="hidden group-hover:block"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            width: 160,
            background: "var(--bg-surface, #111214)",
            border: "1px solid var(--border, #23252d)",
            borderRadius: 8,
            padding: 4,
            zIndex: 50,
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border, #23252d)", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #fafafa)" }}>
              {user?.username || "Operator"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted, #9ca3af)", marginTop: 2 }}>
              {user?.email || ""}
            </div>
          </div>
          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "var(--text-primary, #fafafa)",
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              background: "none",
              border: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              borderRadius: 4,
              fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
