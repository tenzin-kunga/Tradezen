"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/lib/workspace/workspace-context";
import { createConversationResource } from "@/lib/workspace/resource";

export function useKeyboardShortcuts() {
  const { resourceManager, open } = useWorkspace();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+T — New tab (open assistant)
      if (isMeta && e.key === "t") {
        e.preventDefault();
        const resource = createConversationResource("new", "New Conversation");
        open(resource);
      }

      // Cmd+W — Close current tab
      if (isMeta && e.key === "w") {
        e.preventDefault();
        const activeId = resourceManager.getActiveId();
        if (activeId) {
          resourceManager.close(activeId);
        }
      }

      // Cmd+[ — Go back
      if (isMeta && e.key === "[") {
        e.preventDefault();
        resourceManager.back();
      }

      // Cmd+] — Go forward
      if (isMeta && e.key === "]") {
        e.preventDefault();
        resourceManager.forward();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resourceManager, open]);
}
