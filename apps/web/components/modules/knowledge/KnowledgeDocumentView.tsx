"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  updateKnowledgeDocument,
  getKnowledgeVersions,
  uploadKnowledgeAsset,
  type KnowledgeDocument,
  type KnowledgeVersion,
} from "@/lib/api/knowledge";
import KnowledgeAIChat from "./KnowledgeAIChat";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Badge } from "@/components/primitives/Badge";

interface KnowledgeDocumentViewProps {
  document: KnowledgeDocument;
  onUpdate: () => void;
  onDelete: () => void;
  onAssetUploaded?: () => void;
}

export default function KnowledgeDocumentView({
  document: doc,
  onUpdate,
  onDelete,
  onAssetUploaded,
}: KnowledgeDocumentViewProps) {
  const [content, setContent] = useState(doc.content || "");
  const [title, setTitle] = useState(doc.title);
  const [saving, setSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<KnowledgeVersion | null>(
    null,
  );
  const assetInputRef = useRef<HTMLInputElement>(null);

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

  const openVersions = useCallback(async () => {
    try {
      const vs = await getKnowledgeVersions(doc.id);
      setVersions(vs);
      setSelectedVersion(null);
      setShowVersions(true);
    } catch (e) {
      console.error("Failed to load versions:", e);
    }
  }, [doc.id]);

  const handleRestore = useCallback(
    async (version: KnowledgeVersion) => {
      try {
        await updateKnowledgeDocument(doc.id, { content: version.content });
        setShowVersions(false);
        onUpdate();
      } catch (e) {
        console.error("Failed to restore version:", e);
      }
    },
    [doc.id, onUpdate],
  );

  const handleAssetFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        await uploadKnowledgeAsset(doc.id, file);
        onAssetUploaded?.();
      } catch (err) {
        console.error("Failed to upload asset:", err);
      }
    },
    [doc.id, onAssetUploaded],
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
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
          <Badge tone="neutral">{doc.docType}</Badge>
          <Badge tone={doc.status === "active" ? "profit" : "warn"}>
            {doc.status}
          </Badge>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={() => assetInputRef.current?.click()}>
            📎 Attach
          </Button>
          <input
            ref={assetInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleAssetFile}
          />
          <Button
            variant={showChat ? "primary" : "ghost"}
            size="sm"
            onClick={() => setShowChat(!showChat)}
          >
            💬 AI
          </Button>
          <Button
            variant={isPreview ? "primary" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? "Edit" : "Preview"}
          </Button>
          <Button
            variant={showVersions ? "primary" : "ghost"}
            size="sm"
            onClick={openVersions}
          >
            Versions
          </Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Content + Chat */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Editor */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {isPreview ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
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
        <span>
          v{doc.currentVersion} · {content.split(/\s+/).filter(Boolean).length}{" "}
          words
        </span>
        <span>{content.length} chars</span>
      </div>

      {/* Version history slide-over */}
      {showVersions && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 340,
            borderLeft: "1px solid var(--border, #23252d)",
            background: "var(--bg-sidebar, #0c0c0f)",
            display: "flex",
            flexDirection: "column",
            zIndex: 20,
          }}
        >
          <div
            style={{
              height: 40,
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border, #23252d)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary, #d1d5db)",
              }}
            >
              Version History
            </span>
            <IconButton
              size={24}
              title="Close version history"
              onClick={() => setShowVersions(false)}
            >
              ✕
            </IconButton>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {!selectedVersion ? (
              versions.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted, #9ca3af)",
                    padding: "8px 0",
                  }}
                >
                  No versions yet.
                </div>
              ) : (
                versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
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
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>v{v.version}</span>
                      <span style={{ color: "var(--text-dim, #6b7280)" }}>
                        {new Date(v.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted, #9ca3af)",
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.content.slice(0, 80)}
                      {v.content.length > 80 ? "…" : ""}
                    </div>
                  </button>
                ))
              )
            ) : (
              <div>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setSelectedVersion(null)}
                   style={{ marginBottom: 8 }}
                 >
                   ← Back to versions
                 </Button>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim, #6b7280)",
                    marginBottom: 8,
                  }}
                >
                  v{selectedVersion.version} ·{" "}
                  {new Date(selectedVersion.createdAt).toLocaleString()}
                </div>
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    maxHeight: 240,
                    overflowY: "auto",
                    border: "1px solid var(--border, #23252d)",
                    borderRadius: 6,
                    padding: 8,
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedVersion.content}
                  </ReactMarkdown>
                </div>
                 <Button
                   variant="primary"
                   size="sm"
                   onClick={() => handleRestore(selectedVersion)}
                   style={{ marginTop: 12, width: "100%" }}
                 >
                   Restore this version
                 </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
