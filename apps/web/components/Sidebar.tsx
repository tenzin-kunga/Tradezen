"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState, useCallback, useRef } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const GROUP1: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Trades",
    href: "/trades",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M3 12h18" />
        <path d="M3 18h18" />
        <circle cx="8" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="10" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-6" />
      </svg>
    ),
  },
  {
    label: "Journal",
    href: "/journal",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const GROUP2: NavItem[] = [
  {
    label: "Workspace",
    href: "/workspace/assistant",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
];

const GROUP3: NavItem[] = [
  {
    label: "Calendar",
    href: "/calendar",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Checklists",
    href: "/checklists",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: "Calculator",
    href: "/calculator",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10.01" />
        <line x1="12" y1="10" x2="12" y2="10.01" />
        <line x1="16" y1="10" x2="16" y2="10.01" />
        <line x1="8" y1="14" x2="8" y2="14.01" />
        <line x1="12" y1="14" x2="12" y2="14.01" />
        <line x1="16" y1="14" x2="16" y2="14.01" />
        <line x1="8" y1="18" x2="16" y2="18" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavItemLink({
  item,
  pathname,
  collapsed,
  onHoverStart,
  onHoverEnd,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onHoverStart: (label: string, rect: DOMRect) => void;
  onHoverEnd: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const active = isActive(pathname, item.href);
  return (
    <Link
      ref={ref}
      href={item.href}
      className="group relative flex items-center"
      onMouseEnter={() => {
        if (collapsed && ref.current) {
          onHoverStart(item.label, ref.current.getBoundingClientRect());
        }
      }}
      onMouseLeave={onHoverEnd}
      style={{
        height: 44,
        borderRadius: 6,
        marginLeft: collapsed ? 12 : 8,
        marginRight: collapsed ? 12 : 8,
        textDecoration: "none",
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            left: collapsed ? 0 : -8,
            top: 10,
            bottom: 10,
            width: 3,
            borderRadius: "0 2px 2px 0",
            background: "var(--accent, #3b82f6)",
            transition:
              "transform 0.2s var(--ease-spring), top 0.2s var(--ease-spring), bottom 0.2s var(--ease-spring)",
          }}
        />
      )}
      <div
        className="flex items-center gap-3 w-full"
        style={{
          position: "relative",
          paddingLeft: collapsed ? 0 : 12,
          paddingRight: 12,
          justifyContent: collapsed ? "center" : "flex-start",
          height: "100%",
          borderRadius: 6,
          background: active
            ? "var(--bg-surface-hover, #17181c)"
            : "transparent",
          transition: "background 0.15s var(--ease-out)",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            color: active
              ? "var(--text-primary, #fafafa)"
              : "var(--text-muted, #9ca3af)",
            transition:
              "color 0.15s var(--ease-out), transform 0.15s var(--ease-spring)",
            transform: active ? "scale(1.08)" : "scale(1)",
          }}
        >
          {item.icon}
        </span>
        {!collapsed && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: active
                ? "var(--text-primary, #fafafa)"
                : "var(--text-muted, #9ca3af)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "color 0.15s var(--ease-out)",
            }}
          >
            {item.label}
          </span>
        )}
      </div>
    </Link>
  );
}

function SessionIndicator() {
  const now = new Date();
  const h = now.getUTCHours();

  let session: { name: string; color: string; endHour: number } | null = null;

  if (h >= 13 && h < 18) {
    session = { name: "New York", color: "var(--accent)", endHour: 18 };
  } else if (h >= 7 && h < 13) {
    session = { name: "London", color: "var(--accent-profit)", endHour: 13 };
  } else {
    session = null;
  }

  if (!session) return null;

  const endTime = new Date(now);
  endTime.setUTCHours(session.endHour, 0, 0, 0);
  const remainingMs = endTime.getTime() - now.getTime();
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
  const hh = Math.floor(remainingMin / 60);
  const mm = remainingMin % 60;
  const remaining = `${hh}h ${mm}m remaining`;

  return (
    <div
      style={{
        padding: "6px 16px 8px",
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: "var(--bg-surface-hover)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: session.color,
            flexShrink: 0,
          }}
        />
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            {session.name}
          </div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              marginTop: 1,
            }}
          >
            {remaining}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  onClose,
  pinned,
  onPinToggle,
}: {
  onClose?: () => void;
  pinned: boolean;
  onPinToggle: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const expanded = pinned;
  const width = expanded ? 220 : 72;

  const [tooltip, setTooltip] = useState<{
    label: string;
    rect: DOMRect;
  } | null>(null);
  const logTradeRef = useRef<HTMLAnchorElement>(null);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "OP";

  const handleLogout = useCallback(() => {
    logout();
    onClose?.();
  }, [logout, onClose]);

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width,
        background: "var(--bg-sidebar, #0c0c0f)",
        borderRight: "1px solid var(--border, #23252d)",
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          paddingLeft: expanded ? 20 : 0,
          paddingRight: 12,
          flexShrink: 0,
        }}
      >
        {expanded ? (
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--text-primary, #fafafa)",
            }}
          >
            TRADEZEN
          </span>
        ) : (
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--text-primary, #fafafa)",
              width: "100%",
              textAlign: "center",
            }}
          >
            TZ
          </span>
        )}
        {expanded && (
          <button
            onClick={() => onPinToggle()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: pinned
                ? "var(--accent, #3b82f6)"
                : "var(--text-muted, #9ca3af)",
              padding: 4,
              borderRadius: 4,
              opacity: 1,
              transition:
                "opacity 0.15s var(--ease-out), color 0.15s var(--ease-out), transform 0.3s var(--ease-spring)",
              display: "flex",
              transform: pinned ? "rotate(180deg)" : "rotate(0deg)",
            }}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="17" x2="12" y2="3" />
              <path d="m9 6 3-3 3 3" />
              <path d="M5 12v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {GROUP1.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={!expanded}
              onHoverStart={(label, rect) => setTooltip({ label, rect })}
              onHoverEnd={() => setTooltip(null)}
            />
          ))}
        </div>

        <div
          style={{
            height: 1,
            background: "var(--border, #23252d)",
            margin: "12px 16px",
          }}
        />

        {expanded && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-dim, #6b7280)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "4px 16px",
            }}
          >
            Intelligence
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {GROUP2.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={!expanded}
              onHoverStart={(label, rect) => setTooltip({ label, rect })}
              onHoverEnd={() => setTooltip(null)}
            />
          ))}
        </div>

        <div
          style={{
            height: 1,
            background: "var(--border, #23252d)",
            margin: "12px 16px",
          }}
        />

        {expanded && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-dim, #6b7280)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "4px 16px",
            }}
          >
            Utilities
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {GROUP3.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={!expanded}
              onHoverStart={(label, rect) => setTooltip({ label, rect })}
              onHoverEnd={() => setTooltip(null)}
            />
          ))}
        </div>

        <div
          style={{
            height: 1,
            background: "var(--border, #23252d)",
            margin: "12px 16px",
          }}
        />

        <div style={{ padding: expanded ? "4px 12px 0" : "4px 12px 0" }}>
          <Link
            ref={logTradeRef}
            href="/add-trade"
            onClick={onClose}
            onMouseEnter={() => {
              if (!expanded && logTradeRef.current) {
                setTooltip({
                  label: "Log Trade",
                  rect: logTradeRef.current.getBoundingClientRect(),
                });
              }
            }}
            onMouseLeave={() => setTooltip(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              transition:
                "background 0.15s var(--ease-out), opacity 0.15s var(--ease-out)",
              gap: 8,
            }}
          >
            {!expanded ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Log Trade
              </>
            )}
          </Link>
        </div>
      </nav>

      {/* Session indicator */}
      {expanded && <SessionIndicator />}

      {/* User */}
      <div
        style={{
          borderTop: "1px solid var(--border, #23252d)",
          flexShrink: 0,
        }}
      >
        {expanded ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                justifyContent: "flex-start",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--border, #23252d)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted, #9ca3af)",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary, #fafafa)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.username || "Operator"}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted, #9ca3af)",
                    marginTop: 1,
                  }}
                >
                  {user?.email || ""}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted, #9ca3af)",
                  padding: 4,
                  borderRadius: 4,
                  display: "flex",
                  transition: "color 0.15s var(--ease-out)",
                }}
                aria-label="Logout"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
            <Link
              href="/settings"
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px 12px",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted, #9ca3af)",
                textDecoration: "none",
                transition: "color 0.15s var(--ease-out)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </Link>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px 0",
            }}
          >
            <div className="group relative">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--border, #23252d)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted, #9ca3af)",
                }}
              >
                {initials}
              </div>
              <div
                className="opacity-0 group-hover:opacity-100"
                style={{
                  position: "absolute",
                  left: "100%",
                  marginLeft: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 60,
                  boxShadow: "var(--shadow-md)",
                  transition: "opacity 0.15s var(--ease-out)",
                }}
              >
                {user?.username || "Operator"}
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/settings"
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  color: "var(--text-muted, #9ca3af)",
                  textDecoration: "none",
                  transition: "color 0.15s var(--ease-out)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </Link>
              <div
                className="opacity-0 group-hover:opacity-100"
                style={{
                  position: "absolute",
                  left: "100%",
                  marginLeft: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 60,
                  boxShadow: "var(--shadow-md)",
                  transition: "opacity 0.15s var(--ease-out)",
                }}
              >
                Settings
              </div>
            </div>
            <div className="group relative">
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted, #9ca3af)",
                  transition: "color 0.15s var(--ease-out)",
                }}
                aria-label="Logout"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
              <div
                className="opacity-0 group-hover:opacity-100"
                style={{
                  position: "absolute",
                  left: "100%",
                  marginLeft: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 60,
                  boxShadow: "var(--shadow-md)",
                  transition: "opacity 0.15s var(--ease-out)",
                }}
              >
                Logout
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating tooltip — rendered outside <nav> to avoid overflowX: hidden clipping */}
      {!expanded && tooltip && (
        <div
          style={{
            position: "fixed",
            left: width + 12,
            top: tooltip.rect.top + tooltip.rect.height / 2 - 14,
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 60,
            boxShadow: "var(--shadow-md)",
          }}
        >
          {tooltip.label}
        </div>
      )}
    </aside>
  );
}
