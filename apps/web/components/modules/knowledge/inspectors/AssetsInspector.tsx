"use client";

import { useEffect, useState } from "react";
import type { KnowledgeDocument } from "@/lib/api/knowledge";
import {
  getKnowledgeAssets,
  deleteKnowledgeAsset,
  type KnowledgeAsset,
} from "@/lib/api/knowledge";

export default function KnowledgeAssetsInspector({
  document,
  refreshToken = 0,
}: {
  document: KnowledgeDocument;
  refreshToken?: number;
}) {
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    let cancelled = false;
    setLoading(true);
    getKnowledgeAssets(document.id)
      .then((rows) => {
        if (!cancelled) setAssets(rows);
      })
      .catch(() => {
        if (!cancelled) setAssets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(load, [document.id, refreshToken]);

  const handleDelete = async (assetId: string) => {
    try {
      await deleteKnowledgeAsset(assetId);
      load();
    } catch (err) {
      console.error("Failed to delete asset:", err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          padding: "8px 0",
        }}
      >
        Loading…
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div style={{ color: "var(--text-muted, #9ca3af)" }}>
        No attachments yet.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12 }}>
      {assets.map((asset) => (
        <div
          key={asset.id}
          style={{
            padding: "6px 0",
            borderBottom: "1px solid var(--border, #23252d)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "var(--text-secondary, #d1d5db)",
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {asset.fileName || asset.assetType}
          </a>
          <button
            onClick={() => handleDelete(asset.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-dim, #6b7280)",
              cursor: "pointer",
              fontSize: 12,
              flexShrink: 0,
            }}
            aria-label="Delete attachment"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

