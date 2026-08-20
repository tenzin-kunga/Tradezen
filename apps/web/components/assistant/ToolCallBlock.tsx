"use client";

import type { ChatMessage } from "@/hooks/useChat";

function ToolRow({
  toolName,
  status,
  args,
  result,
  success,
  latencyMs,
}: {
  toolName: string;
  status?: string;
  args?: string;
  result?: string;
  success?: boolean;
  latencyMs?: number;
}) {
  const running = status === "started";
  const failed = status === "failed";
  const accent = failed ? "#ef4444" : success === false ? "#ef4444" : "#3b82f6";
  return (
    <div
      style={{
        border: "1px solid var(--border, #23252d)",
        borderRadius: 10,
        background: "var(--bg-sidebar, #0c0c0f)",
        padding: "10px 12px",
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text-primary, #fafafa)",
          fontWeight: 600,
        }}
      >
        <span style={{ color: accent }}>⚙</span>
        <span>{toolName}</span>
        {running && (
          <span style={{ color: "var(--text-muted, #9ca3af)" }}>running…</span>
        )}
        {!running && (
          <span
            style={{ color: "var(--text-muted, #9ca3af)", fontWeight: 400 }}
          >
            {failed ? "failed" : "done"}
            {latencyMs != null ? ` · ${latencyMs}ms` : ""}
          </span>
        )}
      </div>
      {args && args !== "{}" && (
        <pre
          style={{
            margin: "8px 0 0",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--text-muted, #9ca3af)",
            fontSize: 12,
          }}
        >
          {args}
        </pre>
      )}
      {result && (
        <pre
          style={{
            margin: "8px 0 0",
            maxHeight: 200,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--text-primary, #fafafa)",
            fontSize: 12,
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}

export default function ToolCallBlock({ message }: { message: ChatMessage }) {
  const meta = message.metadata;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        padding: "8px 0",
      }}
    >
      <div style={{ width: "75%", minWidth: 0 }}>
        <ToolRow
          toolName={meta?.toolName ?? "tool"}
          status={meta?.toolStatus}
          args={message.type === "tool_call" ? message.content : undefined}
          result={message.type === "tool_result" ? message.content : undefined}
          success={meta?.toolSuccess}
          latencyMs={meta?.toolLatencyMs}
        />
      </div>
    </div>
  );
}
