"use client";

import type { WorkspaceResource } from "@/lib/workspace/types";

interface BreadcrumbsProps {
  resource: WorkspaceResource | null;
}

export default function Breadcrumbs({ resource }: BreadcrumbsProps) {
  if (!resource) return null;

  const parts = [
    resource.type.charAt(0).toUpperCase() + resource.type.slice(1),
    resource.title,
  ];

  return (
    <div
      style={{
        height: 28,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: "var(--text-muted, #9ca3af)",
        borderBottom: "1px solid var(--border, #23252d)",
        flexShrink: 0,
      }}
    >
      {parts.map((part, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ opacity: 0.5 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          <span
            style={{
              color:
                i === parts.length - 1
                  ? "var(--text-primary, #fafafa)"
                  : "var(--text-muted, #9ca3af)",
              fontWeight: i === parts.length - 1 ? 500 : 400,
            }}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}
