"use client";

import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #9ca3af)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.4 }}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary, #fafafa)", margin: "0 0 8px" }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted, #9ca3af)", lineHeight: 1.5, maxWidth: 300, margin: "0 0 24px" }}>
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 8,
            background: "var(--accent, #3b82f6)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
