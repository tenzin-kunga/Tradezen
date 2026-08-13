"use client";

import { useEffect, useState } from "react";
import type { KnowledgeDocument } from "@/lib/api/knowledge";
import { getRelated, type RelatedResult } from "@/lib/api/retrieval";

export default function KnowledgeTradesInspector({
  document,
}: {
  document: KnowledgeDocument;
}) {
  const [trades, setTrades] = useState<RelatedResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRelated("knowledge_document", document.id, "inspector")
      .then((results) => {
        if (!cancelled) {
          setTrades(results.filter((r) => r.type === "trade"));
        }
      })
      .catch(() => {
        if (!cancelled) setTrades([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  if (loading) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          padding: "8px 0",
        }}
      >
        Loading related trades…
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          padding: "8px 0",
        }}
      >
        No related trades yet. Trades referencing this document&apos;s symbols
        or tags will appear here.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12 }}>
      {trades.map((trade) => (
        <div
          key={trade.id}
          style={{
            padding: "8px 0",
            borderBottom: "1px solid var(--border, #23252d)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: "var(--text-secondary, #d1d5db)" }}>
              {trade.title}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-dim, #6b7280)",
                flexShrink: 0,
              }}
            >
              {Math.round(trade.score * 100)}%
            </span>
          </div>
          {trade.evidence?.length > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "var(--text-muted, #9ca3af)",
                lineHeight: 1.4,
              }}
            >
              {trade.evidence[0].highlights?.[0] ??
                trade.evidence[0].reason ??
                ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
