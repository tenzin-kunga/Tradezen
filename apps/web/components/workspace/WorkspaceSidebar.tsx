"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getModuleRegistry } from "@/lib/workspace/module-registry";
import type { ModuleMetadata } from "@/lib/workspace/types";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const [modules, setModules] = useState<ModuleMetadata[]>([]);

  useEffect(() => {
    const registry = getModuleRegistry();
    setModules(registry.getAll().map((m) => m.metadata));
  }, []);

  const primary = modules.filter((m) => m.navGroup === "primary");
  const secondary = modules.filter((m) => m.navGroup === "secondary");
  const tools = modules.filter((m) => m.navGroup === "tools");

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
        {renderGroup(primary, pathname)}
        {secondary.length > 0 && (
          <>
            <div
              style={{
                height: 1,
                background: "var(--border, #23252d)",
                margin: "8px 12px",
              }}
            />
            {renderGroup(secondary, pathname)}
          </>
        )}
        {tools.length > 0 && (
          <>
            <div
              style={{
                height: 1,
                background: "var(--border, #23252d)",
                margin: "8px 12px",
              }}
            />
            {renderGroup(tools, pathname)}
          </>
        )}
      </nav>
    </aside>
  );
}

function renderGroup(items: ModuleMetadata[], pathname: string) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {items.map((item) => {
        const href = `/workspace/${item.id}`;
        const active = isActive(pathname, href);
        return (
          <Link
            key={item.id}
            href={href}
            className={`tz-focus ws-nav-link${active ? " active" : ""}`}
          >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
