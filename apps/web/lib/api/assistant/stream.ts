const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ChatMessageDto {
  role: "system" | "user" | "assistant";
  content: string;
  context?: string;
}

export interface ToolStatusEvent {
  id: string;
  name: string;
  status: "started" | "completed" | "failed";
  args?: Record<string, unknown>;
  result?: string;
  success?: boolean;
  latencyMs?: number;
}

export interface WorkspaceAction<T = Record<string, unknown>> {
  version: 1;
  kind: "navigate" | "create" | "update" | "open";
  module: string;
  params: T;
  label: string;
}

export interface StreamChatParams {
  messages: ChatMessageDto[];
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  contextRequest?: Record<string, unknown>;
  intent?: string;
  threadId?: string;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onToolStatus?: (event: ToolStatusEvent) => void;
  onActions?: (actions: WorkspaceAction[]) => void;
  onResponseReformatted?: (markdown: string) => void;
  onDone?: () => void;
}

async function authFetchStream(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  const { getAccessToken, refreshToken } = await import("@/lib/api");
  let token = getAccessToken();

  const headers: Record<string, string> = {
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const makeRequest = () =>
    fetch(url, {
      ...opts,
      headers,
      credentials: "include",
    });

  let res = await makeRequest();

  // Token expired — try refresh
  if (res.status === 401 && !url.includes("/auth/refresh")) {
    const refreshed = await refreshToken();
    if (refreshed) {
      token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      res = await makeRequest();
    }
  }

  return res;
}

function isAbortError(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "name" in e &&
    (e as { name: string }).name === "AbortError"
  );
}

export async function streamChat(params: StreamChatParams): Promise<void> {
  const {
    messages,
    model,
    systemPrompt,
    temperature,
    contextRequest,
    intent,
    threadId,
    signal,
    onToken,
    onToolStatus,
    onActions,
    onResponseReformatted,
    onDone,
  } = params;

  let res: Response;
  try {
    res = await authFetchStream(`${API}/chat/stream`, {
      method: "POST",
      signal,
      body: JSON.stringify({
        messages,
        model,
        systemPrompt,
        temperature,
        contextRequest,
        intent,
        threadId,
      }),
    });
  } catch (e) {
    if (signal?.aborted || isAbortError(e)) {
      onDone?.();
      return;
    }
    throw e;
  }

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Chat stream failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      let read: ReadableStreamReadResult<Uint8Array>;
      try {
        read = await reader.read();
      } catch (e) {
        if (signal?.aborted || isAbortError(e)) {
          onDone?.();
          return;
        }
        throw e;
      }

      if (read.done) break;

      buffer += decoder.decode(read.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        const trimmed = line.replace(/\r$/, "");
        if (trimmed.startsWith("event: ")) {
          eventType = trimmed.slice(7).trim();
        } else if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (eventType === "token") {
            onToken(data);
          } else if (eventType === "tool_status") {
            try {
              onToolStatus?.(JSON.parse(data));
            } catch {
              // ignore malformed tool event
            }
          } else if (eventType === "done") {
            onDone?.();
            return;
          } else if (eventType === "actions") {
            try {
              onActions?.(JSON.parse(data));
            } catch {
              // ignore malformed actions event
            }
          } else if (eventType === "response_reformatted") {
            try {
              onResponseReformatted?.(JSON.parse(data));
            } catch {
              // ignore malformed reformat event
            }
          } else if (eventType === "error") {
            throw new Error(data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone?.();
}
