import type { DashboardLayout } from "@/lib/layout-types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function authFetch(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...opts,
    headers,
    credentials: "include",
  });

  // Try refresh on 401
  if (res.status === 401 && !url.includes("/auth/refresh")) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      return fetch(url, { ...opts, headers, credentials: "include" });
    }
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  const json = await res.json();
  // Unwrap tRPC response: {"result":{"data":...}} → data
  if (json?.result?.data) {
    return json.result.data.json ?? json.result.data;
  }
  return json;
}

// ─── Auth ──────────────────────────────────────────

export async function register(data: {
  email: string;
  username: string;
  password: string;
}) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  const body = await handleResponse<{ access_token: string; user: any }>(res);
  setAccessToken(body.access_token);
  return body;
}

export async function googleLogin(credential: string) {
  const res = await fetch(`${API}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
    credentials: "include",
  });
  const body = await handleResponse<{ access_token: string; user: any }>(res);
  setAccessToken(body.access_token);
  return body;
}

export async function login(data: {
  identifier: string;
  password: string;
  remember_me?: boolean;
}) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  const body = await handleResponse<{ access_token: string; user: any }>(res);
  setAccessToken(body.access_token);
  return body;
}

export async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const body = await res.json();
      setAccessToken(body.access_token);
      window.localStorage.setItem("tradezen_access_token", body.access_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getMe() {
  const res = await authFetch(`${API}/auth/me`);
  return handleResponse<{
    id: string;
    email: string;
    username: string;
    created_at: string;
    initial_capital: number;
    default_lot_size: number;
    timezone: string;
    theme: string;
  }>(res);
}

export async function updateSettings(data: {
  initial_capital?: number;
  default_lot_size?: number;
  timezone?: string;
  theme?: string;
}) {
  const res = await authFetch(`${API}/auth/settings`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return handleResponse<{
    id: string;
    email: string;
    username: string;
    created_at: string;
    initial_capital: number;
    default_lot_size: number;
    timezone: string;
    theme: string;
  }>(res);
}

export async function logout() {
  await authFetch(`${API}/auth/logout`, { method: "POST" });
  setAccessToken(null);
}

// ─── Trades ────────────────────────────────────────

export const createTrade = async (data: {
  symbol: string;
  direction: "buy" | "sell";
  entry: number;
  exit: number;
  lot: number;
  contract_size?: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  strategy?: string | null;
  notes?: string | null;
  fomo_check?: boolean;
  trend_alignment?: boolean;
  vengeance_trade?: boolean;
  trade_date?: string | null;
  commission?: number | null;
}) => {
  const res = await authFetch(`${API}/trades`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
};

export const getTrades = async (params?: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  symbol?: string;
  direction?: string;
  strategy?: string;
  from?: string;
  to?: string;
  tagId?: string;
}) => {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
    });
  }
  const qs = query.toString();
  const res = await authFetch(`${API}/trades${qs ? `?${qs}` : ""}`);
  return handleResponse<{
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(res);
};

export const getTrade = async (id: string) => {
  const res = await authFetch(`${API}/trades/${id}`);
  return handleResponse<any>(res);
};

export const updateTrade = async (id: string, data: Record<string, any>) => {
  const res = await authFetch(`${API}/trades/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
};

export const deleteTrade = async (id: string) => {
  const res = await authFetch(`${API}/trades/${id}`, { method: "DELETE" });
  return handleResponse<{ deleted: boolean }>(res);
};

export const uploadTradeImage = async (tradeId: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await authFetch(`${API}/trades/${tradeId}/images`, {
    method: "POST",
    body: form,
  });
  return handleResponse<{ id: string; url: string; thumbnailUrl: string }>(res);
};

export const deleteTradeImage = async (tradeId: string, imageId: string) => {
  const res = await authFetch(`${API}/trades/${tradeId}/images/${imageId}`, {
    method: "DELETE",
  });
  return handleResponse<{ success: boolean }>(res);
};

// ─── Analytics ─────────────────────────────────────

export const getAnalytics = async () => {
  const res = await authFetch(`${API}/trades/analytics`);
  return handleResponse<any>(res);
};

export interface DashboardData {
  weeklyTrades: number;
  weeklyPnl: number;
  weeklyWinRate: number;
  totalPnl: number;
  overallWinRate: number;
  equityCurve: { date: string; equity: number }[];
  dailySummary: {
    tradesToday: number;
    winRateToday: number;
    pnlToday: number;
    openRisk: number;
  };
  behaviorAnalytics: {
    disciplineScore: number;
    fomoScore: "Low" | "Medium" | "High";
    revengeTradesThisMonth: number;
    trendAlignment: number;
  };
  insights: {
    bestStrategy: string;
    bestDay: string;
    avgRR: number;
    profitFactor: number;
  };
  heatmap: {
    date: string;
    trades: number;
    pnl: number;
    disciplined: boolean;
  }[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
  const res = await authFetch(`${API}/trades/dashboard`);
  return handleResponse<DashboardData>(res);
};

export const getJournalLatest = async () => {
  const res = await authFetch(`${API}/journals?limit=1`);
  const data = await handleResponse<{ data: any[]; total: number }>(res);
  return data.data[0] || null;
};

export const getStrategyAnalytics = async () => {
  const res = await authFetch(`${API}/trades/analytics/strategy`);
  return handleResponse<any>(res);
};

export const getStrategyPerformance = async (name: string) => {
  const res = await authFetch(
    `${API}/trades/analytics/strategy/${encodeURIComponent(name)}/performance`,
  );
  return handleResponse<any>(res);
};

export const getAdvancedAnalytics = async () => {
  const res = await authFetch(`${API}/trades/analytics/advanced`);
  return handleResponse<any>(res);
};

export const getRiskAnalytics = async () => {
  const res = await authFetch(`${API}/trades/analytics/risk`);
  return handleResponse<any>(res);
};

export const getDailyPnl = async (from?: string, to?: string) => {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const qs = query.toString();
  const res = await authFetch(`${API}/trades/daily-pnl${qs ? `?${qs}` : ""}`);
  return handleResponse<any[]>(res);
};

export const exportCsv = async () => {
  const res = await authFetch(`${API}/trades/export/csv`);
  if (!res.ok) throw new Error("Export failed");
  return res.text();
};

export const importCsv = async (
  file: File,
): Promise<{ jobId: string; message: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authFetch(`${API}/trades/import/csv`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<{ jobId: string; message: string }>(res);
};

export type ImportJobStatus = {
  id: string;
  name: string;
  progress: number | Record<string, unknown>;
  state: string;
  result?: { imported: number; errors: string[] };
  failedReason?: string;
};

export const getImportJobStatus = async (
  jobId: string,
): Promise<ImportJobStatus | null> => {
  const res = await authFetch(`${API}/trades/import/jobs/${jobId}`);
  if (res.status === 404) return null;
  return handleResponse<ImportJobStatus>(res);
};

// ─── Journals ──────────────────────────────────────

export const createJournal = async (data: Record<string, any>) => {
  const res = await authFetch(`${API}/journals`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
};

export const getJournals = async (limit = 30, offset = 0) => {
  const res = await authFetch(
    `${API}/journals?limit=${limit}&offset=${offset}`,
  );
  return handleResponse<{ data: any[]; total: number }>(res);
};

export const getJournalByDate = async (date: string) => {
  const res = await authFetch(`${API}/journals/date/${date}`);
  return handleResponse<any>(res);
};

export const updateJournal = async (id: string, data: Record<string, any>) => {
  const res = await authFetch(`${API}/journals/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
};

export const deleteJournal = async (id: string) => {
  const res = await authFetch(`${API}/journals/${id}`, { method: "DELETE" });
  return handleResponse<{ deleted: boolean }>(res);
};

export const getJournalStreak = async () => {
  const res = await authFetch(`${API}/journals/streak`);
  return handleResponse<{
    currentStreak: number;
    longestStreak: number;
    totalEntries: number;
  }>(res);
};

// ─── Search ─────────────────────────────────────────

export interface GlobalSearchResult {
  trades: Array<{
    id: string;
    symbol: string;
    direction: string;
    pnl: string;
    strategy: string | null;
    notes: string | null;
    created_at: string;
  }>;
  journals: Array<{
    id: string;
    date: string;
    mood: string | null;
    lessons: string | null;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
    category: string | null;
  }>;
}

export const globalSearch = async (q: string): Promise<GlobalSearchResult> => {
  const res = await authFetch(
    `${API}/search/global?q=${encodeURIComponent(q)}`,
  );
  return handleResponse<GlobalSearchResult>(res);
};

// ─── Layout ─────────────────────────────────────────

export const getLayout = async (): Promise<DashboardLayout | null> => {
  try {
    const res = await authFetch(`${API}/auth/layout`);
    return handleResponse<DashboardLayout>(res);
  } catch {
    return null;
  }
};

export const saveLayout = async (layout: DashboardLayout): Promise<void> => {
  await authFetch(`${API}/auth/layout`, {
    method: "PATCH",
    body: JSON.stringify(layout),
  });
};

// ─── Tags ──────────────────────────────────────────

export const createTag = async (data: {
  name: string;
  color?: string;
  category?: string;
}) => {
  const res = await authFetch(`${API}/tags`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
};

export const getTags = async () => {
  const res = await authFetch(`${API}/tags`);
  return handleResponse<any[]>(res);
};

export const updateTag = async (id: string, data: Record<string, any>) => {
  const res = await authFetch(`${API}/tags/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
};

export const deleteTag = async (id: string) => {
  const res = await authFetch(`${API}/tags/${id}`, { method: "DELETE" });
  return handleResponse<{ deleted: boolean }>(res);
};

export const tagTrade = async (tagId: string, tradeId: string) => {
  const res = await authFetch(`${API}/tags/${tagId}/trades/${tradeId}`, {
    method: "POST",
  });
  return handleResponse<any>(res);
};

export const untagTrade = async (tagId: string, tradeId: string) => {
  const res = await authFetch(`${API}/tags/${tagId}/trades/${tradeId}`, {
    method: "DELETE",
  });
  return handleResponse<any>(res);
};

export const getTagsForTrade = async (tradeId: string) => {
  const res = await authFetch(`${API}/tags/trade/${tradeId}`);
  return handleResponse<any[]>(res);
};

// ─── Chat ──────────────────────────────────────────

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StreamChatParams = {
  messages: ChatMessage[];
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  /** Abort to stop the stream (e.g. unmount, new message, panel close). */
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onDone?: () => void;
};

export async function getChatModels() {
  const res = await authFetch(`${API}/chat/models`);
  return handleResponse<{ defaultModel: string; models: string[] }>(res);
}

async function authFetchStream(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
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
  if (res.status === 401 && !url.includes("/auth/refresh")) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      res = await makeRequest();
    }
  }

  return res;
}

function isAbortError(e: unknown): boolean {
  if (
    e &&
    typeof e === "object" &&
    "name" in e &&
    (e as { name: string }).name === "AbortError"
  )
    return true;
  return false;
}

export async function streamChat(params: StreamChatParams): Promise<void> {
  const {
    messages,
    model,
    systemPrompt,
    temperature,
    signal,
    onToken,
    onDone,
  } = params;

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

      const { done, value } = read;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        let eventName = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            data += line.slice(5);
          }
        }

        if (eventName === "token" && data) {
          onToken(data);
        } else if (eventName === "error") {
          throw new Error(data || "Chat request failed");
        } else if (eventName === "done") {
          onDone?.();
          return;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  onDone?.();
}

// ─── Notifications ──────────────────────────────────

export async function getNotifications(limit = 10) {
  const res = await authFetch(`${API}/chat/notifications?limit=${limit}`);
  return handleResponse<any[]>(res);
}

export async function getNotificationCount() {
  const res = await authFetch(`${API}/chat/notifications/count`);
  return handleResponse<{ count: number }>(res);
}

export async function markNotificationRead(id: string) {
  const res = await authFetch(`${API}/chat/notifications/${id}/read`, {
    method: "POST",
  });
  return handleResponse<{ message: string }>(res);
}

export async function markAllNotificationsRead() {
  const res = await authFetch(`${API}/chat/notifications/read-all`, {
    method: "POST",
  });
  return handleResponse<{ message: string }>(res);
}

export async function getNotificationPreferences() {
  const res = await authFetch(`${API}/chat/notifications/preferences`);
  return handleResponse<Record<string, boolean>>(res);
}

export async function updateNotificationPreference(
  type: string,
  enabled: boolean,
) {
  const res = await authFetch(`${API}/chat/notifications/preferences`, {
    method: "PUT",
    body: JSON.stringify({ type, enabled }),
  });
  return handleResponse<{ message: string }>(res);
}

// ─── AI Insights ─────────────────────────────────────

export interface AiInsight {
  id: string;
  category: "performance" | "discipline" | "risk" | "consistency";
  title: string;
  message: string;
  metrics: Record<string, unknown>;
  createdAt: string;
}

export interface AiInsightsResponse {
  insights: AiInsight[];
  generatedAt: string;
}

export const getAiInsights = async (): Promise<AiInsightsResponse> => {
  const res = await authFetch(`${API}/ai/insights`);
  return handleResponse<AiInsightsResponse>(res);
};

// ─── Seed / Data Management ──────────────────────────

export async function seedMockData() {
  const res = await authFetch(`${API}/seed`, { method: "POST" });
  return handleResponse<{ message: string }>(res);
}

export async function deleteAllSeedData() {
  const res = await authFetch(`${API}/seed`, { method: "DELETE" });
  return handleResponse<{ message: string }>(res);
}

// ─── Checklists ─────────────────────────────────────

export async function getChecklists() {
  const res = await authFetch(`${API}/trpc/checklists.list`);
  return handleResponse<any[]>(res);
}

export async function getChecklist(id: string) {
  const res = await authFetch(
    `${API}/trpc/checklists.get?input=${encodeURIComponent(JSON.stringify({ id }))}`,
  );
  return handleResponse<any>(res);
}

export async function createChecklist(data: {
  name: string;
  description?: string;
  items: { title: string; isCritical?: boolean }[];
}) {
  const res = await authFetch(`${API}/trpc/checklists.create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
}

export async function updateChecklist(id: string, data: Record<string, any>) {
  const res = await authFetch(`${API}/trpc/checklists.update`, {
    method: "POST",
    body: JSON.stringify({ id, ...data }),
  });
  return handleResponse<any>(res);
}

export async function deleteChecklist(id: string) {
  const res = await authFetch(`${API}/trpc/checklists.remove`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  return handleResponse<{ deleted: boolean }>(res);
}

export async function cloneChecklist(id: string) {
  const res = await authFetch(`${API}/trpc/checklists.clone`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  return handleResponse<any>(res);
}

export async function getChecklistRuns(checklistId: string) {
  const res = await authFetch(
    `${API}/trpc/checklists.runs.list?input=${encodeURIComponent(JSON.stringify({ checklistId }))}`,
  );
  return handleResponse<any[]>(res);
}

export async function createChecklistRun(data: {
  checklistId: string;
  tradeId?: string | null;
  note?: string | null;
}) {
  const res = await authFetch(`${API}/trpc/checklists.runs.create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<any>(res);
}

export async function getChecklistRun(id: string) {
  const res = await authFetch(
    `${API}/trpc/checklists.runs.get?input=${encodeURIComponent(JSON.stringify({ id }))}`,
  );
  return handleResponse<any>(res);
}

export async function updateChecklistRunItem(
  runId: string,
  itemId: string,
  checked: boolean,
) {
  const res = await authFetch(`${API}/trpc/checklists.runs.updateItem`, {
    method: "POST",
    body: JSON.stringify({ runId, itemId, checked }),
  });
  return handleResponse<any>(res);
}

export async function deleteChecklistRun(id: string) {
  const res = await authFetch(`${API}/trpc/checklists.runs.remove`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  return handleResponse<{ deleted: boolean }>(res);
}

// ─── Reports ────────────────────────────────────────

export async function getWeeklyReport() {
  const res = await authFetch(`${API}/reports/weekly`);
  return handleResponse<any>(res);
}

export async function downloadCSV(): Promise<Blob> {
  const res = await authFetch(`${API}/reports/export/csv`);
  if (!res.ok) throw new Error("CSV export failed");
  return res.blob();
}
