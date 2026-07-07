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

// ─── Folders ──────────────────────────────────

export interface KnowledgeFolder {
  id: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function getKnowledgeFolders(parentId?: string): Promise<KnowledgeFolder[]> {
  const params = parentId ? `?parent_id=${parentId}` : "";
  const res = await authFetch(`${API}/knowledge/folders${params}`);
  return handleResponse<KnowledgeFolder[]>(res);
}

export async function createKnowledgeFolder(
  name: string,
  parentId?: string,
): Promise<KnowledgeFolder> {
  const res = await authFetch(`${API}/knowledge/folders`, {
    method: "POST",
    body: JSON.stringify({ name, parent_id: parentId }),
  });
  return handleResponse<KnowledgeFolder>(res);
}

export async function updateKnowledgeFolder(
  id: string,
  data: { name?: string; icon?: string; parent_id?: string },
): Promise<KnowledgeFolder> {
  const res = await authFetch(`${API}/knowledge/folders/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<KnowledgeFolder>(res);
}

export async function deleteKnowledgeFolder(id: string): Promise<void> {
  await authFetch(`${API}/knowledge/folders/${id}`, { method: "DELETE" });
}

// ─── Documents ────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string | null;
  docType: string;
  templateId: string | null;
  status: string;
  currentVersion: number;
  aiSummary: string | null;
  frontmatter: Record<string, unknown>;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getKnowledgeDocuments(folderId?: string): Promise<KnowledgeDocument[]> {
  const params = folderId ? `?folder_id=${folderId}` : "";
  const res = await authFetch(`${API}/knowledge/documents${params}`);
  return handleResponse<KnowledgeDocument[]>(res);
}

export async function getKnowledgeDocument(id: string): Promise<KnowledgeDocument> {
  const res = await authFetch(`${API}/knowledge/documents/${id}`);
  return handleResponse<KnowledgeDocument>(res);
}

export async function createKnowledgeDocument(data: {
  title: string;
  folder_id?: string;
  content?: string;
  doc_type?: string;
  template_id?: string;
  frontmatter?: Record<string, unknown>;
}): Promise<KnowledgeDocument> {
  const res = await authFetch(`${API}/knowledge/documents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<KnowledgeDocument>(res);
}

export async function updateKnowledgeDocument(
  id: string,
  data: { title?: string; content?: string; status?: string; frontmatter?: Record<string, unknown> },
): Promise<KnowledgeDocument> {
  const res = await authFetch(`${API}/knowledge/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<KnowledgeDocument>(res);
}

export async function deleteKnowledgeDocument(id: string): Promise<void> {
  await authFetch(`${API}/knowledge/documents/${id}`, { method: "DELETE" });
}

// ─── Versions ─────────────────────────────────

export interface KnowledgeVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  createdAt: string;
}

export async function getKnowledgeVersions(documentId: string): Promise<KnowledgeVersion[]> {
  const res = await authFetch(`${API}/knowledge/documents/${documentId}/versions`);
  return handleResponse<KnowledgeVersion[]>(res);
}

// ─── Links ────────────────────────────────────

export interface KnowledgeLink {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationshipType: string;
  createdAt: string;
}

export async function getKnowledgeLinks(documentId: string): Promise<KnowledgeLink[]> {
  const res = await authFetch(`${API}/knowledge/documents/${documentId}/links`);
  return handleResponse<KnowledgeLink[]>(res);
}

export async function createKnowledgeLink(
  documentId: string,
  targetDocumentId: string,
  relationshipType: string,
): Promise<KnowledgeLink> {
  const res = await authFetch(`${API}/knowledge/documents/${documentId}/links`, {
    method: "POST",
    body: JSON.stringify({ target_document_id: targetDocumentId, relationship_type: relationshipType }),
  });
  return handleResponse<KnowledgeLink>(res);
}

export async function deleteKnowledgeLink(linkId: string): Promise<void> {
  await authFetch(`${API}/knowledge/links/${linkId}`, { method: "DELETE" });
}
