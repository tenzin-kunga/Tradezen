"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  updateKnowledgeDocument,
  type KnowledgeDocument,
} from "@/lib/api/knowledge";
import KnowledgeAIChat from "./KnowledgeAIChat";

interface KnowledgeDocumentViewProps {
  document: KnowledgeDocument;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function KnowledgeDocumentView({
  document: doc,
  onUpdate,
  onDelete,
}: KnowledgeDocumentViewProps) {
  const [content, setContent] = useState(doc.content || "");
  const [title, setTitle] = useState(doc.title);
  const [saving, setSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Sync when document changes
  useEffect(() => {
    setContent(doc.content || "");
    setTitle(doc.title);
  }, [doc.id, doc.content, doc.title]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateKnowledgeDocument(doc.id, { title, content });
      onUpdate();
    } catch (e) {
      console.error("Failed to save:", e);
    }
    setSaving(false);
  }, [doc.id, title, content, onUpdate]);

  // Auto-save on blur
  const handleBlur = useCallback(() => {
    if (content !== doc.content || title !== doc.title) {
      handleSave();
    }
  }, [content, title, doc.content, doc.title, handleSave]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          height: 40,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border, #23252d)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary, #fafafa)",
              width: 300,
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: "var(--text-dim, #6b7280)",
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--bg-surface-hover, #1a1b23)",
            }}
          >
            {doc.docType}
          </span>
          <span
            style={{
              fontSize: 10,
              color: doc.status === "active" ? "var(--accent-profit, #22c55e)" : "var(--text-dim, #6b7280)",
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--bg-surface-hover, #1a1b23)",
            }}
          >
            {doc.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: showChat ? "var(--accent, #3b82f6)" : "transparent",
              color: showChat ? "#fff" : "var(--text-muted, #9ca3af)",
              border: "1px solid var(--border, #23252d)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            💬 AI
          </button>
          <button
            onClick={() => setIsPreview(!isPreview)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: isPreview ? "var(--accent, #3b82f6)" : "transparent",
              color: isPreview ? "#fff" : "var(--text-muted, #9ca3af)",
              border: "1px solid var(--border, #23252d)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {isPreview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              border: "none",
              fontSize: 11,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Content + Chat */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Editor */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {isPreview ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              placeholder="Start writing in Markdown..."
              style={{
                width: "100%",
                height: "100%",
                minHeight: 400,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary, #fafafa)",
                fontSize: 14,
                lineHeight: 1.7,
                resize: "none",
                fontFamily: "var(--font-mono, monospace)",
              }}
            />
          )}
        </div>

        {/* AI Chat panel */}
        {showChat && (
          <div
            style={{
              width: 360,
              borderLeft: "1px solid var(--border, #23252d)",
              flexShrink: 0,
            }}
          >
            <KnowledgeAIChat document={doc} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          height: 28,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid var(--border, #23252d)",
          fontSize: 10,
          color: "var(--text-dim, #6b7280)",
          flexShrink: 0,
        }}
      >
        <span>v{doc.currentVersion} · {content.split(/\s+/).filter(Boolean).length} words</span>
        <span>{content.length} chars</span>
      </div>
    </div>
  );
}
