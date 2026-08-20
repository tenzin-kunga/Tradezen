"use client";

import { useState } from "react";
import type { ChatMessage } from "@/hooks/useChat";
import { IconGear } from "./icons";

export default function ToolCard({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  const meta = message.metadata;

  const toolName = meta?.toolName ?? "tool";
  const status = meta?.toolStatus;
  const success = meta?.toolSuccess;
  const latencyMs = meta?.toolLatencyMs;

  const isRunning = status === "started";
  const isFailed = status === "failed" || success === false;
  const isDone = status === "completed" || (status !== "started" && !isFailed);

  const accentColor = isFailed
    ? "var(--accent-loss, #ef4444)"
    : isDone
      ? "var(--accent-profit, #22c55e)"
      : "var(--accent, #3b82f6)";

  const statusText = isRunning
    ? "Searching..."
    : isFailed
      ? "Failed"
      : isDone
        ? "Done"
        : "";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        padding: "4px 0",
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          border: "1px solid var(--border, #23252d)",
          borderRadius: 8,
          background: "var(--bg-sidebar, #0c0c0f)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 12px",
            fontSize: 13,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ color: accentColor, flexShrink: 0 }}>
            <IconGear size={12} />
          </span>
          <span
            style={{
              fontWeight: 500,
              color: "var(--text-primary, #fafafa)",
              flex: 1,
            }}
          >
            {toolName}
          </span>
          <span
            style={{
              fontSize: 12,
              color: accentColor,
              fontWeight: 500,
            }}
          >
            {statusText}
          </span>
          {isDone && latencyMs != null && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-dim, #6b7280)",
              }}
            >
              {latencyMs}ms
            </span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted, #9ca3af)"
            strokeWidth="2"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div
            style={{
              borderTop: "1px solid var(--border, #23252d)",
              padding: "8px 12px",
            }}
          >
            {message.type === "tool_call" && message.content && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-dim, #6b7280)",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Arguments
                </div>
                <pre
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted, #9ca3af)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {message.content}
                </pre>
              </div>
            )}
            {message.type === "tool_result" && message.content && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-dim, #6b7280)",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Result
                </div>
                <pre
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary, #fafafa)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                    maxHeight: 200,
                    overflowY: "auto",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {message.content}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
