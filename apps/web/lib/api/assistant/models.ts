const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ModelInfo {
  id: string;
  displayName?: string;
  contextWindow?: number | null;
  category?: string;
  speed?: string;
  qualityScore?: number;
  recommended?: boolean;
  supportsSql?: boolean;
  supportsRag?: boolean;
  supportsCoaching?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
}

export interface ChatModels {
  defaultModel: string;
  models: string[];
  providers?: Array<{
    id: string;
    name: string;
    baseUrl: string;
    models: ModelInfo[];
  }>;
}

export interface ProviderHealth {
  id: string;
  status: string;
  latency: number | null;
  lastChecked: string | null;
  reason: string | null;
}

export async function getChatModels(): Promise<ChatModels> {
  const token = localStorage.getItem("tradezen_access_token");
  const res = await fetch(`${API}/chat/models?refresh=true`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const res = await fetch(`${API}/chat/models/providers`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function refreshModels(): Promise<{ status: string; providers: string[] }> {
  const res = await fetch(`${API}/chat/models/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function addProvider(provider: {
  name: string;
  baseUrl: string;
  apiKey?: string;
  models: string[];
}): Promise<{ id: string; models: string[] }> {
  const res = await fetch(`${API}/chat/models/providers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(provider),
  });

  if (!res.ok) {
    throw new Error("Failed to add provider");
  }

  return res.json();
}

export async function removeProvider(id: string): Promise<void> {
  await fetch(`${API}/chat/models/providers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}
