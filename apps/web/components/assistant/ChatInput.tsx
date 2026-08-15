"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatStatus } from "@/hooks/useChat";
import {
  getChatModels,
  removeProvider,
  type ChatModels,
  type ModelInfo,
} from "@/lib/api/assistant";
import {
  getApiKeyStatus,
  getUserSettings,
  type ApiKeyStatus,
} from "@/lib/api/user-settings";
import ModelBrowser from "./ModelBrowser";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface ChatInputProps {
  onSend: (content: string, model?: string) => void;
  onAbort: () => void;
  status: ChatStatus;
  disabled?: boolean;
  tokenUsage?: number;
}

export default function ChatInput({
  onSend,
  onAbort,
  status,
  disabled,
  tokenUsage,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [catalog, setCatalog] = useState<ChatModels | null>(null);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [modelBrowserOpen, setModelBrowserOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>(
    { top: 0, left: 0 },
  );
  const [dropdownBottom, setDropdownBottom] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isStreaming = status === "streaming" || status === "pending";

  // Flat lookup: model id -> { info, providerName }
  const modelIndex = useMemo(() => {
    const map = new Map<string, { info: ModelInfo; providerName: string }>();
    for (const p of catalog?.providers ?? []) {
      for (const m of p.models) {
        map.set(m.id, { info: m, providerName: p.name });
      }
    }
    return map;
  }, [catalog]);

  // Fetch available models + the user's active selection
  const fetchModels = useCallback(async () => {
    try {
      const [data, settings, keyStatus] = await Promise.all([
        getChatModels(),
        getUserSettings().catch(() => null),
        getApiKeyStatus().catch(() => null),
      ]);
      setCatalog(data);
      setApiKeyStatus(keyStatus);
      const active =
        settings?.assistantSettings?.activeModels ?? data.models ?? [];
      setActiveModels(active);
      // Default to the backend's working default (a cloud model when Ollama is
      // unavailable, else the local model), preferring it over the first match.
      const allIds = (data.providers ?? []).flatMap((p: any) =>
        p.models.map((m: any) => m.id),
      );
      const fallback = data.defaultModel;
      const initial = allIds.includes(fallback)
        ? fallback
        : (allIds.find((id: string) => id.includes("/")) ??
          allIds[0] ??
          fallback);
      if (!selectedModel || !allIds.includes(selectedModel)) {
        setSelectedModel(initial);
      }
    } catch (e) {
      console.warn("Failed to fetch models:", e);
      setCatalog(null);
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Close model menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed, selectedModel || undefined);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isStreaming, disabled, onSend, selectedModel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isStreaming) {
          onAbort();
        } else {
          handleSend();
        }
      }
    },
    [handleSend, isStreaming, onAbort],
  );

  const handleInput = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, []);

  const modelShort = selectedModel
    ? (modelIndex.get(selectedModel)?.info.displayName ??
      selectedModel.split("/").pop()?.split(":")[0] ??
      selectedModel)
    : "Select model";

  return (
    <div
      style={{
        padding: "8px 16px 16px",
        borderTop: "1px solid var(--border-soft, #23252d)",
        flexShrink: 0,
      }}
    >
      <div
        className="tz-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          borderRadius: 12,
        }}
      >
        {/* Model selector row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderBottom: "1px solid var(--border-soft, #23252d)",
          }}
        >
          <div ref={modelMenuRef} style={{ position: "relative" }}>
            <button
              ref={buttonRef}
              onClick={() => {
                if (!modelOpen && buttonRef.current) {
                  const rect = buttonRef.current.getBoundingClientRect();
                  setDropdownPos({ top: 0, left: rect.left });
                  // Position dropdown above button using bottom
                  setDropdownBottom(window.innerHeight - rect.top + 4);
                }
                setModelOpen(!modelOpen);
              }}
               style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted, #9ca3af)",
                background: "var(--bg-surface-hover, #1a1b23)",
                border: "1px solid var(--border-soft, #23252d)",
                cursor: "pointer",
                transition: "border-color 0.15s",
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
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
              {modelShort}
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Model dropdown */}
            {modelOpen && (
              <div
                style={{
                  position: "fixed",
                  bottom: dropdownBottom,
                  left: dropdownPos.left,
                  background: "var(--bg-surface, #12131a)",
                  border: "1px solid var(--border-soft, #23252d)",
                  borderRadius: 8,
                  boxShadow: "var(--shadow-pop)",
                  overflow: "hidden",
                  zIndex: 200,
                  minWidth: 260,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {/* All available models, grouped by provider */}
                <div style={{ padding: "4px 0" }}>
                  {(catalog?.providers ?? []).map((p: any, idx: number) => {
                    if (!p.models) p.models = [];
                    return (
                      <div key={p.id}>
                        {idx > 0 && (
                          <div
                            style={{
                              height: 1,
                              background: "var(--border-soft, #23252d)",
                              margin: "4px 12px",
                            }}
                          />
                        )}
                        <div
                          style={{
                            padding: "6px 12px 2px",
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            color: "var(--text-dim, #6b7280)",
                          }}
                        >
                          {p.name}
                        </div>
                        {p.models.map((m: any) => {
                          const modelId = m.id;
                          const name =
                            m.displayName ??
                            modelId.split("/").pop() ??
                            modelId;
                          const isSelected = modelId === selectedModel;
                          const isActive = activeModels.includes(modelId);
                          return (
                            <button
                              key={modelId}
                              onClick={() => {
                                setSelectedModel(modelId);
                                setModelOpen(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                padding: "8px 12px",
                                fontSize: 12,
                                color: isSelected
                                  ? "var(--accent, #3b82f6)"
                                  : "var(--text-primary, #fafafa)",
                                background: isSelected
                                  ? "rgba(59, 130, 246, 0.08)"
                                  : "transparent",
                                border: "none",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <span style={{ flex: 1 }}>{name}</span>
                              {isActive && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--text-dim, #6b7280)",
                                  }}
                                >
                                  active
                                </span>
                              )}
                              {isSelected && (
                                <span style={{ color: "var(--accent, #3b82f6)" }}>
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  {(!catalog ||
                    (catalog?.providers ?? []).length === 0) && (
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "var(--text-dim, #6b7280)",
                      }}
                    >
                      No models available.
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div
                  style={{ height: 1, background: "var(--border-soft, #23252d)" }}
                />

                {/* Add provider button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setModelOpen(false);
                    setAddProviderOpen(true);
                  }}
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    color: "var(--accent, #3b82f6)",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>+</span>
                  <span>Add Provider</span>
                </Button>

                {/* Browse models button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setModelOpen(false);
                    setModelBrowserOpen(true);
                  }}
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    color: "var(--accent, #3b82f6)",
                  }}
                >
                  <span style={{ fontSize: 14 }}></span>
                  <span>Browse Models</span>
                </Button>
              </div>
            )}
          </div>

          {isStreaming && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted, #9ca3af)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            >
              Thinking...
            </span>
          )}

          {typeof tokenUsage === "number" && tokenUsage > 0 && (
            <span
              title={`${tokenUsage.toLocaleString()} tokens used in this conversation`}
              style={{
                marginLeft: "auto",
                fontSize: 10,
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--text-dim, #6b7280)",
                whiteSpace: "nowrap",
              }}
            >
              {formatTokens(tokenUsage)}
            </span>
          )}
        </div>

        {/* Input row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            padding: "8px 12px",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={
              isStreaming
                ? "AI is responding..."
                : "Ask anything... (Shift+Enter for newline)"
            }
            disabled={disabled}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary, #fafafa)",
              fontSize: 14,
              lineHeight: 1.5,
              resize: "none",
              maxHeight: 200,
              fontFamily: "inherit",
            }}
          />
          {isStreaming ? (
            <IconButton
              size={32}
              title="Stop generating"
              onClick={onAbort}
              style={{
                background: "var(--accent-loss, #ef4444)",
                color: "#fff",
                border: "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </IconButton>
          ) : (
            <IconButton
              size={32}
              title="Send message"
              disabled={!input.trim() || disabled}
              onClick={handleSend}
              style={{
                background: input.trim()
                  ? "var(--accent, #3b82f6)"
                  : "var(--bg-surface-hover, #1a1b23)",
                color: "#fff",
                border: "none",
                opacity: input.trim() ? 1 : 0.5,
                cursor: input.trim() ? "pointer" : "default",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </IconButton>
          )}
        </div>
      </div>

      {/* Add Provider Modal */}
      {addProviderOpen && (
        <AddProviderModal
          onClose={() => setAddProviderOpen(false)}
          onAdded={() => {
            setAddProviderOpen(false);
            fetchModels();
          }}
        />
      )}

      {/* Model Browser */}
      {modelBrowserOpen && (
        <ModelBrowser
          onClose={() => setModelBrowserOpen(false)}
          onChanged={() => {
            setModelBrowserOpen(false);
            fetchModels();
          }}
        />
      )}
    </div>
  );
}

function AddProviderModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const KNOWN_PROVIDERS = [
    { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", placeholder: "sk-..." },
    { id: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", placeholder: "sk-ant-..." },
    { id: "google", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", placeholder: "AIza..." },
    { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", placeholder: "sk-or-v1-..." },
    { id: "mistral", name: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", placeholder: "..." },
    { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", placeholder: "gsk_..." },
    { id: "together", name: "Together AI", baseUrl: "https://api.together.xyz/v1", placeholder: "..." },
    { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", placeholder: "..." },
    { id: "xai", name: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", placeholder: "..." },
    { id: "perplexity", name: "Perplexity", baseUrl: "https://api.perplexity.ai", placeholder: "pplx-..." },
    { id: "fireworks", name: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", placeholder: "..." },
    { id: "custom", name: "Custom Provider", baseUrl: "", placeholder: "" },
  ] as const;

  const currentProvider = KNOWN_PROVIDERS.find((p) => p.id === selectedProvider);
  const isCustom = selectedProvider === "custom";
  const baseUrl = isCustom ? customBaseUrl : (currentProvider?.baseUrl ?? "");

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    if (isCustom && !customBaseUrl.trim()) {
      setError("Base URL is required for custom providers");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const token = localStorage.getItem("tradezen_access_token");
      const res = await fetch(`${API}/user-settings/api-key`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          provider: currentProvider?.id ?? "openrouter",
          baseUrl: baseUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to save provider");
      }
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add provider");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%" as const,
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid var(--border-soft, #23252d)",
    background: "var(--bg-surface-hover, #1a1b23)",
    color: "var(--text-primary, #fafafa)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface, #12131a)",
          border: "1px solid var(--border-soft, #23252d)",
          borderRadius: 12,
          padding: 24,
          width: 400,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
            marginBottom: 16,
          }}
        >
          Add Provider
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-muted, #9ca3af)",
                marginBottom: 4,
              }}
            >
              Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setError("");
              }}
              style={{
                ...inputStyle,
                cursor: "pointer",
              }}
            >
              {KNOWN_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {isCustom && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-muted, #9ca3af)",
                  marginBottom: 4,
                }}
              >
                Base URL
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-muted, #9ca3af)",
                marginBottom: 4,
              }}
            >
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError("");
              }}
              placeholder={currentProvider?.placeholder ?? "API key..."}
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "var(--accent-loss, #ef4444)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 20,
          }}
        >
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={loading}
            onClick={handleSubmit}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Adding..." : "Add Provider"}
          </Button>
        </div>
      </div>
    </div>
  );
}
