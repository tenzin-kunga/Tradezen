"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamChat, type ChatMessageDto } from "@/lib/api/assistant";
import type { KnowledgeDocument } from "@/lib/api/knowledge";

interface KnowledgeAIChatProps {
  document: KnowledgeDocument;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

let msgCounter = 0;
function nextId(): string {
  return `kmsg_${Date.now()}_${++msgCounter}`;
}

const SYSTEM_PROMPT = `You are a knowledgeable trading assistant helping with investment research. 
The user has opened a document in their Knowledge workspace. 
Use the document content as context when answering questions.
Be concise, analytical, and actionable. 
Cite specific sections of the document when relevant.
If the document is a thesis, help analyze risks and catalysts.
If it's a playbook, help refine the strategy.
If it's a macro note, help identify implications for trading.`;

export default function KnowledgeAIChat({
  document: doc,
}: KnowledgeAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const lastContent = messages[messages.length - 1]?.content;

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, lastContent]);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: Message = {
        id: nextId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      // Build message history with document context
      const apiMessages: ChatMessageDto[] = [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n---\n\nDocument: "${doc.title}"\nType: ${doc.docType}\n\nContent:\n${(doc.content || "").slice(0, 3000)}`,
        },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: content.trim() },
      ];

      // Add assistant placeholder
      const assistantMsg: Message = {
        id: nextId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setIsStreaming(true);
        await streamChat({
          messages: apiMessages,
          signal: controller.signal,
          onToken: (token) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
              }
              return updated;
            });
          },
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("Stream error:", e);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [doc, messages, isStreaming],
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid var(--border, #23252d)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 32,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-dim, #6b7280)",
            letterSpacing: "0.05em",
          }}
        >
          AI CHAT
        </span>
        {isStreaming && (
          <button
            onClick={() => abortRef.current?.abort()}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              background: "var(--accent-loss, #ef4444)",
              color: "#fff",
              border: "none",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 20 }}>💬</div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted, #9ca3af)",
                textAlign: "center",
                maxWidth: 300,
              }}
            >
              Ask questions about this document. The AI has access to the full
              content.
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color:
                    msg.role === "user"
                      ? "var(--accent, #3b82f6)"
                      : "var(--text-dim, #6b7280)",
                  marginBottom: 4,
                }}
              >
                {msg.role === "user" ? "You" : "Assistant"}
              </div>
              {msg.role === "assistant" && msg.content === "" ? (
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--text-muted, #9ca3af)",
                        animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                  <style>{`
                    @keyframes pulse {
                      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                      40% { opacity: 1; transform: scale(1); }
                    }
                  `}</style>
                </div>
              ) : (
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  style={{ fontSize: 13, lineHeight: 1.6 }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 16px 12px", flexShrink: 0 }}>
        <div
          className="glass-card"
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={
              isStreaming ? "AI is responding..." : "Ask about this document..."
            }
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary, #fafafa)",
              fontSize: 13,
              lineHeight: 1.5,
              resize: "none",
              maxHeight: 100,
              fontFamily: "inherit",
            }}
          />
          {isStreaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--accent-loss, #ef4444)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: input.trim()
                  ? "var(--accent, #3b82f6)"
                  : "var(--bg-surface-hover, #1a1b23)",
                border: "none",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: input.trim() ? 1 : 0.5,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
