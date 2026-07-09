"use client";

import type { KnowledgeDocument } from "@/lib/api/knowledge";

export default function KnowledgeInsightsInspector({
  document,
}: {
  document: KnowledgeDocument;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "var(--text-muted, #9ca3af)",
        padding: "8px 0",
      }}
    >
      {document.aiSummary ||
        "No AI summary yet. Ask the AI chat to summarize this document."}
    </div>
  );
}
