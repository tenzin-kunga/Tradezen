"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getChatModels,
  getProviderHealth,
  refreshModels,
  type ChatModels,
  type ModelInfo,
  type ProviderHealth,
} from "@/lib/api/assistant";
import { getApiKeyStatus, getUserSettings, updateUserSettings, type ApiKeyStatus } from "@/lib/api/user-settings";

interface ModelBrowserProps {
  onClose: () => void;
  onChanged: () => void;
}

function CapabilityBadges({ model }: { model: ModelInfo }) {
  const badges: Array<{ label: string; active: boolean }> = [
    { label: "🧠 Reasoning", active: !!model.supportsReasoning },
    { label: "👁 Vision", active: !!model.supportsVision },
    { label: "⚡ Fast", active: model.speed === "fast" },
  ];
  return (
    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {badges
        .filter((b) => b.active)
        .map((b) => (
          <span
            key={b.label}
            style={{
              fontSize: 10,
              color: "var(--text-dim, #6b7280)",
              background: "var(--bg-surface-hover, #1a1b23)",
              borderRadius: 6,
              padding: "2px 6px",
            }}
          >
            {b.label}
          </span>
        ))}
    </span>
  );
}

function ModelRow({
  model,
  providerName,
  installed,
  onToggle,
}: {
  model: ModelInfo;
  providerName: string;
  installed: boolean;
  onToggle: () => void;
}) {
  const label = model.displayName ?? model.id.split("/").pop() ?? model.id;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
      }}
    >
      <button
        onClick={onToggle}
        title={installed ? "Remove from active models" : "Add to active models"}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: installed
            ? "none"
            : "1px solid var(--border, #23252d)",
          background: installed ? "var(--accent, #3b82f6)" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        {installed ? "✓" : ""}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text-primary, #fafafa)" }}>
          {label}{" "}
          <span style={{ fontSize: 10, color: "var(--text-dim, #6b7280)" }}>
            {providerName}
          </span>
        </div>
        <CapabilityBadges model={model} />
      </div>
      {model.recommended && (
        <span style={{ fontSize: 11, color: "#fbbf24" }} title="Recommended">
          ⭐
        </span>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "var(--text-dim, #6b7280)",
        padding: "12px 12px 4px",
      }}
    >
      {children}
    </div>
  );
}

export default function ModelBrowser({ onClose, onChanged }: ModelBrowserProps) {
  const [catalog, setCatalog] = useState<ChatModels | null>(null);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [models, settings, keyStatus, h] = await Promise.all([
        getChatModels(),
        getUserSettings().catch(() => null),
        getApiKeyStatus().catch(() => null),
        getProviderHealth().catch(() => []),
      ]);
      setCatalog(models);
      setHealth(h);
      setApiKeyStatus(keyStatus);
      setActiveModels(
        settings?.assistantSettings?.activeModels ?? models.models ?? [],
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (modelId: string) => {
      const isInstalled = activeModels.includes(modelId);
      // Never let the user remove the last active model — keep a default.
      if (isInstalled && activeModels.length === 1) return;
      const next = isInstalled
        ? activeModels.filter((m) => m !== modelId)
        : [...activeModels, modelId];
      setActiveModels(next);
      try {
        await updateUserSettings({ assistantSettings: { activeModels: next } });
        onChanged();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
        await load();
      }
    },
    [activeModels, onChanged, load],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshModels();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const apiKeyConfigured = apiKeyStatus?.configured ?? false;

  // Build a flat list of all discovered models with their provider name.
  const allModels: Array<{ model: ModelInfo; providerName: string; providerId: string }> =
    [];
  for (const p of catalog?.providers ?? []) {
    // Skip OpenRouter models if no API key configured
    if (p.id === "openrouter" && !apiKeyConfigured) continue;
    for (const m of p.models) {
      allModels.push({ model: m, providerName: p.name, providerId: p.id });
    }
  }

  const unhealthy = new Set(
    health.filter((h) => h.status !== "healthy").map((h) => h.id),
  );

  // Search filter
  const q = search.toLowerCase();
  const matchesSearch = (m: ModelInfo, providerName: string) => {
    if (!q) return true;
    const label = (m.displayName ?? m.id.split("/").pop() ?? m.id).toLowerCase();
    return label.includes(q) || providerName.toLowerCase().includes(q);
  };

  const recommended = allModels.filter(
    (x) => x.model.recommended && !activeModels.includes(x.model.id) && matchesSearch(x.model, x.providerName),
  );
  const installed = allModels.filter((x) => activeModels.includes(x.model.id) && matchesSearch(x.model, x.providerName));
  const available = allModels.filter(
    (x) =>
      !activeModels.includes(x.model.id) &&
      !x.model.recommended &&
      !unhealthy.has(x.providerId) &&
      matchesSearch(x.model, x.providerName),
  );
  const unavailable = allModels.filter((x) => unhealthy.has(x.providerId) && matchesSearch(x.model, x.providerName));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface, #12131a)",
          border: "1px solid var(--border, #23252d)",
          borderRadius: 12,
          width: 460,
          maxWidth: "92vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border, #23252d)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary, #fafafa)" }}>
            Models
          </h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                fontSize: 12,
                color: "var(--accent, #3b82f6)",
                background: "transparent",
                border: "1px solid var(--border, #23252d)",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: refreshing ? "default" : "pointer",
              }}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={onClose}
              style={{
                fontSize: 18,
                color: "var(--text-dim, #6b7280)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {health.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 20px",
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
              borderBottom: "1px solid var(--border, #23252d)",
              flexWrap: "wrap",
            }}
          >
            {health.map((h) => (
              <span key={h.id} title={h.reason ?? ""}>
                {h.status === "healthy" ? "🟢" : "🔴"} {h.id}
                {h.latency != null ? ` ${h.latency}ms` : ""}
              </span>
            ))}
          </div>
        )}

        {/* Connection status */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border, #23252d)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-dim, #6b7280)" }}>Cloud API</span>
            {apiKeyConfigured ? (
              <span style={{ fontSize: 11, color: "#22c55e" }}>✓ Connected</span>
            ) : (
              <Link
                href="/settings"
                onClick={onClose}
                style={{ fontSize: 11, color: "var(--accent, #3b82f6)", textDecoration: "none" }}
              >
                ⚠ Configure API key in Settings
              </Link>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-dim, #6b7280)" }}>Ollama</span>
            {health.find((h) => h.id === "ollama")?.status === "healthy" ? (
              <span style={{ fontSize: 11, color: "#22c55e" }}>✓ Running</span>
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-dim, #6b7280)" }}>○ Not running</span>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border, #23252d)" }}>
          <input
            type="text"
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              color: "var(--text-primary, #fafafa)",
              background: "var(--bg-surface-hover, #1a1b23)",
              border: "1px solid var(--border, #23252d)",
              borderRadius: 8,
              outline: "none",
            }}
          />
        </div>

        <div style={{ overflowY: "auto", padding: "4px 8px 12px" }}>
          {loading && (
            <div style={{ padding: 20, color: "var(--text-dim, #6b7280)" }}>
              Loading models…
            </div>
          )}
          {error && (
            <div style={{ padding: "12px 20px", color: "var(--accent-loss, #ef4444)" }}>
              {error}
            </div>
          )}

          {!loading && recommended.length === 0 && installed.length === 0 && available.length === 0 && unavailable.length === 0 && (
            <div style={{ padding: 20, color: "var(--text-dim, #6b7280)", textAlign: "center" }}>
              {search ? "No models match your search." : "No models available."}
            </div>
          )}

          {!loading && recommended.length > 0 && (
            <>
              <SectionTitle>⭐ Recommended</SectionTitle>
              {recommended.map(({ model, providerName }) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  providerName={providerName}
                  installed={false}
                  onToggle={() => toggle(model.id)}
                />
              ))}
            </>
          )}

          {installed.length > 0 && (
            <>
              <SectionTitle>Installed</SectionTitle>
              {installed.map(({ model, providerName }) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  providerName={providerName}
                  installed
                  onToggle={() => toggle(model.id)}
                />
              ))}
            </>
          )}

          {available.length > 0 && (
            <>
              <SectionTitle>Available</SectionTitle>
              {available.map(({ model, providerName }) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  providerName={providerName}
                  installed={false}
                  onToggle={() => toggle(model.id)}
                />
              ))}
            </>
          )}

          {unavailable.length > 0 && (
            <>
              <SectionTitle>Unavailable</SectionTitle>
              {unavailable.map(({ model, providerName }) => (
                <div
                  key={model.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    opacity: 0.5,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text-primary, #fafafa)" }}>
                      {model.displayName ?? model.id.split("/").pop()}{" "}
                      <span style={{ fontSize: 10, color: "var(--text-dim, #6b7280)" }}>
                        {providerName}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-dim, #6b7280)" }}>
                    offline
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
