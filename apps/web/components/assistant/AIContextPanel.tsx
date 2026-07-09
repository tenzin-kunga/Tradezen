"use client";

import { useCallback, useEffect, useState } from "react";
import type { BuiltContext } from "@/lib/api/assistant/context";
import ActionCard from "./ActionCard";
import { IconCheck, IconCircle } from "./icons";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Skeleton } from "@/components/primitives/Skeleton";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function authFetch(url: string): Promise<Response> {
  const { getAccessToken } = await import("@/lib/api");
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { headers, credentials: "include" });
}

function formatFreshness(block: {
  freshness?: string;
  source: string;
}): string {
  if (!block.freshness) return "";
  const d = new Date(block.freshness);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}s ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString();
}

interface AIContextPanelProps {
  contextRequest?: Record<string, any> | null;
}

export default function AIContextPanel({
  contextRequest,
}: AIContextPanelProps) {
  const [context, setContext] = useState<BuiltContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const params = contextRequest
        ? `?${new URLSearchParams(contextRequest as Record<string, string>).toString()}`
        : "";
      const res = await authFetch(`${API}/chat/context-preview${params}`);
      if (res.ok) setContext(await res.json());
    } catch (e) {
      console.error("Failed to fetch context preview:", e);
    } finally {
      setLoading(false);
    }
  }, [contextRequest]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Keyboard shortcut for developer mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setDeveloperMode((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 12px 8px",
          borderBottom: "1px solid var(--border, #23252d)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          AI Context
        </span>
      </div>

      {/* Content */}
      <div
        className="tz-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 12 }}
      >
        {loading && !context ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 4,
            }}
          >
            <Skeleton height={14} width="55%" />
            <Skeleton height={10} />
            <Skeleton height={10} width="80%" />
            <Skeleton height={10} width="65%" />
          </div>
        ) : !context || context.blocks.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Send a message to see what the AI knows about your trading."
          />
        ) : (
          <>
            {/* NOW section */}
            <SectionHeader title="Now" />
            {context.blocks.map((block, i) => (
              <SourceRow
                key={`${block.source}-${i}`}
                name={block.title}
                detail={block.content.split("\n")[0]}
                freshness={formatFreshness(block)}
                active={true}
              />
            ))}

            {/* RETRIEVED section */}
            {context.metadata.retrievalTrace && (
              <>
                <SectionHeader title="Retrieved" />
                {context.metadata.retrievalTrace.scores
                  .filter((s) => !s.filtered)
                  .map((s) => (
                    <RetrievalRow
                      key={s.provider}
                      name={s.provider}
                      matched={s.reasons.join(", ")}
                    />
                  ))}
                {context.metadata.retrievalTrace.scores
                  .filter((s) => s.filtered)
                  .map((s) => (
                    <SkippedRow
                      key={s.provider}
                      name={s.provider}
                      reason="Low relevance"
                    />
                  ))}
              </>
            )}

            {/* SUGGESTED section */}
            <SectionHeader title="Suggested" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ActionCard
                icon="chart"
                title="Open trades"
                description="View recent trades"
                onClick={() => {}}
              />
              <ActionCard
                icon="journal"
                title="Write journal"
                description="Create today's entry"
                onClick={() => {}}
              />
              <ActionCard
                icon="portfolio"
                title="Open portfolio"
                description="View holdings"
                onClick={() => {}}
              />
            </div>

            {/* Developer mode */}
            {developerMode && (
              <>
                <SectionHeader title="Developer" />
                <DeveloperInfo context={context} />
              </>
            )}
          </>
        )}
      </div>

      {/* Developer mode toggle hint */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid var(--border, #23252d)",
          fontSize: 10,
          color: "var(--text-dim, #6b7280)",
          flexShrink: 0,
        }}
      >
        Ctrl+Shift+D for developer mode
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-dim, #6b7280)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "12px 0 6px",
        borderBottom: "1px solid var(--border, #23252d)",
        marginBottom: 6,
      }}
    >
      {title}
    </div>
  );
}

function SourceRow({
  name,
  detail,
  freshness,
  active,
}: {
  name: string;
  detail?: string;
  freshness?: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "6px 0",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 1,
          color: active
            ? "var(--accent-profit, #22c55e)"
            : "var(--text-dim, #6b7280)",
        }}
      >
        {active ? <IconCheck size={14} /> : <IconCircle size={14} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          {name}
        </div>
        {detail && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {detail}
          </div>
        )}
      </div>
      {freshness && (
        <span
          style={{
            fontSize: 11,
            color: "var(--text-dim, #6b7280)",
            flexShrink: 0,
          }}
        >
          {freshness}
        </span>
      )}
    </div>
  );
}

function RetrievalRow({ name, matched }: { name: string; matched: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--accent-profit, #22c55e)" }}>·</span>
      <span style={{ color: "var(--text-primary, #fafafa)", fontWeight: 500 }}>
        {name}
      </span>
      <span style={{ color: "var(--text-muted, #9ca3af)" }}>
        Matched: {matched}
      </span>
    </div>
  );
}

function SkippedRow({ name, reason }: { name: string; reason: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--text-dim, #6b7280)" }}>·</span>
      <span style={{ color: "var(--text-dim, #6b7280)" }}>{name}</span>
      <span style={{ color: "var(--text-dim, #6b7280)" }}>Skipped</span>
      <span style={{ color: "var(--text-dim, #6b7280)", fontSize: 11 }}>
        {reason}
      </span>
    </div>
  );
}

function DeveloperInfo({ context }: { context: BuiltContext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-primary, #fafafa)",
        }}
      >
        <span style={{ color: "var(--text-dim, #6b7280)" }}>Tokens: </span>
        {context.totalTokens} / 2000
      </div>
      <div
        style={{
          height: 4,
          background: "var(--bg-surface-hover, #1a1b23)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, (context.totalTokens / 2000) * 100)}%`,
            background:
              context.totalTokens > 1800
                ? "var(--accent-loss, #ef4444)"
                : "var(--accent, #3b82f6)",
            borderRadius: 2,
          }}
        />
      </div>
      {context.metadata.retrievalTrace && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {context.metadata.retrievalTrace.scores.map((s) => (
            <div
              key={s.provider}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              <span style={{ color: "var(--text-primary, #fafafa)" }}>
                {s.provider}
              </span>
              <span
                style={{
                  color: s.filtered
                    ? "var(--accent-loss, #ef4444)"
                    : "var(--accent-profit, #22c55e)",
                }}
              >
                {s.score.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
