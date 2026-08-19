"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";
import { markThinking, markReady, isActiveThread } from "@/lib/chat/activity";

const ASSISTANT_PATHS = new Set(["/workspace/assistant", "/assistant"]);

export default function ChatActivityListener() {
  const router = useRouter();

  useRealtime(
    "chat:reply-start",
    useCallback((data: unknown) => {
      const { threadId } = data as { threadId: string };
      if (threadId) markThinking(threadId);
    }, []),
  );

  useRealtime(
    "chat:reply-ready",
    useCallback(
      (data: unknown) => {
        const { threadId } = data as { threadId: string };
        if (!threadId) return;
        // Always clear the thinking flag (markReady only flashes the sidebar
        // when the thread is not active). Guard the toast with the active check.
        markReady(threadId);
        if (isActiveThread(threadId)) return;
        // Toast only when the user is not looking at the assistant page;
        // the sidebar flash covers that case.
        const path = window.location.pathname;
        if (!ASSISTANT_PATHS.has(path)) {
          showReplyToast(() => router.push("/workspace/assistant"));
        }
      },
      [router],
    ),
  );

  return null;
}

function showReplyToast(onOpen: () => void) {
  const toast = document.createElement("div");
  toast.className =
    "fixed top-4 right-4 rounded-lg p-4 shadow-xl z-50 animate-slide-in";
  toast.style.background = "var(--bg-surface)";
  toast.style.border = "1px solid var(--border)";
  toast.style.cursor = "pointer";
  toast.innerHTML = `
    <div class="font-medium text-sm" style="color: var(--text-primary)">Reply ready</div>
    <div class="text-xs mt-1" style="color: var(--text-muted)">Your assistant reply finished. Click to view.</div>
  `;
  toast.addEventListener("click", () => {
    onOpen();
    toast.remove();
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}