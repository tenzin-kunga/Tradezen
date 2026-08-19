"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchKnowledgeDocuments,
  createKnowledgeLink,
  type KnowledgeDocument,
} from "@/lib/api/knowledge";

export default function LinkDocumentDialog({
  sourceDocument,
  onLinked,
  onClose,
}: {
  sourceDocument: KnowledgeDocument;
  onLinked: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const docs = await searchKnowledgeDocuments(q);
        setResults(
          docs.filter((d) => d.id !== sourceDocument.id).slice(0, 20),
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sourceDocument.id]);

  const handleSelect = async (doc: KnowledgeDocument) => {
    try {
      await createKnowledgeLink(sourceDocument.id, doc.id, "reference");
      onLinked();
      onClose();
    } catch (e) {
      console.error("Failed to link document:", e);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: 440,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          padding: 20,
          borderRadius: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
            marginBottom: 12,
          }}
        >
          Link to Document
        </h2>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents by title…"
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--border, #23252d)",
            background: "var(--bg-surface-hover, #1a1b23)",
            color: "var(--text-primary, #fafafa)",
            fontSize: 13,
            outline: "none",
          }}
        />

        <div style={{ flex: 1, overflowY: "auto", marginTop: 12 }}>
          {loading && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted, #9ca3af)",
                padding: "8px 0",
              }}
            >
              Searching…
            </div>
          )}

          {!loading && query.trim().length > 0 && results.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted, #9ca3af)",
                padding: "8px 0",
              }}
            >
              No matching documents.
            </div>
          )}

          {!loading &&
            results.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelect(doc)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border, #23252d)",
                  background: "transparent",
                  color: "var(--text-primary, #fafafa)",
                  cursor: "pointer",
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                {doc.title}
              </button>
            ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: "transparent",
              color: "var(--text-muted, #9ca3af)",
              border: "1px solid var(--border, #23252d)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
