"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./NotificationBell";

const navItems = [
  {
    label: "OVERVIEW",
    href: "/",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="0" y="0" width="6" height="6" />
        <rect x="8" y="0" width="6" height="6" />
        <rect x="0" y="8" width="6" height="6" />
        <rect x="8" y="8" width="6" height="6" />
      </svg>
    ),
  },
  {
    label: "TRADE LOG",
    href: "/trades",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="0" y="1" width="14" height="2" />
        <rect x="0" y="6" width="14" height="2" />
        <rect x="0" y="11" width="14" height="2" />
      </svg>
    ),
  },
  {
    label: "ANALYTICS",
    href: "/analytics",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="0" y="8" width="3" height="6" />
        <rect x="4" y="5" width="3" height="9" />
        <rect x="8" y="2" width="3" height="12" />
        <rect x="12" y="0" width="2" height="14" />
      </svg>
    ),
  },
  {
    label: "JOURNAL",
    href: "/journal",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="0" y="0" width="14" height="2" />
        <rect x="0" y="4" width="10" height="2" />
        <rect x="0" y="8" width="12" height="2" />
        <rect x="0" y="12" width="8" height="2" />
      </svg>
    ),
  },
  {
    label: "NEW TRADE",
    href: "/add-trade",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="6" y="0" width="2" height="14" />
        <rect x="0" y="6" width="14" height="2" />
      </svg>
    ),
  },
  {
    label: "REPORTS",
    href: "/reports",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="0" y="2" width="12" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="3" y1="6" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" />
        <line x1="7" y1="4" x2="7" y2="10" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11" y1="7" x2="11" y2="10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "OP";

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside
      className="flex flex-col h-screen md:h-auto"
      style={{
        width: 240,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo + close button */}
      <div className="px-6 py-6 flex items-center justify-between">
        <span
          className="font-bold tracking-widest"
          style={{ fontSize: 18, letterSpacing: "0.2em", color: "var(--text-primary)" }}
        >
          TRADEZEN
        </span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={onClose}
            className="md:hidden p-1"
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* User Block */}
      <Link
        href="/settings"
        onClick={handleNavClick}
        className="mx-4 mb-4 px-3 py-3 flex items-center gap-3"
        style={{
          background: pathname === "/settings" ? "var(--border-hover)" : "var(--bg-glass)",
          border: "1px solid var(--border)",
          textDecoration: "none",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        <div
          className="flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            background: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {initials}
        </div>
        <div>
          <div className="text-xs font-bold tracking-wider" style={{ color: "var(--text-primary)" }}>
            {user?.username?.toUpperCase() || "OPERATOR"}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            V-2.4.0
          </div>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "0 16px 8px" }} />

      {/* Nav Items */}
      <nav className="flex flex-col px-3 gap-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold tracking-widest transition-colors"
              style={{
                background: isActive ? "var(--text-primary)" : "transparent",
                color: isActive ? "var(--bg-primary)" : "var(--text-muted)",
                letterSpacing: "0.1em",
                textDecoration: "none",
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* LOG TRADE CTA */}
        <div style={{ marginTop: 24 }}>
          <Link
            href="/add-trade"
            onClick={handleNavClick}
            className="flex items-center justify-center px-3 py-3 text-xs font-bold tracking-widest transition-colors"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-primary)",
              letterSpacing: "0.15em",
              textDecoration: "none",
            }}
          >
            LOG TRADE
          </Link>
        </div>
      </nav>

      {/* Bottom Controls */}
      <div
        className="px-3 py-4 flex flex-col gap-1"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <button
          onClick={() => { logout(); onClose?.(); }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-widest w-full text-left"
          style={{
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M5 2H2v10h3v1H1V1h4V2z" />
            <path d="M9 4l4 3-4 3V8H5V6h4V4z" />
          </svg>
          LOGOUT
        </button>
      </div>
    </aside>
  );
}
