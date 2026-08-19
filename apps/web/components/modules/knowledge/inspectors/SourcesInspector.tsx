"use client";

import { useEffect, useState } from "react";
import type { KnowledgeDocument } from "@/lib/api/knowledge";
import { getKnowledgeLinks, type KnowledgeLink } from "@/lib/api/knowledge";

export default function KnowledgeSourcesInspector({
  document,
  refreshToken = 0,
}: {
  document: KnowledgeDocument;
  refreshToken?: number;
}) {
  const [links, setLinks] = useState<KnowledgeLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getKnowledgeLinks(document.id)
      .then((rows) => {
        if (!cancelled) setLinks(rows);
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document.id, refreshToken]);

  if (loading) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          padding: "8px 0",
        }}
      >
        Loading...
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div style={{ color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
        No sources linked yet.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12 }}>
      {links.map((link) => (
        <div
          key={link.id}
          style={{
            padding: "6px 0",
            borderBottom: "1px solid var(--border, #23252d)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              color: "var(--text-secondary, #d1d5db)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {link.targetTitle || "Untitled document"}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-dim, #6b7280)",
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--bg-surface-hover, #1a1b23)",
              flexShrink: 0,
            }}
          >
            {link.relationshipType}
          </span>
        </div>
      ))}
    </div>
  );
}
