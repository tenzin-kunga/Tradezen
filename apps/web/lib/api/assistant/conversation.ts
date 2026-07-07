const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  // Import dynamically to avoid circular deps
  const { getAccessToken } = await import("@/lib/api");
  const token = getAccessToken();

  const headers: Record<string, string> = {
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, {
    ...opts,
    headers,
    credentials: "include",
  });
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  return res.json();
}

export interface Thread {
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface ThreadMessage {
  role: string;
  content: string;
  metadata: unknown;
  createdAt: string;
}

export async function getThreads(): Promise<Thread[]> {
  const res = await authFetch(`${API}/chat/threads`);
  return handleResponse<Thread[]>(res);
}

export async function getThread(id: string): Promise<Thread> {
  const res = await authFetch(`${API}/chat/threads/${id}`);
  return handleResponse<Thread>(res);
}

export async function createThread(title?: string): Promise<{ id: string }> {
  const res = await authFetch(`${API}/chat/threads`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return handleResponse<{ id: string }>(res);
}

export async function deleteThread(id: string): Promise<void> {
  await authFetch(`${API}/chat/threads/${id}`, { method: "DELETE" });
}

export async function updateThreadTitle(
  id: string,
  title: string,
): Promise<void> {
  await authFetch(`${API}/chat/threads/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function getThreadMessages(
  threadId: string,
): Promise<ThreadMessage[]> {
  const res = await authFetch(`${API}/chat/threads/${threadId}/messages`);
  return handleResponse<ThreadMessage[]>(res);
}
