"use client";

import type { ChatMessage } from "@/hooks/useChat";
import type { WorkspaceAction } from "@/lib/api/assistant";
import ResponseBlock from "./ResponseBlock";

interface ConversationCanvasProps {
  messages: ChatMessage[];
  onAction?: (action: WorkspaceAction) => void;
}

export default function ConversationCanvas({
  messages,
  onAction,
}: ConversationCanvasProps) {
  if (messages.length === 0) return null;

  return (
    <div style={{ minHeight: 0, padding: "0 16px" }}>
      {messages.map((msg) => (
        <ResponseBlock key={msg.id} message={msg} onAction={onAction} />
      ))}
    </div>
  );
}
