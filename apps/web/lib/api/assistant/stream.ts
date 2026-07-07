const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ChatMessageDto {
  role: "system" | "user" | "assistant";
  content: string;
  context?: string;
}

export interface StreamChatParams {
  messages: ChatMessageDto[];
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onDone?: () => void;
}

async function authFetchStream(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  const { getAccessToken } = await import("@/lib/api");
  const token = getAccessToken();

  const headers: Record<string, string> = {
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, {
    ...opts,
    headers,
    credentials: "include",
  });
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
  const { messages, model, systemPrompt, temperature, signal, onToken, onDone } =
    params;

  let res: Response;
  try {
    res = await authFetchStream(`${API}/chat/stream`, {
      method: "POST",
      signal,
      body: JSON.stringify({ messages, model, systemPrompt, temperature }),
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
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (eventType === "token") {
            onToken(data);
          } else if (eventType === "done") {
            onDone?.();
            return;
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
