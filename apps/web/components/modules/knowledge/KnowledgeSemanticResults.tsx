"use client";

import { useEffect, useState } from "react";
import { semanticSearch, type RelatedResult } from "@/lib/api/retrieval";

interface KnowledgeSemanticResultsProps {
  query: string;
  onSelect: (id: string, type: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  knowledge_document: "📄",
  trade: "📈",
  journal: "📝",
  ai_insight: "🧠",
};

export default function KnowledgeSemanticResults({
  query,
  onSelect,
}: KnowledgeSemanticResultsProps) {
  const [results, setResults] = useState<RelatedResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      semanticSearch(query, "fast")
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
        Searching...
      </div>
    );
  }

  if (results.length === 0 && query.length >= 2) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)", padding: "8px 0" }}>
        No results found.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12 }}>
      {results.map((result) => (
        <div
          key={result.id}
          onClick={() => onSelect(result.id, result.type)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            cursor: "pointer",
            marginBottom: 4,
            transition: "background 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--bg-surface-hover, #1a1b23)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span>{TYPE_ICONS[result.type] || "📎"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 500,
                color: "var(--text-primary, #fafafa)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {result.title}
            </div>
            {result.evidence[0] && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted, #9ca3af)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {result.evidence[0].reason}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: result.score >= 0.8 ? "var(--accent-profit, #22c55e)" : "var(--text-dim, #6b7280)",
              flexShrink: 0,
            }}
          >
            {Math.round(result.score * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
