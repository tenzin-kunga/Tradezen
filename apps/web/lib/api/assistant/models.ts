const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ChatModels {
  defaultModel: string;
  models: string[];
}

export async function getChatModels(): Promise<ChatModels> {
  const { getAccessToken } = await import("@/lib/api");
  const token = getAccessToken();

  const res = await fetch(`${API}/chat/models`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch models");
  }

  return res.json();
}
