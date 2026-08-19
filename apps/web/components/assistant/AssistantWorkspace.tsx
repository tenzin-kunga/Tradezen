"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import type { WorkspaceAction } from "@/lib/api/assistant";
import { IconChart, IconJournal, IconResearch } from "./icons";
import ConversationSidebar from "./ConversationSidebar";
import ConversationCanvas from "./ConversationCanvas";
import ChatInput from "./ChatInput";
import WorkflowSuggestions from "./WorkflowSuggestions";
import SlashCommandPalette from "./SlashCommandPalette";
import {
  buildReviewRequest,
  buildResearchRequest,
  buildExplainRequest,
} from "@/lib/api/assistant";

export default function AssistantWorkspace() {
  const router = useRouter();
  const {
    thread,
    threads,
    messages,
    status,
    error,
    selectThread,
    createThread,
    deleteThread,
    togglePin,
    searchThreads,
    send,
    abort,
  } = useChat();

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const totalTokens = messages.reduce(
    (sum, m) =>
      sum +
      (m.metadata?.tokenUsage?.prompt ?? 0) +
      (m.metadata?.tokenUsage?.completion ?? 0),
    0,
  );

  // Keep the conversation scrolled to the bottom on new messages / streaming.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const handleAction = useCallback(
    (action: WorkspaceAction) => {
      router.push(`/workspace/${action.module}`);
    },
    [router],
  );

  const handleSend = useCallback(
    (content: string, model?: string) => {
      if (content.startsWith("/")) {
        const spaceIdx = content.indexOf(" ");
        const cmd =
          spaceIdx === -1 ? content.slice(1) : content.slice(1, spaceIdx);
        const args = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1).trim();

        let contextRequest: Record<string, any> | undefined;
        let intent: string | undefined;
        switch (cmd) {
          case "review":
            contextRequest = buildReviewRequest() as Record<string, any>;
            intent = "review";
            break;
          case "research":
            if (args)
              contextRequest = buildResearchRequest(args) as Record<
                string,
                any
              >;
            intent = "research";
            break;
          case "explain":
            if (args)
              contextRequest = buildExplainRequest(args) as Record<string, any>;
            intent = "explain";
            break;
        }

        send(content, contextRequest, intent, model);
      } else {
        send(content, undefined, undefined, model);
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
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Thread sidebar */}
      <div
        style={{
          width: 200,
          borderRight: "1px solid var(--border-soft, #23252d)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-sidebar, #0c0c0f)",
        }}
      >
        <ConversationSidebar
          threads={threads}
          activeId={thread?.id ?? null}
          onSelect={selectThread}
          onCreate={() => createThread()}
          onDelete={deleteThread}
          onTogglePin={togglePin}
          onSearch={searchThreads}
        />
      </div>

      {/* Main chat area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          ref={scrollRef}
          className="tz-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {messages.length === 0 && status === "idle" ? (
            <WorkflowSuggestions
              greeting="What would you like to know?"
              contextSummary=""
              suggestions={[
                {
                  icon: "chart",
                  title: "Review today's trades",
                  description: "Analyze performance",
                  onClick: () => handleSend("Review today's trades"),
                },
                {
                  icon: "journal",
                  title: "Write journal entry",
                  description: "End-of-day reflection",
                  onClick: () => handleSend("Write my journal entry for today"),
                },
                {
                  icon: "research",
                  title: "Find trading mistakes",
                  description: "Identify patterns",
                  onClick: () => handleSend("What mistakes did I make today?"),
                },
              ]}
              onSelect={handleSend}
            />
          ) : (
            <ConversationCanvas messages={messages} onAction={handleAction} />
          )}
        </div>

        <SlashCommandPalette
          isOpen={slashOpen}
          onClose={() => setSlashOpen(false)}
          onSelect={(cmd) => {
            handleSend(cmd);
            setSlashOpen(false);
          }}
          filter={slashFilter}
        />

        {error && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(239, 68, 68, 0.1)",
              borderTop: "1px solid rgba(239, 68, 68, 0.2)",
              fontSize: 12,
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          onAbort={abort}
          status={status}
          tokenUsage={totalTokens}
        />
      </div>
    </div>
  );
}
