const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function authFetch(
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

export type ResearchStatus = "idea" | "active" | "on_hold" | "closed";
export type ResearchConviction = "low" | "medium" | "high";

export interface ResearchChecklist {
  thesisComplete: boolean;
  valuationComplete: boolean;
  risksReviewed: boolean;
  earningsReviewed: boolean;
}

export interface ResearchTag {
  id: string;
  label: string;
  color: string;
}

export interface ResearchProject {
  id: string;
  userId: string;
  symbolId: string | null;
  title: string;
  status: ResearchStatus;
  conviction: ResearchConviction;
  ticker: string | null;
  exchange: string | null;
  symbolName: string | null;
  notes: { content: string; version: number } | null;
  checklist: ResearchChecklist | null;
  tags: ResearchTag[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchActivity {
  id: string;
  projectId: string;
  type: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface ListProjectsResult {
  data: ResearchProject[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Projects ──────────────────────────────

export async function listResearchProjects(
  params: {
    status?: ResearchStatus;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<ListProjectsResult> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const res = await authFetch(`${API}/research/projects?${qs.toString()}`);
  return handleResponse<ListProjectsResult>(res);
}

export async function getResearchProject(id: string): Promise<ResearchProject> {
  const res = await authFetch(`${API}/research/projects/${id}`);
  return handleResponse<ResearchProject>(res);
}

export async function createResearchProject(data: {
  title: string;
  symbol_id?: string;
  status?: ResearchStatus;
  conviction?: ResearchConviction;
}): Promise<ResearchProject> {
  const res = await authFetch(`${API}/research/projects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<ResearchProject>(res);
}

export async function updateResearchProject(
  id: string,
  data: {
    title?: string;
    status?: ResearchStatus;
    conviction?: ResearchConviction;
    symbol_id?: string | null;
  },
): Promise<ResearchProject> {
  const res = await authFetch(`${API}/research/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<ResearchProject>(res);
}

export async function deleteResearchProject(id: string): Promise<void> {
  await authFetch(`${API}/research/projects/${id}`, { method: "DELETE" });
}

// ─── Notes ─────────────────────────────────

export interface NotesResult {
  content: string;
  version: number;
}

export async function updateResearchNotes(
  id: string,
  content: string,
  baseVersion?: number,
): Promise<NotesResult> {
  const res = await authFetch(`${API}/research/projects/${id}/notes`, {
    method: "PUT",
    body: JSON.stringify({ content, base_version: baseVersion }),
  });
  return handleResponse<NotesResult>(res);
}

// ─── Checklist ─────────────────────────────

export async function updateResearchChecklist(
  id: string,
  data: Partial<ResearchChecklist>,
): Promise<ResearchChecklist> {
  const res = await authFetch(`${API}/research/projects/${id}/checklist`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<ResearchChecklist>(res);
}

// ─── Tags ──────────────────────────────────

export async function addResearchTag(
  id: string,
  label: string,
  color?: string,
): Promise<ResearchTag> {
  const res = await authFetch(`${API}/research/projects/${id}/tags`, {
    method: "POST",
    body: JSON.stringify({ label, color }),
  });
  return handleResponse<ResearchTag>(res);
}

export async function removeResearchTag(
  id: string,
  tagId: string,
): Promise<void> {
  await authFetch(`${API}/research/projects/${id}/tags/${tagId}`, {
    method: "DELETE",
  });
}

// ─── Activity ──────────────────────────────

export async function getResearchActivity(
  id: string,
): Promise<ResearchActivity[]> {
  const res = await authFetch(`${API}/research/projects/${id}/activity`);
  return handleResponse<ResearchActivity[]>(res);
}

export async function logResearchAiQuery(
  id: string,
  prompt: string,
): Promise<void> {
  await authFetch(`${API}/research/projects/${id}/ai-query`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

// ─── Search ────────────────────────────────

export async function searchResearch(q: string): Promise<ResearchProject[]> {
  const res = await authFetch(
    `${API}/research/search?q=${encodeURIComponent(q)}`,
  );
  return handleResponse<ResearchProject[]>(res);
}

// ─── Assets (documents) ────────────────────

export type DocumentCategory =
  | "annual_report"
  | "quarterly_report"
  | "earnings_transcript"
  | "investor_presentation"
  | "valuation"
  | "model"
  | "spreadsheet"
  | "chart"
  | "screenshot"
  | "news"
  | "other";

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "annual_report",
  "quarterly_report",
  "earnings_transcript",
  "investor_presentation",
  "valuation",
  "model",
  "spreadsheet",
  "chart",
  "screenshot",
  "news",
  "other",
];

export interface ResearchDocument {
  id: string;
  name: string;
  mimeType: string;
  category: DocumentCategory;
  size: number;
  uploadedAt: string;
  downloadUrl: string;
  thumbnailUrl: string;
  status: string;
}

export async function uploadResearchAsset(
  projectId: string,
  file: File,
  category: DocumentCategory,
): Promise<ResearchDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  const res = await authFetch(`${API}/research/projects/${projectId}/assets`, {
    method: "POST",
    body: form,
  });
  return handleResponse<ResearchDocument>(res);
}

export async function listResearchAssets(
  projectId: string,
): Promise<ResearchDocument[]> {
  const res = await authFetch(`${API}/research/projects/${projectId}/assets`);
  return handleResponse<ResearchDocument[]>(res);
}

export async function deleteResearchAsset(
  projectId: string,
  assetId: string,
): Promise<void> {
  await authFetch(`${API}/research/projects/${projectId}/assets/${assetId}`, {
    method: "DELETE",
  });
}
