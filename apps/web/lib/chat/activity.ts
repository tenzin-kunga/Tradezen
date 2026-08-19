// Module-level activity store for chat replies. Survives page navigation /
// remounts (like the socket singleton) so a background reply can flash the
// sidebar when the user comes back.
const thinking = new Set<string>();
const ready = new Set<string>();
let activeThreadId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeActivity(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getThinkingThreads(): Set<string> {
  return thinking;
}

export function getReadyThreads(): Set<string> {
  return ready;
}

export function setActiveThread(id: string | null): void {
  if (activeThreadId === id) return;
  activeThreadId = id;
  if (id) ready.delete(id);
  notify();
}

export function isActiveThread(id: string): boolean {
  return activeThreadId === id;
}

export function markThinking(threadId: string): void {
  thinking.add(threadId);
  notify();
}

export function markReady(threadId: string): void {
  thinking.delete(threadId);
  if (!isActiveThread(threadId)) ready.add(threadId);
  notify();
}

export function clearReady(threadId: string): void {
  ready.delete(threadId);
  notify();
}

export function clearThinking(threadId: string): void {
  thinking.delete(threadId);
  notify();
}