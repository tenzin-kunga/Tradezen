"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  group: "primary" | "secondary" | "tools";
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "assistant",
    label: "Assistant",
    href: "/assistant",
    group: "primary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "journal",
    label: "Journal",
    href: "/journal",
    group: "primary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "trades",
    label: "Trades",
    href: "/trades",
    group: "primary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M3 12h18" />
        <path d="M3 18h18" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    group: "primary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-6" />
      </svg>
    ),
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    group: "secondary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const primary = NAV_ITEMS.filter((i) => i.group === "primary");
  const secondary = NAV_ITEMS.filter((i) => i.group === "secondary");

  return (
    <aside
      style={{
        width: 200,
        background: "var(--bg-sidebar, #0c0c0f)",
        borderRight: "1px solid var(--border, #23252d)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "var(--text-primary, #fafafa)",
        }}
      >
        TRADEZEN
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active
                    ? "var(--text-primary, #fafafa)"
                    : "var(--text-muted, #9ca3af)",
                  background: active
                    ? "var(--bg-surface-hover, #17181c)"
                    : "transparent",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div
          style={{
            height: 1,
            background: "var(--border, #23252d)",
            margin: "8px 12px",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {secondary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active
                    ? "var(--text-primary, #fafafa)"
                    : "var(--text-muted, #9ca3af)",
                  background: active
                    ? "var(--bg-surface-hover, #17181c)"
                    : "transparent",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
