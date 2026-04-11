"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    label: "NEW TRADE",
    href: "/add-trade",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="6" y="0" width="2" height="14" />
        <rect x="0" y="6" width="14" height="2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-screen"
      style={{
        width: 240,
        background: "#111111",
        borderRight: "1px solid #2a2a2a",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6">
        <span
          className="text-white font-bold tracking-widest"
          style={{ fontSize: 18, letterSpacing: "0.2em" }}
        >
          TRADEZEN
        </span>
      </div>

      {/* User Block */}
      <div
        className="mx-4 mb-4 px-3 py-3 flex items-center gap-3"
        style={{
          background: "#1c1c1c",
          border: "1px solid #2a2a2a",
        }}
      >
        <div
          className="flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            background: "#2a2a2a",
            color: "#888",
          }}
        >
          OP
        </div>
        <div>
          <div className="text-white text-xs font-bold tracking-wider">
            OPERATOR_01
          </div>
          <div className="text-xs" style={{ color: "#888" }}>
            V-2.4.0
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#2a2a2a", margin: "0 16px 8px" }} />

      {/* Nav Items */}
      <nav className="flex flex-col px-3 gap-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold tracking-widest transition-colors"
              style={{
                background: isActive ? "#ffffff" : "transparent",
                color: isActive ? "#111111" : "#888888",
                letterSpacing: "0.1em",
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
            className="flex items-center justify-center px-3 py-3 text-xs font-bold tracking-widest transition-colors"
            style={{
              background: "#ffffff",
              color: "#111111",
              letterSpacing: "0.15em",
            }}
          >
            LOG TRADE
          </Link>
        </div>
      </nav>

      {/* Bottom Controls */}
      <div
        className="px-3 py-4 flex flex-col gap-1"
        style={{ borderTop: "1px solid #2a2a2a" }}
      >
        <button
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-widest w-full text-left"
          style={{ color: "#888", letterSpacing: "0.1em" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="7" cy="7" r="2.5" />
            <path d="M7 0v2M7 12v2M0 7h2M12 7h2M2.1 2.1l1.4 1.4M10.5 10.5l1.4 1.4M10.5 2.1l-1.4 1.4M3.5 10.5l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          SETTINGS
        </button>
        <button
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-widest w-full text-left"
          style={{ color: "#888", letterSpacing: "0.1em" }}
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
