"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChatModels, streamChat, type ChatMessage } from "@/lib/api";

const MODEL_STORAGE_KEY = "tradezen.chat.model";
const CHAT_SIZE_STORAGE_KEY = "tradezen.chat.size";
const FALLBACK_MODEL = "default";
const MAX_CHAT_MESSAGES = 80;

function capChatMessages(list: ChatMessage[]): ChatMessage[] {
  return list.length > MAX_CHAT_MESSAGES ? list.slice(-MAX_CHAT_MESSAGES) : list;
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [model, setModel] = useState(FALLBACK_MODEL);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "I can help review trades, risk, and journaling patterns. What are you working on today?",
    },
  ]);
  const [width, setWidth] = useState(380);
  const [height, setHeight] = useState(520);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const resizeRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const tokenBufferRef = useRef("");
  const tokenFlushRafRef = useRef<number | null>(null);

  const flushTokenBufferToState = useCallback(() => {
    const chunk = tokenBufferRef.current;
    tokenBufferRef.current = "";
    if (!chunk) return;
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last.role !== "assistant") {
        updated.push({ role: "assistant", content: chunk });
        return capChatMessages(updated);
      }
      updated[updated.length - 1] = {
        ...last,
        content: `${last.content}${chunk}`,
      };
      return capChatMessages(updated);
    });
  }, []);

  const scheduleTokenFlush = useCallback(() => {
    if (tokenFlushRafRef.current != null) return;
    tokenFlushRafRef.current = requestAnimationFrame(() => {
      tokenFlushRafRef.current = null;
      flushTokenBufferToState();
    });
  }, [flushTokenBufferToState]);

  useEffect(() => {
    let active = true;

    const loadModels = async () => {
      const savedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);
      try {
        const response = await getChatModels();
        if (!active) return;

        const models = response.models.length > 0 ? response.models : [FALLBACK_MODEL];
        const selected = savedModel && models.includes(savedModel)
          ? savedModel
          : response.defaultModel && models.includes(response.defaultModel)
            ? response.defaultModel
            : models[0];

        setModelOptions(models);
        setModel(selected);
      } catch {
        if (!active) return;
        const selected = savedModel || FALLBACK_MODEL;
        setModelOptions([selected]);
        setModel(selected);
      }
    };

    void loadModels();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      if (tokenFlushRafRef.current != null) {
        cancelAnimationFrame(tokenFlushRafRef.current);
        tokenFlushRafRef.current = null;
      }
      tokenBufferRef.current = "";
    };
  }, []);

  useEffect(() => {
    if (!open) {
      streamAbortRef.current?.abort();
      if (tokenFlushRafRef.current != null) {
        cancelAnimationFrame(tokenFlushRafRef.current);
        tokenFlushRafRef.current = null;
      }
      flushTokenBufferToState();
    }
  }, [open, flushTokenBufferToState]);

  useEffect(() => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, model);
  }, [model]);

  useEffect(() => {
    const savedSize = window.localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
    if (savedSize) {
      try {
        const { w, h } = JSON.parse(savedSize);
        setWidth(w);
        setHeight(h);
      } catch {
        // Use defaults
      }
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      const panel = document.querySelector('section[style*="position: fixed"]') as HTMLElement;
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      const newWidth = Math.max(300, e.clientX - rect.left);
      const newHeight = Math.max(200, e.clientY - rect.top);

      setWidth(newWidth);
      setHeight(newHeight);
      window.localStorage.setItem(CHAT_SIZE_STORAGE_KEY, JSON.stringify({ w: newWidth, h: newHeight }));
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    if (isResizingRef.current) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [messages, open]);

  const canSend = useMemo(() => input.trim().length > 0 && !isStreaming, [input, isStreaming]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);
    setIsStreaming(true);

    streamAbortRef.current?.abort();
    streamAbortRef.current = new AbortController();
    const { signal } = streamAbortRef.current;

    const nextMessages = capChatMessages([...messages, { role: "user" as const, content: text }]);
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    try {
      await streamChat({
        signal,
        model: model === FALLBACK_MODEL ? undefined : model,
        messages: nextMessages,
        systemPrompt: "You are a trading assistant. Respond with clear, well-formatted text. Ensure proper spacing between words in every response.",
        onToken: (token) => {
          tokenBufferRef.current += token;
          scheduleTokenFlush();
        },
        onDone: () => {
          if (tokenFlushRafRef.current != null) {
            cancelAnimationFrame(tokenFlushRafRef.current);
            tokenFlushRafRef.current = null;
          }
          flushTokenBufferToState();
          setIsStreaming(false);
        },
      });
    } catch (err) {
      if (tokenFlushRafRef.current != null) {
        cancelAnimationFrame(tokenFlushRafRef.current);
        tokenFlushRafRef.current = null;
      }
      tokenBufferRef.current = "";
      setIsStreaming(false);
      setError(err instanceof Error ? err.message : "Failed to stream response");
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.content.trim() === "") {
          updated.pop();
        }
        return updated;
      });
    }
  };

  return (
    <>
      {/* Mobile toggle - fixed bottom right */}
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-40 px-3 py-2 md:px-4 md:py-2.5 text-[10px] md:text-[11px] font-bold tracking-widest"
        style={{
          background: "#ffffff",
          color: "#111111",
          border: "1px solid #d0d0d0",
          cursor: "pointer",
        }}
      >
        {open ? "CLOSE AI" : "OPEN AI"}
      </button>

      {open && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Mobile bottom sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 md:hidden flex flex-col rounded-t-xl"
            style={{
              maxHeight: "80vh",
              border: "1px solid var(--border)",
              borderBottom: "none",
              background: "var(--bg-card)",
              boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.35)",
            }}
          >
            <header
              className="flex justify-between items-center px-4 py-3 border-b"
              style={{ borderBottomColor: "var(--border)" }}
            >
              <span className="text-[11px] font-bold tracking-widest">TRADE ASSISTANT</span>
              <div className="flex items-center gap-2">
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={isStreaming}
                  className="text-[10px]"
                  style={{
                    background: "var(--bg-panel)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    padding: "4px 6px",
                  }}
                >
                  {modelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === FALLBACK_MODEL ? "Default model" : option}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1"
                  style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </header>

            <div
              ref={viewportRef}
              className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2"
              style={{ minHeight: 0 }}
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className="max-w-[90%] px-3 py-2 text-xs leading-relaxed"
                  style={{
                    alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                    background: message.role === "user" ? "#ffffff" : "var(--bg-panel)",
                    color: message.role === "user" ? "#111111" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {message.content || (isStreaming && message.role === "assistant" ? "..." : "")}
                </div>
              ))}
            </div>

            {error && (
              <div style={{ color: "var(--accent-loss)", fontSize: 11, padding: "0 12px 6px 12px" }}>
                {error}
              </div>
            )}

            <div
              className="border-t px-3 py-3 flex gap-2"
              style={{ borderTopColor: "var(--border)" }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSend();
                  }
                }}
                placeholder="Ask about your trading..."
                disabled={isStreaming}
                className="flex-1 text-xs resize-none px-3 py-2"
                style={{
                  height: 56,
                  background: "var(--bg-panel)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                onClick={() => void onSend()}
                disabled={!canSend}
                className="w-16 text-[10px] font-bold tracking-widest"
                style={{
                  background: canSend ? "#ffffff" : "#777777",
                  color: "#111111",
                  border: "1px solid #d0d0d0",
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                {isStreaming ? "..." : "SEND"}
              </button>
            </div>
          </div>

          {/* Desktop floating panel */}
          <section
            className="hidden md:block"
            style={{
              position: "fixed",
              right: 24,
              bottom: 72,
              zIndex: 40,
              width: width,
              height: height,
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              boxShadow: "0 8px 40px rgba(0, 0, 0, 0.35)",
              userSelect: "none",
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: "1px solid var(--border)",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>TRADE ASSISTANT</span>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                disabled={isStreaming}
                style={{
                  background: "var(--bg-panel)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  padding: "6px 8px",
                  fontSize: 11,
                }}
              >
                {modelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === FALLBACK_MODEL ? "Default model" : option}
                  </option>
                ))}
              </select>
            </header>

            <div
              ref={viewportRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "90%",
                    background: message.role === "user" ? "#ffffff" : "var(--bg-panel)",
                    color: message.role === "user" ? "#111111" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                    padding: "8px 10px",
                    fontSize: 12,
                    lineHeight: 1.6,
                    whiteSpace: "normal" as const,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    hyphens: "auto",
                    textRendering: "optimizeLegibility",
                    fontVariantLigatures: "normal",
                    fontKerning: "auto",
                  } as React.CSSProperties}
                >
                  {message.content || (isStreaming && message.role === "assistant" ? "..." : "")}
                </div>
              ))}
            </div>

            {error ? (
              <div
                style={{
                  color: "var(--accent-loss)",
                  fontSize: 11,
                  padding: "0 12px 8px 12px",
                }}
              >
                {error}
              </div>
            ) : null}

            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: 12,
                display: "flex",
                gap: 8,
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSend();
                  }
                }}
                placeholder="Ask about your trading performance..."
                disabled={isStreaming}
                style={{
                  flex: 1,
                  height: 68,
                  resize: "none",
                  background: "var(--bg-panel)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  padding: "8px 10px",
                  fontSize: 12,
                }}
              />
              <button
                onClick={() => void onSend()}
                disabled={!canSend}
                style={{
                  width: 80,
                  background: canSend ? "#ffffff" : "#777777",
                  color: "#111111",
                  border: "1px solid #d0d0d0",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                {isStreaming ? "..." : "SEND"}
              </button>
            </div>

            {/* Resize handle */}
            <div
              ref={resizeRef}
              onMouseDown={() => {
                isResizingRef.current = true;
              }}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                cursor: "nwse-resize",
                background: "linear-gradient(135deg, transparent 60%, #666 60%)",
              }}
            />
            <div
              onMouseDown={() => {
                isResizingRef.current = true;
              }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 5,
                height: "100%",
                cursor: "ew-resize",
                background: "transparent",
              }}
            />
            <div
              onMouseDown={() => {
                isResizingRef.current = true;
              }}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: 5,
                cursor: "ns-resize",
                background: "transparent",
              }}
            />
          </section>
        </>
      )}
    </>
  );
}
