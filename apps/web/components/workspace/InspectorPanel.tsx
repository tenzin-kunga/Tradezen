"use client";

import { useMemo } from "react";
import type {
  WorkspaceResource,
  InspectorSection,
} from "@/lib/workspace/types";
import { InspectorCapability } from "@/lib/workspace/types";
import { getModuleRegistry } from "@/lib/workspace/module-registry";

interface InspectorPanelProps {
  resource: WorkspaceResource | null;
  collapsed: boolean;
  onToggle: () => void;
}

export default function InspectorPanel({
  resource,
  collapsed,
  onToggle,
}: InspectorPanelProps) {
  const sections = useMemo(() => {
    if (!resource) return [];

    const registry = getModuleRegistry();
    const allSections: InspectorSection[] = [];

    for (const mod of registry.getAll()) {
      for (const cap of mod.capabilities) {
        if (cap instanceof InspectorCapability) {
          allSections.push(...cap.sections);
        }
      }
    }

    return allSections.sort((a, b) => a.priority - b.priority);
  }, [resource]);

  if (collapsed) {
    return (
      <div
        style={{
          width: 36,
          borderLeft: "1px solid var(--border, #23252d)",
          background: "var(--bg-sidebar, #0c0c0f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onToggle}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted, #9ca3af)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Show inspector"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 280,
        borderLeft: "1px solid var(--border, #23252d)",
        background: "var(--bg-sidebar, #0c0c0f)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
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
          Inspector
        </span>
        <button
          onClick={onToggle}
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted, #9ca3af)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Hide inspector"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!resource ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            Select a resource to see inspector
          </div>
        ) : sections.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No inspector sections available
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.id} style={{ marginBottom: 16 }}>
              <div
                className="label-caps"
                style={{
                  color: "var(--text-dim, #6b7280)",
                  marginBottom: 6,
                }}
              >
                {section.title}
              </div>
              <section.component resource={resource} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
