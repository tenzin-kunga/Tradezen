"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import type { WorkspaceAction } from "@/lib/api/assistant";
import { IconChart, IconJournal, IconResearch, IconPortfolio } from "./icons";
import ConversationSidebar from "./ConversationSidebar";
import ConversationCanvas from "./ConversationCanvas";
import ChatInput from "./ChatInput";
import WorkflowSuggestions from "./WorkflowSuggestions";
import SlashCommandPalette from "./SlashCommandPalette";
import AIContextPanel from "./AIContextPanel";
import {
  buildReviewRequest,
  buildResearchRequest,
  buildExplainRequest,
  buildPortfolioRequest,
} from "@/lib/api/assistant";

export default function AssistantWorkspace() {
  const router = useRouter();
  const {
    thread,
    threads,
    messages,
    status,
    error,
    lastContextRequest,
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
  const [workspaceOpen, setWorkspaceOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

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
          case "portfolio":
            contextRequest = buildPortfolioRequest() as Record<string, any>;
            intent = "portfolio";
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
          borderRight: "1px solid var(--border, #23252d)",
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
                {
                  icon: "portfolio",
                  title: "Portfolio snapshot",
                  description: "Current holdings",
                  onClick: handleSend.bind(null, "Show my portfolio"),
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

        <ChatInput onSend={handleSend} onAbort={abort} status={status} />
      </div>

      {/* AI Context panel (collapsible) */}
      {workspaceOpen && (
        <div
          style={{
            width: 280,
            borderLeft: "1px solid var(--border, #23252d)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-sidebar, #0c0c0f)",
          }}
        >
          <AIContextPanel contextRequest={lastContextRequest} />
        </div>
      )}

      {/* Toggle workspace button */}
      <button
        onClick={() => setWorkspaceOpen(!workspaceOpen)}
        style={{
          position: "absolute",
          right: workspaceOpen ? 320 : 0,
          top: 8,
          width: 24,
          height: 24,
          borderRadius: 4,
          background: "var(--bg-surface-hover, #1a1b23)",
          border: "1px solid var(--border, #23252d)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted, #9ca3af)",
          zIndex: 10,
          transition: "right 0.2s",
        }}
        title={workspaceOpen ? "Hide workspace" : "Show workspace"}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {workspaceOpen ? (
            <>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </>
          ) : (
            <>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
