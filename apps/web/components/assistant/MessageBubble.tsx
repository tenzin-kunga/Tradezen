"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/hooks/useChat";
import type { WorkspaceAction } from "@/lib/api/assistant";
import { normalizeAssistantMarkdown } from "@/lib/assistant/normalizeMarkdown";
import ToolCallBlock from "./ToolCallBlock";
import { IconSparkle } from "./icons";

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
      <IconSparkle size={14} />
    </div>
  );
}

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={copy}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 6,
          border: "1px solid var(--border, #23252d)",
          background: "var(--bg-surface, #12131a)",
          color: "var(--text-muted, #9ca3af)",
          cursor: "pointer",
          opacity: 0.85,
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre ref={preRef}>{children}</pre>
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

export default function MessageBubble({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction?: (action: WorkspaceAction) => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isStreaming = message.content === "" && message.role === "assistant";

  if (isSystem) return null;

  if (message.type === "tool_call" || message.type === "tool_result") {
    return <ToolCallBlock message={message} />;
  }

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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                }}
              >
                {normalizeAssistantMarkdown(message.content)}
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
        {message.actions && message.actions.length > 0 && onAction && (
          <div
            style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}
          >
            {message.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => onAction(action)}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border, #23252d)",
                  background: "var(--bg-surface, #12131a)",
                  color: "var(--text-primary, #fafafa)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
