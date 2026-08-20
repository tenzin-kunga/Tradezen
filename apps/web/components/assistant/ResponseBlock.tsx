"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/hooks/useChat";
import type { WorkspaceAction } from "@/lib/api/assistant";
import { normalizeAssistantMarkdown } from "@/lib/assistant/normalizeMarkdown";
import ToolCard from "./ToolCard";
import ActionCard from "./ActionCard";
import SourceCitation, { type Source } from "./SourceCitation";
import { IconSparkle } from "./icons";

interface ResponseBlockProps {
  message: ChatMessage;
  onAction?: (action: WorkspaceAction) => void;
  onActionStateChange?: (action: WorkspaceAction, state: "opened") => void;
}

export default function ResponseBlock({
  message,
  onAction,
  onActionStateChange,
}: ResponseBlockProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isStreaming = message.content === "" && message.role === "assistant";

  if (isSystem) return null;

  if (message.type === "tool_call" || message.type === "tool_result") {
    return <ToolCard message={message} />;
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
      {/* Avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: isUser
            ? "var(--accent, #3b82f6)"
            : "var(--bg-surface-hover, #1a1b23)",
          border: isUser ? "none" : "1px solid var(--border-soft, #23252d)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isUser ? 11 : 14,
          fontWeight: isUser ? 700 : 400,
          color: isUser ? "#fff" : "var(--text-primary, #fafafa)",
          flexShrink: 0,
        }}
      >
        {isUser ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <IconSparkle size={14} />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: isUser ? "78%" : "88%",
          display: "flex",
          flexDirection: "column",
          alignItems: isUser ? "flex-end" : "stretch",
        }}
      >
        <div
          className={isUser ? "" : "tz-panel"}
          style={{
            padding: isUser ? "10px 14px" : "12px 14px",
            borderRadius: 14,
            width: isUser ? "auto" : "100%",
            background: isUser ? "rgba(59, 130, 246, 0.12)" : undefined,
            border: isUser ? "1px solid rgba(59, 130, 246, 0.28)" : undefined,
            maxWidth: "100%",
          }}
        >
          {/* Analysis section */}
          {isStreaming ? (
            <TypingIndicator />
          ) : message.type === "markdown" || message.type === "text" ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {normalizeAssistantMarkdown(message.content)}
              </ReactMarkdown>
            </div>
          ) : message.type === "error" ? (
            <span
              style={{ color: "var(--accent-loss, #ef4444)", fontSize: 14 }}
            >
              {message.content}
            </span>
          ) : (
            <span style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>
              {message.content}
            </span>
          )}

          {/* Evidence section: source citations */}
          {!isStreaming && message.metadata && (
            <SourceCitation sources={extractSources(message.metadata)} />
          )}

          {/* Action cards */}
          {!isStreaming &&
            message.actions &&
            message.actions.length > 0 &&
            onAction && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                {message.actions.map((action, i) => (
                  <ActionCard
                    key={i}
                    icon={getActionIcon(action)}
                    title={action.label}
                    onClick={() => {
                      onAction(action);
                      onActionStateChange?.(action, "opened");
                    }}
                  />
                ))}
              </div>
            )}
        </div>
      </div>
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

function extractSources(_metadata: ChatMessage["metadata"]): Source[] {
  // Extract source information from metadata if available
  // This is a placeholder — real implementation would parse retrieval data
  return [];
}

function getActionIcon(action: WorkspaceAction): string {
  const moduleIcons: Record<string, string> = {
    trades: "chart",
    journal: "journal",
    research: "research",
    portfolio: "portfolio",
    watchlist: "watchlist",
    knowledge: "knowledge",
    assistant: "sparkle",
  };
  return moduleIcons[action.module] || "sparkle";
}
