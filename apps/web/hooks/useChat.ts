"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getThreads,
  searchThreads,
  createThread as apiCreateThread,
  deleteThread as apiDeleteThread,
  getThreadMessages,
  streamChat,
  updateThreadTitle,
  togglePinThread,
  type Thread,
  type ChatMessageDto,
  type WorkspaceAction,
} from "@/lib/api/assistant";
import {
  loadChatModel,
  saveChatModel,
  loadLastThread,
  saveLastThread,
} from "@/lib/workspace/persistence";

export type ChatStatus =
  | "idle"
  | "pending"
  | "streaming"
  | "complete"
  | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type:
    | "text"
    | "markdown"
    | "citation"
    | "tool_call"
    | "tool_result"
    | "error";
  timestamp: Date;
  metadata?: {
    citations?: unknown[];
    tokenUsage?: { prompt: number; completion: number };
    model?: string;
    latency?: number;
  };
  actions?: WorkspaceAction[];
}

interface UseChatOptions {
  initialContext?: { tradeId?: string; journalDate?: string; prompt?: string };
}

interface UseChatReturn {
  thread: Thread | null;
  threads: Thread[];
  messages: ChatMessage[];
  status: ChatStatus;
  selectedModel: string;
  error: string | null;
  lastContextRequest: Record<string, any> | null;
  selectThread: (id: string) => Promise<void>;
  createThread: (title?: string) => Promise<string>;
  deleteThread: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  searchThreads: (query: string) => Promise<void>;
  send: (
    content: string,
    contextRequest?: Record<string, any>,
    intent?: string,
    model?: string,
  ) => Promise<void>;
  abort: () => void;
  setModel: (model: string) => void;
  refreshThreads: () => Promise<void>;
}

let messageCounter = 0;
function nextMessageId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

// Local mirror of each thread's messages so a conversation survives
// module remounts / page reloads even if the server doesn't return them.
const MSG_CACHE_PREFIX = "tz_chat_msgs_";
function loadCachedMessages(threadId: string): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(MSG_CACHE_PREFIX + threadId);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : null;
  } catch {
    return null;
  }
}
function saveCachedMessages(threadId: string, msgs: ChatMessage[]) {
  if (msgs.length === 0) return;
  try {
    localStorage.setItem(MSG_CACHE_PREFIX + threadId, JSON.stringify(msgs));
  } catch {
    /* ignore quota / private-mode errors */
  }
}
function clearCachedMessages(threadId: string) {
  try {
    localStorage.removeItem(MSG_CACHE_PREFIX + threadId);
  } catch {
    /* ignore */
  }
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [selectedModel, setSelectedModel] = useState(() => loadChatModel());
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const initialContextRef = useRef(options?.initialContext);
  initialContextRef.current = options?.initialContext;
  const lastContextRequestRef = useRef<Record<string, any> | null>(null);

  // Load threads on mount
  const refreshThreads = useCallback(async () => {
    try {
      const list = await getThreads();
      setThreads(list);
    } catch (e) {
      console.error("Failed to load threads:", e);
    }
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  // Restore last thread
  useEffect(() => {
    if (sendingRef.current) return; // Skip while sending to avoid race condition
    const lastId = loadLastThread();
    if (lastId && threads.length > 0) {
      const found = threads.find((t) => t.id === lastId);
      if (found) {
        selectThread(found.id);
      }
    }
  }, [threads]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror the active conversation to localStorage so it persists across
  // navigation / reload (saved once streaming settles).
  useEffect(() => {
    if (
      thread?.id &&
      messages.length > 0 &&
      status !== "pending" &&
      status !== "streaming"
    ) {
      saveCachedMessages(thread.id, messages);
    }
  }, [thread?.id, messages, status]);

  const selectThread = useCallback(
    async (id: string) => {
      const t = threads.find((thr) => thr.id === id);
      if (!t) return;

      setThread(t);
      saveLastThread(id);

      try {
        const msgs = await getThreadMessages(id);
        let mapped: ChatMessage[] = msgs.map((m) => {
          const meta = m.metadata as
            | {
                type?: string;
                toolName?: string;
                toolStatus?: string;
                toolSuccess?: boolean;
                toolLatencyMs?: number;
              }
            | undefined;
          const type = (
            meta?.type === "tool_call" || meta?.type === "tool_result"
              ? meta.type
              : "markdown"
          ) as ChatMessage["type"];
          return {
            id: nextMessageId(),
            role: m.role as ChatMessage["role"],
            content: m.content,
            type,
            timestamp: new Date(m.createdAt),
            metadata: meta as ChatMessage["metadata"],
          };
        });
        if (mapped.length === 0) {
          const cached = loadCachedMessages(id);
          if (cached) mapped = cached;
        }
        setMessages(mapped);
      } catch (e) {
        console.error("Failed to load messages:", e);
        const cached = loadCachedMessages(id);
        setMessages(cached ?? []);
      }
    },
    [threads],
  );

  const createThread = useCallback(async (title?: string): Promise<string> => {
    const { id } = await apiCreateThread(title);
    const newThread: Thread = {
      id,
      title: title || "New Conversation",
      summary: null,
      primaryType: null,
      tags: null,
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setThread(newThread);
    setMessages([]);
    saveLastThread(id);
    return id;
  }, []);

  const deleteThread = useCallback(
    async (id: string) => {
      await apiDeleteThread(id);
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (thread?.id === id) {
        setThread(null);
        setMessages([]);
        saveLastThread(null);
      }
      clearCachedMessages(id);
    },
    [thread],
  );

  const setModel = useCallback((model: string) => {
    setSelectedModel(model);
    saveChatModel(model);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const send = useCallback(
    async (
      content: string,
      contextRequest?: Record<string, any>,
      intent?: string,
      model?: string,
    ) => {
      // Store for ContextExplorer
      if (contextRequest) lastContextRequestRef.current = contextRequest;
      sendingRef.current = true;

      // Create thread if none active
      let activeThread = thread;
      if (!activeThread) {
        const id = await createThread();
        activeThread = {
          id,
          title: content.slice(0, 50),
          summary: null,
          primaryType: null,
          tags: null,
          pinned: false,
          updatedAt: new Date().toISOString(),
        };
        setThread(activeThread);
      }

      // Add user message
      const userMsg: ChatMessage = {
        id: nextMessageId(),
        role: "user",
        content,
        type: "text",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus("pending");

      // Build message history for API
      const apiMessages: ChatMessageDto[] = [
        ...messages.map((m) => ({
          role: m.role as ChatMessageDto["role"],
          content: m.content,
        })),
        { role: "user" as const, content },
      ];

      // Add initial context prompt
      const ic = initialContextRef.current;
      if (ic?.prompt && messages.length === 0) {
        apiMessages.unshift({
          role: "system",
          content: ic.prompt,
        });
      }

      // Create assistant message placeholder
      const assistantMsg: ChatMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: "",
        type: "markdown",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Track tool messages by tool call id so we can update them in place.
      const toolMsgIds = new Map<string, string>();

      const upsertToolMessage = (id: string, partial: Partial<ChatMessage>) => {
        setMessages((prev) => {
          const existingId = toolMsgIds.get(id);
          const updated = [...prev];
          const idx = existingId
            ? updated.findIndex((m) => m.id === existingId)
            : -1;
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], ...partial, id: existingId! };
          } else {
            const newId = nextMessageId();
            toolMsgIds.set(id, newId);
            updated.splice(updated.length - 1, 0, {
              id: newId,
              role: "assistant",
              content: "",
              type: "tool_call",
              timestamp: new Date(),
              ...partial,
            } as ChatMessage);
          }
          return updated;
        });
      };

      // Stream
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setStatus("streaming");
        await streamChat({
          messages: apiMessages,
          model: model || selectedModel || undefined,
          signal: controller.signal,
          contextRequest,
          intent,
          threadId: activeThread?.id,
          onToken: (token) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
              }
              return updated;
            });
          },
          onToolStatus: (event) => {
            if (event.status === "started") {
              upsertToolMessage(event.id, {
                type: "tool_call",
                content: JSON.stringify(event.args ?? {}),
                metadata: {
                  toolName: event.name,
                  toolStatus: "started",
                } as any,
              });
            } else {
              upsertToolMessage(event.id, {
                type: "tool_result",
                content: event.result ?? "",
                metadata: {
                  toolName: event.name,
                  toolStatus: event.status,
                  toolSuccess: event.success,
                  toolLatencyMs: event.latencyMs,
                } as any,
              });
            }
          },
          onActions: (actions) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  actions: [...(last.actions ?? []), ...actions],
                };
              }
              return updated;
            });
          },
          onResponseReformatted: (markdown) => {
            // ponytail: never let a degraded formatter response wipe the streamed reply
            if (!markdown || !markdown.trim()) return;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: markdown };
              }
              return updated;
            });
          },
          onDone: () => {
            if (controller.signal.aborted) return;
            setStatus("complete");
            // Generate title after first exchange
            if (messages.length === 0 && activeThread) {
              const title =
                content.length > 50 ? content.slice(0, 50) + "..." : content;
              updateThreadTitle(activeThread.id, title).catch(() => {});
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === activeThread.id ? { ...t, title } : t,
                ),
              );
            }
          },
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Stream failed");
        setStatus("error");
      } finally {
        abortRef.current = null;
        sendingRef.current = false;
      }
    },
    [thread, messages, selectedModel, createThread],
  );

  const searchThreadsList = useCallback(async (query: string) => {
    try {
      if (!query.trim()) {
        const list = await getThreads();
        setThreads(list);
        return;
      }
      const results = await searchThreads(query);
      setThreads(results);
    } catch (e) {
      console.error("Failed to search threads:", e);
    }
  }, []);

  const togglePin = useCallback(async (id: string) => {
    try {
      const { pinned } = await togglePinThread(id);
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, pinned } : t)),
      );
    } catch (e) {
      console.error("Failed to toggle pin:", e);
    }
  }, []);

  return {
    thread,
    threads,
    messages,
    status,
    selectedModel,
    error,
    lastContextRequest: lastContextRequestRef.current,
    selectThread,
    createThread,
    deleteThread,
    togglePin,
    searchThreads: searchThreadsList,
    send,
    abort,
    setModel,
    refreshThreads,
  };
}
