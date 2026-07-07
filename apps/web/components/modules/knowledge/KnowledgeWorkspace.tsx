"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getKnowledgeDocuments,
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  type KnowledgeDocument,
} from "@/lib/api/knowledge";
import { KNOWLEDGE_TEMPLATES } from "@/lib/knowledge/templates";
import KnowledgeFolderTree from "./KnowledgeFolderTree";
import KnowledgeDocumentView from "./KnowledgeDocument";
import KnowledgeInspector from "./KnowledgeInspector";

export default function KnowledgeWorkspace() {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showNewDoc, setShowNewDoc] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getKnowledgeDocuments(activeFolderId || undefined);
      setDocuments(docs);
    } catch (e) {
      console.error("Failed to load documents:", e);
    }
  }, [activeFolderId]);

  useEffect(() => {
    loadDocuments().finally(() => setLoading(false));
  }, [loadDocuments, refreshTrigger]);

  const handleCreateDocument = useCallback(
    async (title: string, templateId?: string) => {
      try {
        const template = templateId ? KNOWLEDGE_TEMPLATES.find((t) => t.id === templateId) : null;
        const doc = await createKnowledgeDocument({
          title,
          folder_id: activeFolderId || undefined,
          content: template?.content || "",
          doc_type: template?.docType || "note",
          template_id: templateId,
        });
        setActiveDocumentId(doc.id);
        setShowNewDoc(false);
        setRefreshTrigger((t) => t + 1);
      } catch (e) {
        console.error("Failed to create document:", e);
      }
    },
    [activeFolderId],
  );

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      try {
        await deleteKnowledgeDocument(id);
        if (activeDocumentId === id) setActiveDocumentId(null);
        setRefreshTrigger((t) => t + 1);
      } catch (e) {
        console.error("Failed to delete document:", e);
      }
    },
    [activeDocumentId],
  );

  const activeDocument = documents.find((d) => d.id === activeDocumentId) || null;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted, #9ca3af)",
          fontSize: 12,
          letterSpacing: "0.1em",
        }}
      >
        LOADING KNOWLEDGE...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: Folder tree */}
      <KnowledgeFolderTree
        activeFolderId={activeFolderId}
        onSelectFolder={(id) => {
          setActiveFolderId(id);
          setActiveDocumentId(null);
        }}
        onSelectDocument={setActiveDocumentId}
        refreshTrigger={refreshTrigger}
      />

      {/* Center: Document list or document view */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {activeDocument ? (
          <KnowledgeDocumentView
            document={activeDocument}
            onUpdate={() => setRefreshTrigger((t) => t + 1)}
            onDelete={() => handleDeleteDocument(activeDocument.id)}
          />
        ) : (
          <DocumentList
            documents={documents}
            onSelect={setActiveDocumentId}
            onDelete={handleDeleteDocument}
            onNew={() => setShowNewDoc(true)}
          />
        )}
      </div>

      {/* Right: Inspector */}
      <KnowledgeInspector
        document={activeDocument}
        collapsed={inspectorCollapsed}
        onToggle={() => setInspectorCollapsed(!inspectorCollapsed)}
      />

      {/* New document modal */}
      {showNewDoc && (
        <NewDocumentModal
          onCreate={handleCreateDocument}
          onClose={() => setShowNewDoc(false)}
        />
      )}
    </div>
  );
}

function DocumentList({
  documents,
  onSelect,
  onDelete,
  onNew,
}: {
  documents: KnowledgeDocument[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const DOC_TYPE_ICONS: Record<string, string> = {
    thesis: "📈",
    analysis: "📊",
    playbook: "📋",
    macro: "🌍",
    note: "📝",
    snapshot: "🏢",
    postmortem: "🔍",
  };

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
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #fafafa)" }}>
          Documents
        </span>
        <button
          onClick={onNew}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            background: "var(--accent, #3b82f6)",
            color: "#fff",
            border: "none",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New
        </button>
      </div>

      {/* Document list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {documents.length === 0 ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: "var(--text-muted, #9ca3af)",
              fontSize: 13,
            }}
          >
            No documents yet. Click "+ New" to create one.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              onMouseEnter={() => setHoveredId(doc.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="glass-card"
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                cursor: "pointer",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "border-color 0.15s",
                border: "1px solid transparent",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "var(--border, #23252d)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{DOC_TYPE_ICONS[doc.docType] || "📝"}</span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary, #fafafa)",
                    }}
                  >
                    {doc.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim, #6b7280)", marginTop: 2 }}>
                    {doc.docType} · {doc.status} · v{doc.currentVersion}
                  </div>
                </div>
              </div>
              {hoveredId === doc.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.id);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted, #9ca3af)",
                  }}
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewDocumentModal({
  onCreate,
  onClose,
}: {
  onCreate: (title: string, templateId?: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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
          width: 480,
          maxHeight: "80vh",
          overflow: "auto",
          padding: 24,
          borderRadius: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
            marginBottom: 16,
          }}
        >
          New Document
        </h2>

        {/* Title input */}
        <div style={{ marginBottom: 16 }}>
          <label
            className="label-caps"
            style={{ display: "block", marginBottom: 6, color: "var(--text-dim, #6b7280)" }}
          >
            TITLE
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
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
        </div>

        {/* Template selection */}
        <div style={{ marginBottom: 20 }}>
          <label
            className="label-caps"
            style={{ display: "block", marginBottom: 8, color: "var(--text-dim, #6b7280)" }}
          >
            TEMPLATE (OPTIONAL)
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {KNOWLEDGE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background:
                    selectedTemplate === t.id
                      ? "var(--bg-surface-hover, #1a1b23)"
                      : "transparent",
                  border:
                    selectedTemplate === t.id
                      ? "1px solid var(--accent, #3b82f6)"
                      : "1px solid var(--border, #23252d)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  color:
                    selectedTemplate === t.id
                      ? "var(--text-primary, #fafafa)"
                      : "var(--text-muted, #9ca3af)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
          <button
            onClick={() => {
              if (title.trim()) {
                onCreate(title.trim(), selectedTemplate || undefined);
              }
            }}
            disabled={!title.trim()}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: title.trim() ? "var(--accent, #3b82f6)" : "var(--bg-surface-hover, #1a1b23)",
              color: title.trim() ? "#fff" : "var(--text-muted, #9ca3af)",
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: title.trim() ? "pointer" : "default",
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
