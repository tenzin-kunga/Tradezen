"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getThreads,
  createThread as apiCreateThread,
  deleteThread as apiDeleteThread,
  getThreadMessages,
  streamChat,
  updateThreadTitle,
  type Thread,
  type ChatMessageDto,
} from "@/lib/api/assistant";
import {
  loadChatModel,
  saveChatModel,
  loadLastThread,
  saveLastThread,
} from "@/lib/workspace/persistence";

export type ChatStatus = "idle" | "pending" | "streaming" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type: "text" | "markdown" | "citation" | "tool_call" | "tool_result" | "error";
  timestamp: Date;
  metadata?: {
    citations?: unknown[];
    tokenUsage?: { prompt: number; completion: number };
    model?: string;
    latency?: number;
  };
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
  selectThread: (id: string) => Promise<void>;
  createThread: (title?: string) => Promise<string>;
  deleteThread: (id: string) => Promise<void>;
  send: (content: string, context?: Record<string, unknown>) => Promise<void>;
  abort: () => void;
  setModel: (model: string) => void;
  refreshThreads: () => Promise<void>;
}

let messageCounter = 0;
function nextMessageId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [selectedModel, setSelectedModel] = useState(() => loadChatModel());
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const initialContextRef = useRef(options?.initialContext);
  initialContextRef.current = options?.initialContext;

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
    const lastId = loadLastThread();
    if (lastId && threads.length > 0) {
      const found = threads.find((t) => t.id === lastId);
      if (found) {
        selectThread(found.id);
      }
    }
  }, [threads]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectThread = useCallback(
    async (id: string) => {
      const t = threads.find((thr) => thr.id === id);
      if (!t) return;

      setThread(t);
      saveLastThread(id);

      try {
        const msgs = await getThreadMessages(id);
        setMessages(
          msgs.map((m) => ({
            id: nextMessageId(),
            role: m.role as ChatMessage["role"],
            content: m.content,
            type: "markdown" as const,
            timestamp: new Date(m.createdAt),
            metadata: (m.metadata as ChatMessage["metadata"]) || undefined,
          })),
        );
      } catch (e) {
        console.error("Failed to load messages:", e);
        setMessages([]);
      }
    },
    [threads],
  );

  const createThread = useCallback(
    async (title?: string): Promise<string> => {
      const { id } = await apiCreateThread(title);
      const newThread: Thread = {
        id,
        title: title || "New Conversation",
        updatedAt: new Date().toISOString(),
      };
      setThreads((prev) => [newThread, ...prev]);
      setThread(newThread);
      setMessages([]);
      saveLastThread(id);
      return id;
    },
    [],
  );

  const deleteThread = useCallback(
    async (id: string) => {
      await apiDeleteThread(id);
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (thread?.id === id) {
        setThread(null);
        setMessages([]);
        saveLastThread(null);
      }
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
    async (content: string, context?: Record<string, unknown>) => {
      // Create thread if none active
      let activeThread = thread;
      if (!activeThread) {
        const id = await createThread();
        activeThread = { id, title: content.slice(0, 50), updatedAt: new Date().toISOString() };
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

      // Add context if provided
      if (context) {
        const contextStr = Object.entries(context)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        apiMessages[apiMessages.length - 1].context = contextStr;
      }

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

      // Stream
      const controller = new AbortController();
      abortRef.current = controller;

      const start = Date.now();
      try {
        setStatus("streaming");
        await streamChat({
          messages: apiMessages,
          model: selectedModel || undefined,
          signal: controller.signal,
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
          onDone: () => {
            setStatus("complete");
            // Generate title after first exchange
            if (messages.length === 0 && activeThread) {
              const title = content.length > 50 ? content.slice(0, 50) + "..." : content;
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
      }
    },
    [thread, messages, selectedModel, createThread],
  );

  return {
    thread,
    threads,
    messages,
    status,
    selectedModel,
    error,
    selectThread,
    createThread,
    deleteThread,
    send,
    abort,
    setModel,
    refreshThreads,
  };
}
