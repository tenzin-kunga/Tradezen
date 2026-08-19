"use client";

import { useState } from "react";
import type { KnowledgeDocument } from "@/lib/api/knowledge";
import KnowledgeRelatedPanel from "./KnowledgeRelatedPanel";
import KnowledgeInsightsInspector from "./inspectors/InsightsInspector";
import KnowledgeTradesInspector from "./inspectors/TradesInspector";
import KnowledgeSourcesInspector from "./inspectors/SourcesInspector";
import KnowledgeAssetsInspector from "./inspectors/AssetsInspector";
import LinkDocumentDialog from "./LinkDocumentDialog";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Badge } from "@/components/primitives/Badge";

interface KnowledgeInspectorProps {
  document: KnowledgeDocument | null;
  collapsed: boolean;
  onToggle: () => void;
  assetRefreshToken?: number;
}

export default function KnowledgeInspector({
  document: doc,
  collapsed,
  onToggle,
  assetRefreshToken = 0,
}: KnowledgeInspectorProps) {
  if (collapsed) {
    return (
      <div
        style={{
          width: 36,
          borderLeft: "1px solid var(--border-soft, #23252d)",
          background: "var(--bg-sidebar, #0c0c0f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IconButton size={28} title="Show inspector" onClick={onToggle}>
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
        </IconButton>
      </div>
    );
  }

  const [linkRefresh, setLinkRefresh] = useState(0);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  return (
    <div
        style={{
          width: 280,
          borderLeft: "1px solid var(--border-soft, #23252d)",
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
        <IconButton size={24} title="Hide inspector" onClick={onToggle}>
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
        </IconButton>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!doc ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            Select a document to see details
          </div>
        ) : (
          <>
            <InspectorSection title="Metadata">
              <div style={{ fontSize: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                    Type
                  </span>
                  <Badge tone="neutral">{doc.docType}</Badge>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                    Status
                  </span>
                  <Badge tone={doc.status === "active" ? "profit" : "warn"}>
                    {doc.status}
                  </Badge>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                  }}
                >
                  <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                    Version
                  </span>
                  <span style={{ color: "var(--text-primary, #fafafa)" }}>
                    v{doc.currentVersion}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                  }}
                >
                  <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                    Created
                  </span>
                  <span style={{ color: "var(--text-primary, #fafafa)" }}>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </InspectorSection>

            <InspectorSection title="Related">
              <KnowledgeRelatedPanel documentId={doc.id} />
            </InspectorSection>

            <InspectorSection title="AI Insights">
              <KnowledgeInsightsInspector document={doc} />
            </InspectorSection>

            <InspectorSection title="Related Trades">
              <KnowledgeTradesInspector document={doc} />
            </InspectorSection>

            <InspectorSection title="Links">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLinkDialog(true)}
                style={{ marginBottom: 8 }}
              >
                + Link document
              </Button>
              {doc && (
                <KnowledgeSourcesInspector
                  document={doc}
                  refreshToken={linkRefresh}
                />
              )}
            </InspectorSection>

            <InspectorSection title="Attachments">
              {doc && (
                <KnowledgeAssetsInspector
                  document={doc}
                  refreshToken={assetRefreshToken}
                />
              )}
            </InspectorSection>
          </>
        )}
      </div>

      {showLinkDialog && doc && (
        <LinkDocumentDialog
          sourceDocument={doc}
          onLinked={() => setLinkRefresh((t) => t + 1)}
          onClose={() => setShowLinkDialog(false)}
        />
      )}
    </div>
  );
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="label-caps"
        style={{ color: "var(--text-dim, #6b7280)", marginBottom: 6 }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
