"use client";

import { useCallback, useEffect, useState } from "react";
import type { BuiltContext, ContextBlock } from "@/lib/api/assistant/context";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function authFetch(url: string): Promise<Response> {
  const { getAccessToken } = await import("@/lib/api");
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { headers, credentials: "include" });
}

type Tab =
  | "context"
  | "trades"
  | "research"
  | "portfolio"
  | "documents"
  | "news"
  | "retrieval"
  | "diagnostics";

const TABS: { id: Tab; label: string }[] = [
  { id: "context", label: "Context" },
  { id: "trades", label: "Trades" },
  { id: "research", label: "Research" },
  { id: "portfolio", label: "Portfolio" },
  { id: "documents", label: "Docs" },
  { id: "news", label: "News" },
  { id: "retrieval", label: "Retrieval" },
  { id: "diagnostics", label: "Diagnostics" },
];

export default function ContextExplorer({
  contextRequest,
}: {
  contextRequest?: Record<string, any> | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("context");
  const [context, setContext] = useState<BuiltContext | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (
      activeTab === "context" ||
      activeTab === "diagnostics" ||
      activeTab === "retrieval"
    ) {
      fetchPreview();
    }
  }, [activeTab, fetchPreview]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border, #23252d)",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color:
                activeTab === tab.id
                  ? "var(--text-primary, #fafafa)"
                  : "var(--text-muted, #9ca3af)",
              background:
                activeTab === tab.id
                  ? "var(--bg-surface-hover, #1a1b23)"
                  : "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--accent, #3b82f6)"
                  : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {loading && (activeTab === "context" || activeTab === "retrieval") ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
              textAlign: "center",
              padding: 24,
            }}
          >
            Loading...
          </div>
        ) : activeTab === "context" ? (
          <ContextTab context={context} />
        ) : activeTab === "retrieval" ? (
          <RetrievalTab trace={context?.metadata?.retrievalTrace ?? null} />
        ) : activeTab === "diagnostics" ? (
          <DiagnosticsTab context={context} onRefresh={fetchPreview} />
        ) : (
          <DataSourceTab source={activeTab} />
        )}
      </div>
    </div>
  );
}

function ContextTab({ context }: { context: BuiltContext | null }) {
  if (!context || context.blocks.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          textAlign: "center",
          padding: 24,
        }}
      >
        No context assembled. Send a message to see what the AI receives.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {context.blocks.map((block, i) => (
        <div
          key={`${block.source}-${i}`}
          className="glass-card"
          style={{ padding: 10, borderRadius: 8 }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--accent, #3b82f6)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            {block.title}
          </div>
          <pre
            style={{
              fontSize: 11,
              color: "var(--text-primary, #fafafa)",
              whiteSpace: "pre-wrap",
              margin: 0,
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {block.content}
          </pre>
        </div>
      ))}
    </div>
  );
}

function DiagnosticsTab({
  context,
  onRefresh,
}: {
  context: BuiltContext | null;
  onRefresh: () => void;
}) {
  if (!context) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted, #9ca3af)",
            marginBottom: 12,
          }}
        >
          No diagnostics yet.
        </div>
        <button
          onClick={onRefresh}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            background: "var(--accent, #3b82f6)",
            color: "#fff",
            border: "none",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          Diagnostics
        </span>
        <button
          onClick={onRefresh}
          style={{
            padding: "2px 8px",
            borderRadius: 4,
            background: "var(--bg-surface-hover, #1a1b23)",
            color: "var(--text-muted, #9ca3af)",
            border: "1px solid var(--border, #23252d)",
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div className="glass-card" style={{ padding: 10, borderRadius: 8 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-dim, #6b7280)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Token Usage
        </div>
        <div style={{ fontSize: 13, color: "var(--text-primary, #fafafa)" }}>
          {context.totalTokens} / 2000 tokens
        </div>
        <div
          style={{
            height: 4,
            background: "var(--bg-surface-hover, #1a1b23)",
            borderRadius: 2,
            marginTop: 6,
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
      </div>

      <div className="glass-card" style={{ padding: 10, borderRadius: 8 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-dim, #6b7280)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Providers
        </div>
        {context.metadata.providersUsed.map((id) => (
          <div
            key={id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              padding: "2px 0",
            }}
          >
            <span style={{ color: "var(--accent-profit, #22c55e)" }}>{id}</span>
            <span style={{ color: "var(--text-dim, #6b7280)" }}>
              {context.metadata.latencies[id] ?? 0}ms
            </span>
          </div>
        ))}
        {context.metadata.providersSkipped.map((id) => (
          <div
            key={id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              padding: "2px 0",
            }}
          >
            <span style={{ color: "var(--accent-loss, #ef4444)" }}>
              {id} (skipped)
            </span>
          </div>
        ))}
      </div>

      {context.warnings.length > 0 && (
        <div className="glass-card" style={{ padding: 10, borderRadius: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--accent-loss, #ef4444)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Warnings
          </div>
          {context.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "var(--text-muted, #9ca3af)",
                padding: "2px 0",
              }}
            >
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RetrievalTab({
  trace,
}: {
  trace: {
    scores: Array<{
      provider: string;
      score: number;
      reasons: string[];
      filtered: boolean;
    }>;
    budgetAllocated: Record<string, number>;
    budgetUsed: Record<string, number>;
    totalTokens: number;
    warnings: string[];
    latencies: Record<string, number>;
  } | null;
}) {
  if (!trace) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          textAlign: "center",
          padding: 24,
        }}
      >
        No retrieval trace. Send a message to see scoring.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="glass-card" style={{ padding: 10, borderRadius: 8 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-dim, #6b7280)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Provider Scores
        </div>
        {trace.scores.map((s) => (
          <div
            key={s.provider}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              padding: "3px 0",
            }}
          >
            <span
              style={{
                color: s.filtered
                  ? "var(--accent-loss, #ef4444)"
                  : "var(--accent-profit, #22c55e)",
              }}
            >
              {s.provider} {s.filtered ? "(filtered)" : ""}
            </span>
            <span
              style={{
                color: "var(--text-dim, #6b7280)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {s.score.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 10, borderRadius: 8 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-dim, #6b7280)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Budget Allocation
        </div>
        {Object.entries(trace.budgetAllocated).map(([provider, allocated]) => (
          <div key={provider} style={{ fontSize: 12, padding: "2px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-primary, #fafafa)" }}>
                {provider}
              </span>
              <span
                style={{
                  color: "var(--text-dim, #6b7280)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {trace.budgetUsed[provider] ?? 0}/{allocated} tok
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "var(--bg-surface-hover, #1a1b23)",
                borderRadius: 2,
                marginTop: 3,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, ((trace.budgetUsed[provider] ?? 0) / (allocated as number)) * 100)}%`,
                  background: "var(--accent, #3b82f6)",
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {trace.warnings.length > 0 && (
        <div className="glass-card" style={{ padding: 10, borderRadius: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--accent-loss, #ef4444)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Warnings
          </div>
          {trace.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "var(--text-muted, #9ca3af)",
                padding: "2px 0",
              }}
            >
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DataSourceTab({ source }: { source: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoints: Record<string, string> = {
      trades: "/trades?limit=10",
      research: "/research/projects?pageSize=10",
      portfolio: "/portfolio",
      documents: "/research/search?q=",
      news: "/news/calendar",
    };
    const ep = endpoints[source];
    if (!ep) {
      setLoading(false);
      return;
    }

    authFetch(`${API}${ep}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [source]);

  if (loading)
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          textAlign: "center",
          padding: 24,
        }}
      >
        Loading...
      </div>
    );
  if (!data)
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #9ca3af)",
          textAlign: "center",
          padding: 24,
        }}
      >
        No data available
      </div>
    );

  return (
    <pre
      style={{
        fontSize: 11,
        color: "var(--text-primary, #fafafa)",
        whiteSpace: "pre-wrap",
        fontFamily: "var(--font-mono, monospace)",
        margin: 0,
      }}
    >
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}
