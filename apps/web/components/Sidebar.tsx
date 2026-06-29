"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState, useCallback, useEffect } from "react";

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
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className="group relative flex items-center"
      style={{
        height: 36,
        borderRadius: 6,
        marginLeft: collapsed ? 12 : 8,
        marginRight: collapsed ? 12 : 8,
        textDecoration: "none",
        transition: "background 0.15s",
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            left: collapsed ? 0 : -8,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: "0 2px 2px 0",
            background: "var(--accent, #3b82f6)",
          }}
        />
      )}
      <div
        className="flex items-center gap-3 w-full"
        style={{
          paddingLeft: collapsed ? 0 : 12,
          paddingRight: 12,
          justifyContent: collapsed ? "center" : "flex-start",
          height: "100%",
          borderRadius: 6,
          background: active
            ? "var(--bg-surface-hover, #17181c)"
            : "transparent",
          transition: "background 0.15s",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            color: active
              ? "var(--text-primary, #fafafa)"
              : "var(--text-muted, #9ca3af)",
            transition: "color 0.15s",
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
              transition: "color 0.15s",
            }}
          >
            {item.label}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tradezen-sidebar-pinned");
    if (stored === "true") setPinned(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("tradezen-sidebar-pinned", String(pinned));
  }, [pinned]);
  const [hovered, setHovered] = useState(false);

  const expanded = pinned || hovered;
  const width = expanded ? 220 : 72;

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width,
        background: "var(--bg-sidebar, #0c0c0f)",
        borderRight: "1px solid var(--border, #23252d)",
        overflow: "hidden",
        transition: "width 0.2s ease",
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
            onClick={() => setPinned((p) => !p)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: pinned
                ? "var(--accent, #3b82f6)"
                : "var(--text-muted, #9ca3af)",
              padding: 4,
              borderRadius: 4,
              opacity: hovered ? 1 : pinned ? 1 : 0,
              transition: "opacity 0.15s, color 0.15s",
              display: "flex",
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
        {/* Group 1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {GROUP1.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={!expanded}
            />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "var(--border, #23252d)",
            margin: "12px 16px",
          }}
        />

        {/* Group 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {GROUP2.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={!expanded}
            />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "var(--border, #23252d)",
            margin: "12px 16px",
          }}
        />

        {/* Log Trade CTA */}
        <div style={{ padding: expanded ? "4px 12px 0" : "4px 12px 0" }}>
          <Link
            href="/add-trade"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: expanded ? "center" : "center",
              height: 36,
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              transition: "background 0.15s",
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

      {/* User */}
      <div
        style={{ borderTop: "1px solid var(--border, #23252d)", flexShrink: 0 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: expanded ? "12px 16px" : "12px 0",
            justifyContent: expanded ? "flex-start" : "center",
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
          {expanded && (
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
          )}
          {expanded && (
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
          )}
        </div>
        {expanded && (
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
        )}
      </div>
    </aside>
  );
}
