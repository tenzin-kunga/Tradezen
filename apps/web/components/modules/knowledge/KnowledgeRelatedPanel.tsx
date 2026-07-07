"use client";

import { useEffect, useState } from "react";
import {
  getRelated,
  type RelatedResult,
  type Evidence,
} from "@/lib/api/retrieval";

interface KnowledgeRelatedPanelProps {
  documentId: string;
}

const TYPE_ICONS: Record<string, string> = {
  knowledge_document: "📄",
  trade: "📈",
  journal: "📝",
  watchlist: "⭐",
  ai_insight: "🧠",
};

const SOURCE_COLORS: Record<string, string> = {
  semantic: "var(--accent, #3b82f6)",
  explicit: "var(--accent-profit, #22c55e)",
  trade: "var(--accent-warn, #f59e0b)",
  journal: "var(--accent, #3b82f6)",
};

export default function KnowledgeRelatedPanel({
  documentId,
}: KnowledgeRelatedPanelProps) {
  const [related, setRelated] = useState<RelatedResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRelated("knowledge_document", documentId, "inspector")
      .then(setRelated)
      .catch(() => setRelated([]))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
        Loading related items...
      </div>
    );
  }

  if (related.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
        No related items found.
      </div>
    );
  }

  // Group by type
  const grouped = related.reduce(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, RelatedResult[]>,
  );

  return (
    <div style={{ fontSize: 12 }}>
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-dim, #6b7280)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 4,
            }}
          >
            {TYPE_ICONS[type] || "📎"} {type.replace("_", " ")}
          </div>
          {items.map((item) => (
            <RelatedItem key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RelatedItem({ item }: { item: RelatedResult }) {
  return (
    <div
      style={{
        padding: "6px 8px",
        borderRadius: 6,
        background: "var(--bg-surface-hover, #1a1b23)",
        marginBottom: 4,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "var(--bg-surface, #12131a)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "var(--bg-surface-hover, #1a1b23)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontWeight: 500,
            color: "var(--text-primary, #fafafa)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: item.score >= 0.8 ? "var(--accent-profit, #22c55e)" : "var(--text-dim, #6b7280)",
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          {Math.round(item.score * 100)}%
        </span>
      </div>
      {item.evidence.map((ev, i) => (
        <EvidenceRow key={i} evidence={ev} />
      ))}
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: Evidence }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--text-muted, #9ca3af)",
        paddingLeft: 8,
        borderLeft: `2px solid ${SOURCE_COLORS[evidence.source] || "var(--border, #23252d)"}`,
        marginTop: 3,
      }}
    >
      {evidence.reason}
    </div>
  );
}
