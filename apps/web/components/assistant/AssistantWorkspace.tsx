"use client";

import { useCallback, useState } from "react";
import { useChat } from "@/hooks/useChat";
import ThreadList from "./ThreadList";
import MessageViewport from "./MessageViewport";
import ChatInput from "./ChatInput";
import SuggestedPrompts from "./SuggestedPrompts";
import SlashCommandPalette from "./SlashCommandPalette";

export default function AssistantWorkspace() {
  const {
    thread,
    threads,
    messages,
    status,
    selectThread,
    createThread,
    deleteThread,
    send,
    abort,
  } = useChat();

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");

  const handleSend = useCallback(
    (content: string) => {
      if (content.startsWith("/")) {
        // Parse slash command
        const spaceIdx = content.indexOf(" ");
        const cmd = spaceIdx === -1 ? content.slice(1) : content.slice(1, spaceIdx);
        // For now, just send as a regular message
        // Slash command routing will be enhanced with CommandRegistry
        send(content);
      } else {
        send(content);
      }
    },
    [send],
  );

  const handleInputChange = useCallback((value: string) => {
    if (value.startsWith("/")) {
      setSlashOpen(true);
      setSlashFilter(value.slice(1));
    } else {
      setSlashOpen(false);
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Thread sidebar */}
      <div
        style={{
          width: 240,
          borderRight: "1px solid var(--border, #23252d)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-sidebar, #0c0c0f)",
        }}
      >
        <ThreadList
          threads={threads}
          activeId={thread?.id ?? null}
          onSelect={selectThread}
          onCreate={() => createThread()}
          onDelete={deleteThread}
        />
      </div>

      {/* Main chat area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          position: "relative",
        }}
      >
        {messages.length === 0 && status === "idle" ? (
          <SuggestedPrompts onSelect={handleSend} />
        ) : (
          <MessageViewport messages={messages} />
        )}

        <SlashCommandPalette
          isOpen={slashOpen}
          onClose={() => setSlashOpen(false)}
          onSelect={(cmd) => {
            handleSend(cmd);
            setSlashOpen(false);
          }}
          filter={slashFilter}
        />

        <ChatInput
          onSend={handleSend}
          onAbort={abort}
          status={status}
        />
      </div>
    </div>
  );
}
