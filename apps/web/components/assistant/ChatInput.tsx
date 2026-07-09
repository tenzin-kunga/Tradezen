"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatStatus } from "@/hooks/useChat";
import {
  getChatModels,
  addProvider,
  removeProvider,
  type ChatModels,
  type ModelInfo,
} from "@/lib/api/assistant";
import { getApiKeyStatus, getUserSettings, type ApiKeyStatus } from "@/lib/api/user-settings";
import ModelBrowser from "./ModelBrowser";

interface ChatInputProps {
  onSend: (content: string, model?: string) => void;
  onAbort: () => void;
  status: ChatStatus;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  onAbort,
  status,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [catalog, setCatalog] = useState<ChatModels | null>(null);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [modelBrowserOpen, setModelBrowserOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
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
      const active = settings?.assistantSettings?.activeModels ?? data.models ?? [];
      // Filter out OpenRouter models if no API key configured
      const orConfigured = keyStatus?.configured ?? false;
      const filtered = orConfigured
        ? active
        : active.filter((m) => !m.includes("/"));
      setActiveModels(filtered);
      const fallback = data.defaultModel;
      if (!selectedModel || !filtered.includes(selectedModel)) {
        setSelectedModel(filtered.includes(fallback) ? fallback : filtered[0] ?? fallback);
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
        modelMenuRef.current && !modelMenuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
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
    ? modelIndex.get(selectedModel)?.info.displayName ??
      selectedModel.split("/").pop()?.split(":")[0] ??
      selectedModel
    : "Select model";

  return (
    <div
      style={{
        padding: "8px 16px 16px",
        borderTop: "1px solid var(--border, #23252d)",
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
            borderBottom: "1px solid var(--border, #23252d)",
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
                border: "1px solid var(--border, #23252d)",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent, #3b82f6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border, #23252d)";
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
              {modelShort}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  border: "1px solid var(--border, #23252d)",
                  borderRadius: 8,
                  boxShadow: "var(--shadow-pop)",
                  overflow: "hidden",
                  zIndex: 200,
                  minWidth: 260,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {/* Active models (user-selected) */}
                <div style={{ padding: "4px 0" }}>
                  {activeModels.length === 0 && (
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "var(--text-dim, #6b7280)",
                      }}
                    >
                      No models enabled. Browse to add some.
                    </div>
                  )}
                  {activeModels.map((modelId) => {
                    const entry = modelIndex.get(modelId);
                    const name =
                      entry?.info.displayName ??
                      modelId.split("/").pop() ??
                      modelId;
                    const provider = entry?.providerName ?? "local";
                    const isSelected = modelId === selectedModel;
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
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-dim, #6b7280)",
                            textTransform: "capitalize",
                          }}
                        >
                          {provider}
                        </span>
                        {isSelected && (
                          <span style={{ color: "var(--accent, #3b82f6)" }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border, #23252d)" }} />

                {/* Add provider button */}
                <button
                  onClick={() => {
                    setModelOpen(false);
                    setAddProviderOpen(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "var(--accent, #3b82f6)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>+</span>
                  <span>Add Provider</span>
                </button>

                {/* Browse models button */}
                <button
                  onClick={() => {
                    setModelOpen(false);
                    setModelBrowserOpen(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "var(--accent, #3b82f6)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 14 }}></span>
                  <span>Browse Models</span>
                </button>
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
            <button
              onClick={onAbort}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--accent-loss, #ef4444)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              title="Stop generating"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: input.trim()
                  ? "var(--accent, #3b82f6)"
                  : "var(--bg-surface-hover, #1a1b23)",
                border: "none",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
                opacity: input.trim() ? 1 : 0.5,
              }}
              title="Send message"
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
            </button>
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
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelsInput, setModelsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !baseUrl.trim() || !modelsInput.trim()) {
      setError("Name, base URL, and at least one model are required");
      return;
    }

    const models = modelsInput
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    setLoading(true);
    setError("");

    try {
      await addProvider({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
        models,
      });
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add provider");
    } finally {
      setLoading(false);
    }
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
          border: "1px solid var(--border, #23252d)",
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
              Provider Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My OpenAI"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border, #23252d)",
                background: "var(--bg-surface-hover, #1a1b23)",
                color: "var(--text-primary, #fafafa)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

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
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="e.g., https://api.openai.com/v1"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border, #23252d)",
                background: "var(--bg-surface-hover, #1a1b23)",
                color: "var(--text-primary, #fafafa)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

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
              API Key (optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border, #23252d)",
                background: "var(--bg-surface-hover, #1a1b23)",
                color: "var(--text-primary, #fafafa)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

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
              Models (comma-separated)
            </label>
            <input
              type="text"
              value={modelsInput}
              onChange={(e) => setModelsInput(e.target.value)}
              placeholder="e.g., gpt-4o, gpt-4o-mini"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border, #23252d)",
                background: "var(--bg-surface-hover, #1a1b23)",
                color: "var(--text-primary, #fafafa)",
                fontSize: 13,
                outline: "none",
              }}
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
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-muted, #9ca3af)",
              background: "transparent",
              border: "1px solid var(--border, #23252d)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: "var(--accent, #3b82f6)",
              border: "none",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Adding..." : "Add Provider"}
          </button>
        </div>
      </div>
    </div>
  );
}
