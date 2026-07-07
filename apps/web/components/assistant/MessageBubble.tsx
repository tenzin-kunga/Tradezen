"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/hooks/useChat";

function UserAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--accent, #3b82f6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      You
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--bg-surface-hover, #1a1b23)",
        border: "1px solid var(--border, #23252d)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        flexShrink: 0,
      }}
    >
      ✦
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
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
  );
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isStreaming = message.content === "" && message.role === "assistant";

  if (isSystem) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "16px 0",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
      }}
    >
      {isUser ? <UserAvatar /> : <AssistantAvatar />}
      <div
        style={{
          maxWidth: "75%",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted, #9ca3af)",
            marginBottom: 4,
            textAlign: isUser ? "right" : "left",
          }}
        >
          {isUser ? "You" : "Assistant"}
        </div>
        <div
          className="glass-card"
          style={{
            padding: "12px 16px",
            borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
            background: isUser
              ? "var(--accent, #3b82f6)"
              : "var(--bg-surface-hover, #1a1b23)",
            color: isUser ? "#fff" : "var(--text-primary, #fafafa)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {isStreaming ? (
            <TypingIndicator />
          ) : message.type === "markdown" || message.type === "text" ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : message.type === "error" ? (
            <span style={{ color: "var(--accent-loss, #ef4444)" }}>
              {message.content}
            </span>
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
          )}
        </div>
      </div>
    </div>
  );
}
