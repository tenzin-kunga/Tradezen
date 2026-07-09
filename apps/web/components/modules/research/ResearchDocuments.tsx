"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ResearchDocument,
  type DocumentCategory,
  listResearchAssets,
  uploadResearchAsset,
  deleteResearchAsset,
  DOCUMENT_CATEGORIES,
} from "@/lib/api/research";

type SortKey = "newest" | "oldest" | "name" | "category";

function iconFor(mime: string): string {
  if (mime.startsWith("image/")) return "🖼";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("csv") ||
    mime.includes("excel")
  )
    return "📊";
  if (mime.includes("pdf")) return "📄";
  return "📄";
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ResearchDocuments({
  project,
  onChanged,
}: {
  project: { id: string };
  onChanged: () => void;
}) {
  const [docs, setDocs] = useState<ResearchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [collapsed, setCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingCategory, setPendingCategory] =
    useState<DocumentCategory>("other");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await listResearchAssets(project.id);
      setDocs(d);
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = docs
    .filter(
      (d) =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.category.includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.uploadedAt.localeCompare(b.uploadedAt);
        case "name":
          return a.name.localeCompare(b.name);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return b.uploadedAt.localeCompare(a.uploadedAt);
      }
    });

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await uploadResearchAsset(project.id, file, pendingCategory);
      await load();
      onChanged();
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResearchAsset(project.id, id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      onChanged();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div
      style={{
        marginTop: 24,
        borderTop: "1px solid var(--border, #23252d)",
        paddingTop: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-primary, #fafafa)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {collapsed ? "▸" : "▾"} Documents ({docs.length})
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--bg-surface-hover, #1a1b23)",
              color: "var(--text-primary, #fafafa)",
              border: "1px solid var(--border, #23252d)",
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
            <option value="category">Category</option>
          </select>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              border: "none",
              fontSize: 11,
              fontWeight: 600,
              cursor: uploading ? "default" : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "+ Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {!collapsed && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            style={{ ...inputStyle, marginBottom: 10 }}
          />

          {loading ? (
            <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)" }}>
              Loading...
            </div>
          ) : visible.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted, #9ca3af)",
                padding: "8px 0",
              }}
            >
              No documents yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {visible.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border, #23252d)",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{iconFor(d.mimeType)}</span>
                  <a
                    href={d.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textDecoration: "none",
                      color: "var(--text-primary, #fafafa)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim, #6b7280)",
                      }}
                    >
                      {d.category.replace(/_/g, " ")} • {formatSize(d.size)} •{" "}
                      {formatDate(d.uploadedAt)}
                    </div>
                  </a>
                  <button
                    onClick={() => handleDelete(d.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted, #9ca3af)",
                      fontSize: 14,
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
            }}
          >
            Category for next upload:{" "}
            <select
              value={pendingCategory}
              onChange={(e) =>
                setPendingCategory(e.target.value as DocumentCategory)
              }
              style={{
                fontSize: 11,
                padding: "1px 4px",
                borderRadius: 4,
                background: "var(--bg-surface-hover, #1a1b23)",
                color: "var(--text-primary, #fafafa)",
                border: "1px solid var(--border, #23252d)",
              }}
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border, #23252d)",
  background: "var(--bg-surface-hover, #1a1b23)",
  color: "var(--text-primary, #fafafa)",
  fontSize: 12,
  outline: "none",
};
