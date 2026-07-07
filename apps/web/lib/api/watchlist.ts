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

// ─── Watchlists ──────────────────────────────

export interface Watchlist {
  id: string;
  name: string;
  type: string;
  definition: Record<string, unknown> | null;
  definitionVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  symbolId: string;
  priority: number;
  notes: string | null;
  tags: string[];
  alerts: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  ticker: string;
  exchange: string | null;
  name: string | null;
  symbolKey: string;
}

export async function getWatchlists(): Promise<Watchlist[]> {
  const res = await authFetch(`${API}/watchlists`);
  return handleResponse<Watchlist[]>(res);
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const res = await authFetch(`${API}/watchlists`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return handleResponse<Watchlist>(res);
}

export async function deleteWatchlist(id: string): Promise<void> {
  await authFetch(`${API}/watchlists/${id}`, { method: "DELETE" });
}

export async function getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
  const res = await authFetch(`${API}/watchlists/${watchlistId}/items`);
  return handleResponse<WatchlistItem[]>(res);
}

export async function addWatchlistItem(
  watchlistId: string,
  ticker: string,
  exchange?: string,
): Promise<{ id: string }> {
  const res = await authFetch(`${API}/watchlists/${watchlistId}/items`, {
    method: "POST",
    body: JSON.stringify({ ticker, exchange }),
  });
  return handleResponse<{ id: string }>(res);
}

export async function updateWatchlistItem(
  watchlistId: string,
  itemId: string,
  data: { priority?: number; notes?: string; alerts?: Record<string, unknown> },
): Promise<void> {
  await authFetch(`${API}/watchlists/${watchlistId}/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWatchlistItem(
  watchlistId: string,
  itemId: string,
): Promise<void> {
  await authFetch(`${API}/watchlists/${watchlistId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function reorderWatchlist(
  watchlistId: string,
  itemId: string,
  from: number,
  to: number,
): Promise<void> {
  await authFetch(`${API}/watchlists/${watchlistId}/reorder`, {
    method: "POST",
    body: JSON.stringify({ type: "move", itemId, from, to }),
  });
}

// ─── Symbols ─────────────────────────────────

export interface Symbol {
  id: string;
  ticker: string;
  exchange: string | null;
  name: string | null;
  symbolKey: string;
}

export async function searchSymbols(query: string): Promise<Symbol[]> {
  const res = await authFetch(`${API}/symbols/search?q=${encodeURIComponent(query)}`);
  return handleResponse<Symbol[]>(res);
}
