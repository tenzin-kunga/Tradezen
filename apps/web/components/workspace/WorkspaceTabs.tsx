"use client";

import { useCallback, useState } from "react";
import type { Tab } from "@/lib/workspace/types";

interface WorkspaceTabsProps {
  tabs: Tab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onPin: (id: string) => void;
}

function TabItem({
  tab,
  isActive,
  isHovered,
  onHover,
  onLeave,
  onSelect,
  onClose,
  onPin,
}: {
  tab: Tab;
  isActive: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onClose: () => void;
  onPin: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="tz-focus"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 6px 0 10px",
        borderRadius: 8,
        cursor: "pointer",
        background: isActive ? "var(--surface-raised)" : "transparent",
        border: isActive
          ? "1px solid var(--border-strong)"
          : "1px solid transparent",
        boxShadow: isActive ? "var(--shadow-soft)" : "none",
        transition: "background 0.12s var(--ease-out), border-color 0.12s",
        flexShrink: 0,
        maxWidth: 180,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          color: isActive
            ? "var(--text-primary, #fafafa)"
            : "var(--text-muted, #9ca3af)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
        }}
      >
        {tab.resource.title}
      </span>
      {(isHovered || isActive) && tab.closable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim, #6b7280)",
            flexShrink: 0,
            padding: 0,
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
        </button>
      )}
      {tab.pinned && (
        <span
          title="Pinned"
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: "var(--accent)",
            flexShrink: 0,
            boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
          }}
        />
      )}
    </div>
  );
}

export default function WorkspaceTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
  onPin,
}: WorkspaceTabsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (tabs.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 40,
        padding: "0 12px",
        borderBottom: "1px solid var(--border, #23252d)",
        overflowX: "auto",
        overflowY: "hidden",
        background: "var(--bg-primary, #0a0a0f)",
      }}
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeId}
          isHovered={tab.id === hoveredId}
          onHover={() => setHoveredId(tab.id)}
          onLeave={() => setHoveredId(null)}
          onSelect={() => onSelect(tab.id)}
          onClose={() => onClose(tab.id)}
          onPin={() => onPin(tab.id)}
        />
      ))}
    </div>
  );
}
