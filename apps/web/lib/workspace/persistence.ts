import type { Tab } from "./types";

const TABS_KEY = "tradezen_workspace_tabs";
const ACTIVE_KEY = "tradezen_workspace_active";
const SIDEBAR_KEY = "tradezen_sidebar_pinned";
const MODEL_KEY = "tradezen_chat_model";
const THREAD_KEY = "tradezen_last_thread";

// ─── Tabs ────────────────────────────────────

export function loadTabs(): Tab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTabs(tabs: Tab[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  } catch {
    // quota exceeded or private browsing
  }
}

export function loadActiveTabId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveTabId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

// ─── Sidebar ─────────────────────────────────

export function loadSidebarPinned(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "true";
}

export function saveSidebarPinned(pinned: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIDEBAR_KEY, String(pinned));
}

// ─── Chat ────────────────────────────────────

export function loadChatModel(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(MODEL_KEY) || "";
}

export function saveChatModel(model: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_KEY, model);
}

export function loadLastThread(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(THREAD_KEY);
}

export function saveLastThread(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(THREAD_KEY, id);
  } else {
    localStorage.removeItem(THREAD_KEY);
  }
}
