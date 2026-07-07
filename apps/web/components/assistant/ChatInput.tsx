"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatStatus } from "@/hooks/useChat";

interface ChatInputProps {
  onSend: (content: string) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "streaming" || status === "pending";

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isStreaming, disabled, onSend]);

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

  return (
    <div
      style={{
        padding: "12px 16px 16px",
        borderTop: "1px solid var(--border, #23252d)",
      }}
    >
      <div
        className="glass-card"
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 12,
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={
            isStreaming ? "AI is responding..." : "Ask anything... (Shift+Enter for newline)"
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="white"
            >
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
  );
}
