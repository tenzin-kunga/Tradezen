"use client";

import { useEffect, useState } from "react";
import type { KnowledgeDocument } from "@/lib/api/knowledge";
import { getKnowledgeLinks, type KnowledgeLink } from "@/lib/api/knowledge";

export default function KnowledgeSourcesInspector({
  document,
}: {
  document: KnowledgeDocument;
}) {
  const [links, setLinks] = useState<KnowledgeLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKnowledgeLinks(document.id)
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [document.id]);

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12 }}>
      {links.length === 0 ? (
        <div style={{ color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
          No sources linked yet.
        </div>
      ) : (
        links.map((link) => (
          <div
            key={link.id}
            style={{
              padding: "6px 0",
              borderBottom: "1px solid var(--border, #23252d)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--text-secondary, #d1d5db)" }}>
              {link.targetDocumentId.slice(0, 8)}...
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-dim, #6b7280)",
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--bg-surface-hover, #1a1b23)",
              }}
            >
              {link.relationshipType}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
