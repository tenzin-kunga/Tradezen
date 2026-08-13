"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getKnowledgeFolders,
  createKnowledgeFolder,
  deleteKnowledgeFolder,
  type KnowledgeFolder,
} from "@/lib/api/knowledge";
import { IconButton } from "@/components/primitives/IconButton";

interface KnowledgeFolderTreeProps {
  activeFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectDocument: (id: string) => void;
  refreshTrigger: number;
}

interface FolderNode extends KnowledgeFolder {
  children: FolderNode[];
  expanded: boolean;
}

export default function KnowledgeFolderTree({
  activeFolderId,
  onSelectFolder,
  onSelectDocument,
  refreshTrigger,
}: KnowledgeFolderTreeProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      const rootFolders = await getKnowledgeFolders();
      const tree = buildTree(rootFolders, null);
      setFolders(tree);
    } catch (e) {
      console.error("Failed to load folders:", e);
    }
  }, []);

  useEffect(() => {
    loadFolders().finally(() => setLoading(false));
  }, [loadFolders, refreshTrigger]);

  function buildTree(
    all: KnowledgeFolder[],
    parentId: string | null,
  ): FolderNode[] {
    return all
      .filter((f) => f.parentId === parentId)
      .map((f) => ({
        ...f,
        children: buildTree(all, f.id),
        expanded: true,
      }));
  }

  const handleCreate = useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    try {
      await createKnowledgeFolder(trimmed);
      setNewFolderName("");
      setIsCreating(false);
      await loadFolders();
    } catch (e) {
      console.error("Failed to create folder:", e);
    }
  }, [newFolderName, loadFolders]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteKnowledgeFolder(id);
        if (activeFolderId === id) onSelectFolder(null);
        await loadFolders();
      } catch (e) {
        console.error("Failed to delete folder:", e);
      }
    },
    [activeFolderId, onSelectFolder, loadFolders],
  );

  if (loading) {
    return (
      <div
        style={{
          width: 220,
          borderRight: "1px solid var(--border, #23252d)",
          background: "var(--bg-sidebar, #0c0c0f)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "var(--text-muted, #9ca3af)",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        width: 220,
        borderRight: "1px solid var(--border-soft, #23252d)",
        background: "var(--bg-sidebar, #0c0c0f)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 40,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border, #23252d)",
        }}
      >
        <span
          className="label-caps"
          style={{ color: "var(--text-dim, #6b7280)" }}
        >
          Knowledge
        </span>
        <IconButton size={24} title="New folder" onClick={() => setIsCreating(true)}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </IconButton>
      </div>

      {/* New folder input */}
      {isCreating && (
        <div style={{ padding: "8px 12px" }}>
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewFolderName("");
              }
            }}
            onBlur={handleCreate}
            placeholder="Folder name..."
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--accent, #3b82f6)",
              background: "var(--bg-surface-hover, #1a1b23)",
              color: "var(--text-primary, #fafafa)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      )}

      {/* All Documents link */}
      <div
        onClick={() => onSelectFolder(null)}
        onMouseEnter={() => setHoveredId("root")}
        onMouseLeave={() => setHoveredId(null)}
        className={`ws-nav-link${activeFolderId === null ? " active" : ""}`}
        style={{
          padding: "8px 12px",
          margin: "4px 8px",
          fontSize: 12,
        }}
      >
        <span>📄</span>
        All Documents
      </div>

      {/* Folder tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {folders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            activeFolderId={activeFolderId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={onSelectFolder}
            onDelete={handleDelete}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function FolderNode({
  folder,
  activeFolderId,
  hoveredId,
  onHover,
  onSelect,
  onDelete,
  depth,
}: {
  folder: FolderNode;
  activeFolderId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  const isActive = folder.id === activeFolderId;
  const isHovered = folder.id === hoveredId;

  return (
    <div>
      <div
        onClick={() => onSelect(folder.id)}
        onMouseEnter={() => onHover(folder.id)}
        onMouseLeave={() => onHover(null)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 8px",
          paddingLeft: 12 + depth * 16,
          borderRadius: 6,
          cursor: "pointer",
          background: isActive
            ? "var(--bg-surface-hover, #1a1b23)"
            : "transparent",
          transition: "background 0.15s",
          marginBottom: 1,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>{folder.icon || "📁"}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive
                ? "var(--text-primary, #fafafa)"
                : "var(--text-secondary, #d1d5db)",
            }}
          >
            {folder.name}
          </span>
        </span>
        {isHovered && (
          <IconButton
            size={18}
            title="Delete folder"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder.id);
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        )}
      </div>
      {folder.expanded &&
        folder.children.map((child) => (
          <FolderNode
            key={child.id}
            folder={child}
            activeFolderId={activeFolderId}
            hoveredId={hoveredId}
            onHover={onHover}
            onSelect={onSelect}
            onDelete={onDelete}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
