const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AssistantSettings {
  activeModels?: string[];
  defaultModel?: string;
  temperature?: number;
  reasoningMode?: "auto" | "on" | "off";
}

export interface UserSettings {
  userId: string;
  assistantSettings: AssistantSettings;
  workspaceSettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiKeyStatus {
  configured: boolean;
  validated: boolean;
  validatedAt: string | null;
  lastError: string | null;
}

export async function getUserSettings(): Promise<UserSettings> {
  const res = await fetch(`${API}/user-settings`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function updateUserSettings(dto: {
  assistantSettings?: AssistantSettings;
  workspaceSettings?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
}): Promise<UserSettings> {
  const res = await fetch(`${API}/user-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const res = await fetch(`${API}/user-settings/api-key/status`, {
    credentials: "include",
  });

  if (!res.ok) {
    return { configured: false, validated: false, validatedAt: null, lastError: null };
  }

  return res.json();
}
