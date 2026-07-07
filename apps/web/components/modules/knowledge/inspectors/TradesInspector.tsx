"use client";

import type { KnowledgeDocument } from "@/lib/api/knowledge";

export default function KnowledgeTradesInspector({
  document,
}: {
  document: KnowledgeDocument;
}) {
  return (
    <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
      Related trades will appear here based on symbol references and tags.
    </div>
  );
}
