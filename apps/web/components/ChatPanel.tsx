"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChatModels, streamChat, type ChatMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (!content) return <>{isStreaming ? "..." : ""}</>;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        code({ className, children }) {
          if (className == null) return <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--bg-glass)", color: "inherit" }}>{children}</code>;
          return <pre className="overflow-x-auto text-xs p-3 rounded my-1" style={{ background: "var(--bg-glass)" }}><code className={className}>{children}</code></pre>;
        },
        a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)" }}>{children}</a>; },
        p({ children }) { return <p className="my-1 last:mb-0" style={{ color: "inherit" }}>{children}</p>; },
        ul({ children }) { return <ul className="list-disc pl-4 my-1">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal pl-4 my-1">{children}</ol>; },
        li({ children }) { return <li className="my-0.5">{children}</li>; },
        strong({ children }) { return <strong className="font-bold">{children}</strong>; },
        em({ children }) { return <em className="italic">{children}</em>; },
        h1({ children }) { return <h1 className="text-sm font-bold my-2">{children}</h1>; },
        h2({ children }) { return <h2 className="text-xs font-bold my-1.5">{children}</h2>; },
        h3({ children }) { return <h3 className="text-xs font-semibold my-1">{children}</h3>; },
        blockquote({ children }) { return <blockquote className="border-l-2 pl-2 my-1 opacity-80" style={{ borderColor: "var(--border)" }}>{children}</blockquote>; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

const MODEL_STORAGE_KEY = "tradezen.chat.model";
const CHAT_SIZE_STORAGE_KEY = "tradezen.chat.box.v3";
const CHAT_PANEL_DEFAULT = { w: 720, h: 780 };
const FALLBACK_MODEL = "default";
const MAX_CHAT_MESSAGES = 80;

function cleanMarkdownArtifacts(text: string): string {
  let s = text;
  s = s.replace(/\*\*\s+([^*\n]+?)\s+\*\*/g, "**$1**");
  s = s.replace(/\*\s+([^*\n]+?)\s+\*/g, "*$1*");
  s = s.replace(/`\s+([^`\n]+?)\s+`/g, "`$1`");
  s = s.replace(/__\s+([^_\n]+?)\s+__/g, "__$1__");
  s = s.replace(/(^|\n)\s*\|\s*/g, "$1");
  s = s.replace(/\s*\|\s*(\n|$)/g, "$1");
  return s;
}

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
  const [width, setWidth] = useState(720);
  const [height, setHeight] = useState(780);
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [ready, setReady] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStateRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const streamAbortRef = useRef<AbortController | null>(null);
  const tokenBufferRef = useRef("");
  const tokenFlushRafRef = useRef<number | null>(null);
  const resizeDirRef = useRef<"n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null>(null);
  const sendingRef = useRef(false);

  const flushTokenBufferToState = useCallback(() => {
    const chunk = tokenBufferRef.current;
    tokenBufferRef.current = "";
    if (!chunk) return;
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last.role !== "assistant") {
        updated.push({ role: "assistant", content: cleanMarkdownArtifacts(chunk) });
        return capChatMessages(updated);
      }
      updated[updated.length - 1] = {
        ...last,
        content: cleanMarkdownArtifacts(`${last.content}${chunk}`),
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
    try { window.localStorage.setItem(MODEL_STORAGE_KEY, model); } catch {}
  }, [model]);

  useEffect(() => {
    const saved = window.localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
    if (saved) {
      try {
        const { w, h, l, t } = JSON.parse(saved);
        if (typeof w === "number" && typeof h === "number") {
          setWidth(w);
          setHeight(h);
        }
        if (typeof l === "number" && typeof t === "number") {
          setLeft(l);
          setTop(t);
        }
      } catch {
        // Use defaults
      }
    } else {
      const w = CHAT_PANEL_DEFAULT.w;
      const h = CHAT_PANEL_DEFAULT.h;
      setLeft(Math.max(0, window.innerWidth - w - 24));
      setTop(Math.max(0, window.innerHeight - h - 88));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const panel = panelRef.current;
      if (!panel) return;

      if (isDraggingRef.current) {
        const d = dragStateRef.current;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        const nextLeft = Math.max(0, Math.min(window.innerWidth - 60, d.startLeft + dx));
        const nextTop = Math.max(0, Math.min(window.innerHeight - 60, d.startTop + dy));
        setLeft(nextLeft);
        setTop(nextTop);
        try { window.localStorage.setItem(CHAT_SIZE_STORAGE_KEY, JSON.stringify({ w: width, h: height, l: nextLeft, t: nextTop })); } catch {}
        return;
      }

      if (!isResizingRef.current || !resizeDirRef.current) return;

      const rect = panel.getBoundingClientRect();
      const dir = resizeDirRef.current;
      const MIN_W = 320;
      const MIN_H = 240;
      const MAX_W = window.innerWidth;
      const MAX_H = window.innerHeight;

      let nextW = width;
      let nextH = height;
      let nextL = left;
      let nextT = top;

      if (dir.includes("e")) {
        nextW = Math.max(MIN_W, Math.min(MAX_W - left, e.clientX - rect.left));
      }
      if (dir.includes("w")) {
        const proposedW = Math.max(MIN_W, rect.right - e.clientX);
        const actualW = Math.min(proposedW, rect.right);
        if (actualW >= MIN_W) {
          nextW = actualW;
          nextL = rect.right - actualW;
        }
      }
      if (dir.includes("s")) {
        nextH = Math.max(MIN_H, Math.min(MAX_H - top, e.clientY - rect.top));
      }
      if (dir.includes("n")) {
        const proposedH = Math.max(MIN_H, rect.bottom - e.clientY);
        const actualH = Math.min(proposedH, rect.bottom);
        if (actualH >= MIN_H) {
          nextH = actualH;
          nextT = rect.bottom - actualH;
        }
      }

      setWidth(nextW);
      setHeight(nextH);
      setLeft(nextL);
      setTop(nextT);
      try { window.localStorage.setItem(CHAT_SIZE_STORAGE_KEY, JSON.stringify({ w: nextW, h: nextH, l: nextL, t: nextT })); } catch {}
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      isDraggingRef.current = false;
      resizeDirRef.current = null;
    };

    const handleHeaderMouseDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest("select, button, input, textarea, [data-no-drag]")) return;
      isDraggingRef.current = true;
      const d = dragStateRef.current;
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.startLeft = left;
      d.startTop = top;
      e.preventDefault();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    const header = headerRef.current;
    if (header) {
      header.addEventListener("mousedown", handleHeaderMouseDown);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (header) {
        header.removeEventListener("mousedown", handleHeaderMouseDown);
      }
    };
  }, [width, height, left, top]);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [messages, open]);

  const canSend = useMemo(() => input.trim().length > 0 && !isStreaming, [input, isStreaming]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || isStreaming || sendingRef.current) return;
    sendingRef.current = true;

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
        systemPrompt: `You are a trading assistant. STRICT MARKDOWN FORMATTING RULES:
- Use **bold** (NO spaces between ** and the text) for section headers
- Use - bullet points for lists (one per line, NOT separated by |)
- Use real newlines (blank line) between paragraphs
- Use \`code\` for numbers
- NEVER use | as a separator
- NEVER put spaces inside ** like ** text ** (always write **text**)
- Keep responses concise and scannable

Example output:
**Risk Analysis**
Your current drawdown is **3.2%** of equity.
- Max loss this week: -$420
- Win rate: 58%
- Profit factor: 1.8

Key takeaway: Reduce position size on EUR/USD.`,
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
          sendingRef.current = false;
        },
      });
    } catch (err) {
      if (tokenFlushRafRef.current != null) {
        cancelAnimationFrame(tokenFlushRafRef.current);
        tokenFlushRafRef.current = null;
      }
      tokenBufferRef.current = "";
      setIsStreaming(false);
      sendingRef.current = false;
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
          background: "var(--text-primary)",
          color: "var(--bg-primary)",
          border: "1px solid var(--border)",
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
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
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
                    background: message.role === "user" ? "var(--text-primary)" : "var(--bg-panel)",
                    color: message.role === "user" ? "var(--bg-primary)" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  <MarkdownContent content={message.content} isStreaming={isStreaming} />
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
                  background: canSend ? "var(--text-primary)" : "var(--border)",
                  color: canSend ? "var(--bg-primary)" : "var(--text-dim)",
                  border: "1px solid var(--border)",
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                {isStreaming ? "..." : "SEND"}
              </button>
            </div>
          </div>

          {/* Desktop floating panel */}
          <section
            ref={panelRef}
            className="hidden md:block"
            style={{
              position: "fixed",
              left: left,
              top: top,
              zIndex: 40,
              width: width,
              height: height,
              display: ready ? "flex" : "none",
              flexDirection: "column",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              boxShadow: "0 8px 40px rgba(0, 0, 0, 0.35)",
              userSelect: "none",
            }}
          >
            <header
              ref={headerRef}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: "1px solid var(--border)",
                gap: 8,
                cursor: "grab",
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
                    background: message.role === "user" ? "var(--text-primary)" : "var(--bg-panel)",
                    color: message.role === "user" ? "var(--bg-primary)" : "var(--text-primary)",
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
                  <MarkdownContent content={message.content} isStreaming={isStreaming} />
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
                  background: canSend ? "var(--text-primary)" : "var(--border)",
                  color: canSend ? "var(--bg-primary)" : "var(--text-dim)",
                  border: "1px solid var(--border)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                {isStreaming ? "..." : "SEND"}
              </button>
            </div>

            {/* Resize handles — 4 corners + 4 edges */}
            {/* Corners */}
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "nw"; }}
              title="Drag to resize"
              style={{ position: "absolute", top: 0, left: 0, width: 14, height: 14, cursor: "nwse-resize", zIndex: 3 }}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "ne"; }}
              title="Drag to resize"
              style={{ position: "absolute", top: 0, right: 0, width: 14, height: 14, cursor: "nesw-resize", zIndex: 3 }}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "sw"; }}
              title="Drag to resize"
              style={{ position: "absolute", bottom: 0, left: 0, width: 14, height: 14, cursor: "nesw-resize", zIndex: 3 }}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "se"; }}
              title="Drag to resize"
              style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, cursor: "nwse-resize", zIndex: 3 }}
            />
            {/* Edges */}
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "n"; }}
              title="Drag to resize height"
              style={{ position: "absolute", top: 0, left: 14, right: 14, height: 6, cursor: "ns-resize", zIndex: 2 }}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "s"; }}
              title="Drag to resize height"
              style={{ position: "absolute", bottom: 0, left: 14, right: 14, height: 6, cursor: "ns-resize", zIndex: 2 }}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "w"; }}
              title="Drag to resize width"
              style={{ position: "absolute", top: 14, bottom: 14, left: 0, width: 6, cursor: "ew-resize", zIndex: 2 }}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; resizeDirRef.current = "e"; }}
              title="Drag to resize width"
              style={{ position: "absolute", top: 14, bottom: 14, right: 0, width: 6, cursor: "ew-resize", zIndex: 2 }}
            />
          </section>
        </>
      )}
    </>
  );
}
