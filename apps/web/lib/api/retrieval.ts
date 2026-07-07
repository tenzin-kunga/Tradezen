const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
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

  return fetch(url, { ...opts, headers, credentials: "include" });
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  return res.json();
}

// ─── Evidence Model ──────────────────────────

export interface Evidence {
  source: string;
  score: number;
  reason: string;
  matchedChunks: string[];
  highlights: string[];
}

export interface RelatedResult {
  id: string;
  type: string;
  title: string;
  score: number;
  evidence: Evidence[];
}

export interface DocumentContext {
  document: {
    id: string;
    title: string;
    content: string;
    summary: string;
  };
  related: {
    documents: RelatedResult[];
    trades: RelatedResult[];
    journals: RelatedResult[];
  };
  semantic: {
    chunks: Array<{ content: string; similarity: number }>;
  };
  citations: {
    sources: string[];
  };
}

// ─── Retrieval API ───────────────────────────

export async function getDocumentContext(
  resourceType: string,
  resourceId: string,
  profile: string = "inspector",
): Promise<DocumentContext> {
  const res = await authFetch(
    `${API}/retrieval/context/${resourceType}/${resourceId}?profile=${profile}`,
  );
  return handleResponse<DocumentContext>(res);
}

export async function getRelated(
  resourceType: string,
  resourceId: string,
  profile: string = "inspector",
): Promise<RelatedResult[]> {
  const res = await authFetch(
    `${API}/retrieval/related/${resourceType}/${resourceId}?profile=${profile}`,
  );
  return handleResponse<RelatedResult[]>(res);
}

export async function semanticSearch(
  query: string,
  profile: string = "fast",
): Promise<RelatedResult[]> {
  const res = await authFetch(
    `${API}/retrieval/search/semantic?q=${encodeURIComponent(query)}&profile=${profile}`,
  );
  return handleResponse<RelatedResult[]>(res);
}
