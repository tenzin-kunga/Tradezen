const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function authFetch(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  // Import dynamically to avoid circular deps
  const { getAccessToken, refreshToken } = await import("@/lib/api");
  let token = getAccessToken();

  const headers: Record<string, string> = {
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(opts.body instanceof FormData) && !headers["Content-Type"]) {
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

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  return res.json();
}

export type ConversationType =
  | "daily_review"
  | "journal"
  | "research"
  | "portfolio"
  | "risk"
  | "coaching"
  | "general";

export interface Thread {
  id: string;
  title: string | null;
  summary: string | null;
  primaryType: ConversationType | null;
  tags: string[] | null;
  pinned: boolean | null;
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

export async function searchThreads(query: string): Promise<Thread[]> {
  const res = await authFetch(`${API}/chat/threads/search?q=${encodeURIComponent(query)}`);
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

export async function togglePinThread(id: string): Promise<{ pinned: boolean }> {
  const res = await authFetch(`${API}/chat/threads/${id}/pin`, {
    method: "PATCH",
  });
  return handleResponse<{ pinned: boolean }>(res);
}

export async function getThreadMessages(
  threadId: string,
): Promise<ThreadMessage[]> {
  const res = await authFetch(`${API}/chat/threads/${threadId}/messages`);
  return handleResponse<ThreadMessage[]>(res);
}
