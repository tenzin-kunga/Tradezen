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
  type ContextRequest,
} from "@/lib/api/assistant";
import {
  loadChatModel,
  saveChatModel,
  loadLastThread,
  saveLastThread,
} from "@/lib/workspace/persistence";
import {
  setActiveThread,
  clearReady,
  markThinking,
  markReady,
  clearThinking,
} from "@/lib/chat/activity";
import { cancelStream } from "@/lib/api/assistant/stream";
import { useRealtime } from "@/hooks/use-realtime";

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
    toolName?: string;
    toolStatus?: string;
    toolSuccess?: boolean;
    toolLatencyMs?: number;
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
  lastContextRequest: ContextRequest | null;
  selectThread: (id: string) => Promise<void>;
  createThread: (title?: string) => Promise<string>;
  deleteThread: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  searchThreads: (query: string) => Promise<void>;
  send: (
    content: string,
    contextRequest?: ContextRequest,
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
  // Number of sends currently in flight. Only the LAST stream to finish
  // brings it back to 0, so an older stream's finally can never clear state
  // while a newer stream is still active.
  const sendingCountRef = useRef(0);
  // In-flight thread creation, deduped so a "+" click followed by a quick
  // send resolves to exactly ONE thread id instead of racing two.
  const pendingCreateRef = useRef<Promise<string> | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const liveStreamThreadRef = useRef<string | null>(null);
  const initialContextRef = useRef(options?.initialContext);
  initialContextRef.current = options?.initialContext;
  const lastContextRequestRef = useRef<ContextRequest | null>(null);

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
    if (sendingCountRef.current > 0) return; // Skip while sending to avoid race condition
    const lastId = loadLastThread();
    if (lastId && threads.length > 0) {
      const found = threads.find((t) => t.id === lastId);
      if (found) {
        selectThread(found.id);
      }
    }
  }, [threads]); // eslint-disable-line react-hooks/exhaustive-deps

  // On unmount, release the active-thread claim so a reply that finishes
  // while the user is elsewhere can still toast / flash the sidebar.
  useEffect(() => () => setActiveThread(null), []);

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

  const loadMessagesForThread = useCallback(
    async (id: string, opts?: { completeWhenDone?: boolean }) => {
      try {
        const msgs = await getThreadMessages(id);
        if (threadIdRef.current !== id) return;
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
        // Re-attach to a still-running generation: only when this component
        // owns a live stream for this thread can tokens keep flowing into a
        // placeholder. Otherwise show persisted messages — no stuck spinner.
        if (liveStreamThreadRef.current === id) {
          mapped.push({
            id: nextMessageId(),
            role: "assistant",
            content: "",
            type: "markdown",
            timestamp: new Date(),
          });
          setStatus("streaming");
        } else {
          setStatus(opts?.completeWhenDone ? "complete" : "idle");
        }
        setMessages(mapped);
      } catch (e) {
        if (threadIdRef.current !== id) return;
        console.error("Failed to load messages:", e);
        const cached = loadCachedMessages(id);
        setMessages(cached ?? []);
      }
    },
    [],
  );

  const selectThread = useCallback(
    async (id: string) => {
      const t = threads.find((thr) => thr.id === id);
      if (!t) return;
      // Reselecting the already-active conversation is a no-op; otherwise an
      // unrelated restore/thread-list update could wipe it mid-stream.
      if (threadIdRef.current === id && thread?.id === id) return;

      // ponytail: never kill an in-flight reply on thread switch — the stream
      // keeps running in the background, guarded by streamThreadId.
      threadIdRef.current = id;
      setThread(t);
      setError(null);
      setActiveThread(id);
      clearReady(id);
      saveLastThread(id);

      const live = liveStreamThreadRef.current === id;
      if (live) {
        // Re-attach to the running generation without clearing its messages;
        // loadMessagesForThread merges persisted state + a streaming placeholder.
        void loadMessagesForThread(id);
      } else {
        setMessages([]);
        setStatus("idle");
        void loadMessagesForThread(id);
      }
    },
    [threads, thread?.id, loadMessagesForThread],
  );

  // When the active thread's reply finishes on the server but no local stream
  // is live (e.g. the user navigated away and back mid-generation), reload so
  // the persisted reply appears instead of a stuck placeholder.
  useRealtime(
    "chat:reply-ready",
    useCallback(
      (data: unknown) => {
        const { threadId } = data as { threadId: string };
        if (!threadId || threadId !== threadIdRef.current) return;
        if (liveStreamThreadRef.current === threadId) return;
        void loadMessagesForThread(threadId, { completeWhenDone: true });
      },
      [loadMessagesForThread],
    ),
  );

  const createThread = useCallback(async (title?: string): Promise<string> => {
    // Reuse an in-flight creation: a "+" click followed by a quick send must
    // resolve to exactly ONE authoritative thread id, never two.
    if (pendingCreateRef.current) return pendingCreateRef.current;
    const p = (async () => {
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
      clearCachedMessages(id);
      threadIdRef.current = id;
      setThreads((prev) => [newThread, ...prev]);
      setThread(newThread);
      setMessages([]);
      setStatus("idle");
      setActiveThread(id);
      saveLastThread(id);
      return id;
    })();
    pendingCreateRef.current = p;
    try {
      return await p;
    } finally {
      if (pendingCreateRef.current === p) pendingCreateRef.current = null;
    }
  }, []);

  const deleteThread = useCallback(
    async (id: string) => {
      await apiDeleteThread(id);
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (thread?.id === id) {
        threadIdRef.current = null;
        setThread(null);
        setMessages([]);
        setStatus("idle");
        setActiveThread(null);
        saveLastThread(null);
      }
      clearCachedMessages(id);
      clearReady(id);
      clearThinking(id);
    },
    [thread],
  );

  const setModel = useCallback((model: string) => {
    setSelectedModel(model);
    saveChatModel(model);
  }, []);

  const abort = useCallback(() => {
    const threadId = threadIdRef.current;
    abortRef.current?.abort();
    abortRef.current = null;
    if (threadId) {
      clearThinking(threadId);
      cancelStream(threadId).catch(() => {});
    }
    setStatus("idle");
  }, []);

  const send = useCallback(
    async (
      content: string,
      contextRequest?: ContextRequest,
      intent?: string,
      model?: string,
    ) => {
      // Store for ContextExplorer
      if (contextRequest) lastContextRequestRef.current = contextRequest;
      sendingCountRef.current += 1;

      // Resolve exactly ONE authoritative thread id before streaming or
      // persisting. If a sidebar "+" creation is still in flight, route to it
      // instead of the stale closure thread — never create a second one.
      let activeThread = thread;
      let usingNewThread = false;
      const ensureThread = async (): Promise<Thread> => {
        const id = await createThread();
        const t: Thread = {
          id,
          title: content.slice(0, 50),
          summary: null,
          primaryType: null,
          tags: null,
          pinned: false,
          updatedAt: new Date().toISOString(),
        };
        setThread(t);
        return t;
      };
      try {
        if (pendingCreateRef.current) {
          activeThread = await ensureThread();
          usingNewThread = true;
        } else if (!activeThread) {
          activeThread = await ensureThread();
          usingNewThread = true;
        }
      } catch (e) {
        sendingCountRef.current = Math.max(0, sendingCountRef.current - 1);
        throw e;
      }

      const streamThreadId = activeThread.id;
      markThinking(streamThreadId);

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

      // Build message history for API. For a freshly created thread the
      // closure `messages` still belongs to the previous conversation, so
      // start from just the new user message.
      const history =
        usingNewThread || messages.length === 0
          ? []
          : messages.map((m) => ({
              role: m.role as ChatMessageDto["role"],
              content: m.content,
            }));
      const apiMessages: ChatMessageDto[] = [
        ...history,
        { role: "user" as const, content },
      ];

      // Add initial context prompt
      const ic = initialContextRef.current;
      if (ic?.prompt && apiMessages.length === 1) {
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
      liveStreamThreadRef.current = streamThreadId;

      try {
        setStatus("streaming");
        await streamChat({
          messages: apiMessages,
          model: model || selectedModel || undefined,
          signal: controller.signal,
          contextRequest: contextRequest as unknown as Record<string, unknown>,
          intent,
          threadId: activeThread?.id,
          onToken: (token) => {
            if (threadIdRef.current !== streamThreadId) return;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
              }
              return updated;
            });
          },
          onToolStatus: (event) => {
            if (threadIdRef.current !== streamThreadId) return;
            if (event.status === "started") {
              upsertToolMessage(event.id, {
                type: "tool_call",
                content: JSON.stringify(event.args ?? {}),
                metadata: {
                  toolName: event.name,
                  toolStatus: "started",
                },
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
                },
              });
            }
          },
          onActions: (actions) => {
            if (threadIdRef.current !== streamThreadId) return;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
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
            if (threadIdRef.current !== streamThreadId) return;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: markdown };
              }
              return updated;
            });
          },
          onUsage: (usage) => {
            if (threadIdRef.current !== streamThreadId) return;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  metadata: {
                    ...(last.metadata ?? {}),
                    tokenUsage: {
                      prompt: usage.promptTokens,
                      completion: usage.completionTokens,
                    },
                  },
                };
              }
              return updated;
            });
          },
          onDone: () => {
            const background = threadIdRef.current !== streamThreadId;
            if (controller.signal.aborted) return;
            clearThinking(streamThreadId);
            if (background) {
              markReady(streamThreadId);
            } else {
              setStatus("complete");
            }
            // Generate title after first exchange
            if ((usingNewThread || messages.length === 0) && activeThread) {
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
        clearThinking(streamThreadId);
        if (threadIdRef.current !== streamThreadId) return;
        setError(e instanceof Error ? e.message : "Stream failed");
        setStatus("error");
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (liveStreamThreadRef.current === streamThreadId) {
          liveStreamThreadRef.current = null;
        }
        // Only the last stream to finish clears the shared sending state.
        sendingCountRef.current = Math.max(0, sendingCountRef.current - 1);
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
