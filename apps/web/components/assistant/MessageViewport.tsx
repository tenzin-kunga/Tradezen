"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/useChat";
import type { WorkspaceAction } from "@/lib/api/assistant";
import MessageBubble from "./MessageBubble";

interface MessageViewportProps {
  messages: ChatMessage[];
  onAction?: (action: WorkspaceAction) => void;
}

export default function MessageViewport({
  messages,
  onAction,
}: MessageViewportProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or content changes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messages[messages.length - 1]?.content]);

  if (messages.length === 0) return null;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "0 16px",
      }}
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onAction={onAction} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
