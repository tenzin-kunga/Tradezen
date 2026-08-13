"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const PROVIDERS = [
  {
    id: "openrouter",
    name: "OpenRouter",
    placeholder: "sk-or-v1-...",
    description: "Access 200+ models from OpenAI, Anthropic, Google, and more",
  },
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    description: "Direct access to GPT-4, GPT-4o, and other OpenAI models",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    placeholder: "sk-ant-...",
    description: "Direct access to Claude models",
  },
  {
    id: "google",
    name: "Google Gemini",
    placeholder: "AIza...",
    description: "Access Gemini 2.0, 1.5 Pro, and other Google models",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    placeholder: "...",
    description: "Access Mistral Large, Medium, and other Mistral models",
  },
  {
    id: "groq",
    name: "Groq",
    placeholder: "gsk_...",
    description: "Fast inference for Llama, Mixtral, and other models",
  },
  {
    id: "together",
    name: "Together AI",
    placeholder: "...",
    description: "Access open-source models with fast inference",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    placeholder: "...",
    description: "Access DeepSeek-V3 and R1 models",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    placeholder: "...",
    description: "Access Grok models from xAI",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    placeholder: "pplx-...",
    description: "Access Sonar models for search-augmented generation",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    placeholder: "...",
    description: "Fast inference for open-source models",
  },
] as const;

interface ApiKeyStatus {
  configured: boolean;
  provider: string | null;
  validated: boolean;
  validatedAt: string | null;
  lastError: string | null;
}

interface ValidateResponse {
  valid: boolean;
  modelCount: number;
}

interface ProviderStatus {
  id: string;
  status: string;
  latency: number | null;
}

async function authFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("tradezen_access_token");
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

export function AIProviderSection() {
  const [selectedProvider, setSelectedProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validateResult, setValidateResult] = useState<ValidateResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load status + providers
  const loadStatus = useCallback(async () => {
    try {
      const [statusRes, providersRes] = await Promise.all([
        authFetch("/user-settings/api-key/status"),
        authFetch("/chat/models/providers"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviders(data.providers ?? []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleValidate = async () => {
    if (!apiKey.trim()) return;
    setValidating(true);
    setError(null);
    setValidateResult(null);
    try {
      const res = await authFetch("/user-settings/api-key/validate", {
        method: "POST",
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          provider: selectedProvider,
        }),
      });
      if (res.ok) {
        setValidateResult(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError("Please log in again to continue.");
        } else {
          setError(data.message ?? "Invalid API key");
        }
      }
    } catch {
      setError("Failed to validate key");
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/user-settings/api-key", {
        method: "PATCH",
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          provider: selectedProvider,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setApiKey("");
        setValidateResult(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to save key");
      }
    } catch {
      setError("Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      const res = await authFetch("/user-settings/api-key", {
        method: "DELETE",
      });
      if (res.ok) {
        setStatus(await res.json());
        setApiKey("");
        setValidateResult(null);
      }
    } catch {
      // Ignore
    }
  };

  const ollamaStatus = providers.find((p) => p.id === "ollama");
  const ollamaHealthy = ollamaStatus?.status === "healthy";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <SectionHeader
        icon={Bot}
        title="AI Providers"
        description="Configure API keys for cloud AI providers. Your keys are encrypted and stored securely."
      />

      {/* Cloud API */}
      <div
        style={{
          background: "var(--bg-surface, #12131a)",
          border: "1px solid var(--border-subtle, #1e1f2e)",
          borderRadius: 12,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            API
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary, #e4e4e7)",
              }}
            >
              Cloud API
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted, #71717a)" }}>
              Use cloud models from OpenAI, Anthropic, Google, and more
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            {status?.configured ? (
              <span
                style={{
                  fontSize: 12,
                  color: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10 }}>●</span> Connected
              </span>
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted, #71717a)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10 }}>○</span> Not configured
              </span>
            )}
          </div>
        </div>

        {/* Connected state */}
        {status?.configured && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "12px 16px",
              background: "var(--bg-surface-hover, #1a1b23)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-muted, #71717a)" }}>
                Provider
              </span>
              <span
                style={{
                  color: "var(--text-primary, #e4e4e7)",
                  textTransform: "capitalize",
                }}
              >
                {status.provider ?? "Unknown"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-muted, #71717a)" }}>
                Status
              </span>
              <span style={{ color: status.validated ? "#22c55e" : "#eab308" }}>
                {status.validated ? "Verified" : "Unverified"}
              </span>
            </div>
            {status.validatedAt && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--text-muted, #71717a)" }}>
                  Last verified
                </span>
                <span style={{ color: "var(--text-primary, #e4e4e7)" }}>
                  {new Date(status.validatedAt).toLocaleString()}
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={handleRemove}
                style={{
                  fontSize: 12,
                  color: "#ef4444",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                Remove key
              </button>
            </div>
          </div>
        )}

        {/* Not configured state */}
        {!status?.configured && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setApiKey("");
                setValidateResult(null);
                setError(null);
              }}
              style={{
                padding: "10px 12px",
                background: "var(--bg-surface-hover, #1a1b23)",
                border: "1px solid var(--border-subtle, #1e1f2e)",
                borderRadius: 8,
                color: "var(--text-primary, #e4e4e7)",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="password"
              placeholder={
                PROVIDERS.find((p) => p.id === selectedProvider)?.placeholder ??
                "API key..."
              }
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setValidateResult(null);
                setError(null);
              }}
              style={{
                padding: "10px 12px",
                background: "var(--bg-surface-hover, #1a1b23)",
                border: "1px solid var(--border-subtle, #1e1f2e)",
                borderRadius: 8,
                color: "var(--text-primary, #e4e4e7)",
                fontSize: 13,
                outline: "none",
              }}
            />

            <div style={{ fontSize: 11, color: "var(--text-muted, #71717a)" }}>
              {PROVIDERS.find((p) => p.id === selectedProvider)?.description}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleValidate}
                disabled={!apiKey.trim() || validating}
                style={{
                  padding: "8px 16px",
                  background: "var(--bg-surface-hover, #1a1b23)",
                  border: "1px solid var(--border-subtle, #1e1f2e)",
                  borderRadius: 8,
                  color: "var(--text-primary, #e4e4e7)",
                  fontSize: 12,
                  cursor: apiKey.trim() && !validating ? "pointer" : "default",
                  opacity: apiKey.trim() && !validating ? 1 : 0.5,
                }}
              >
                {validating ? "Testing..." : "Test Connection"}
              </button>

              {validateResult && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    background: "var(--accent, #3b82f6)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save Key"}
                </button>
              )}
            </div>

            {validateResult && (
              <div
                style={{
                  fontSize: 12,
                  color: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>✓</span> Valid — {validateResult.modelCount} models
                available
              </div>
            )}

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>✗</span> {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ollama */}
      <div
        style={{
          background: "var(--bg-surface, #12131a)",
          border: "1px solid var(--border-subtle, #1e1f2e)",
          borderRadius: 12,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            OL
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary, #e4e4e7)",
              }}
            >
              Ollama (Local)
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted, #71717a)" }}>
              Run models locally on your machine
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            {ollamaHealthy ? (
              <span
                style={{
                  fontSize: 12,
                  color: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10 }}>●</span> Running
              </span>
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted, #71717a)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10 }}>○</span> Not running
              </span>
            )}
          </div>
        </div>

        {ollamaHealthy && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #71717a)",
              padding: "8px 12px",
              background: "var(--bg-surface-hover, #1a1b23)",
              borderRadius: 8,
            }}
          >
            Models are discovered automatically from your Ollama instance.
          </div>
        )}

        {!ollamaHealthy && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #71717a)",
              padding: "8px 12px",
              background: "var(--bg-surface-hover, #1a1b23)",
              borderRadius: 8,
            }}
          >
            Start Ollama to use local models. Visit{" "}
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent, #3b82f6)" }}
            >
              ollama.com
            </a>{" "}
            for installation instructions.
          </div>
        )}
      </div>
    </div>
  );
}
