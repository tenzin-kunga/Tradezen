"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getResourceManager } from "@/lib/workspace/resource-manager";

const NAV_KEYS: Record<string, string> = {
  d: "/",
  t: "/trades",
  a: "/analytics",
  j: "/journal",
  r: "/reports",
  s: "/settings",
  c: "/checklists",
};

const G_TIMEOUT = 1200;

export default function KeyboardShortcutProvider({
  children,
  onPaletteToggle,
}: {
  children: React.ReactNode;
  onPaletteToggle: () => void;
}) {
  const router = useRouter();
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "g" && !isInput) {
        e.preventDefault();
        gPending.current = true;
        clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          gPending.current = false;
        }, G_TIMEOUT);
        return;
      }

      if (gPending.current && !isInput) {
        const lower = e.key.toLowerCase();
        const route = NAV_KEYS[lower];
        if (route) {
          e.preventDefault();
          gPending.current = false;
          clearTimeout(gTimer.current);
          router.push(route);
          return;
        }
        gPending.current = false;
        clearTimeout(gTimer.current);
      }

      // Cmd/Ctrl + 1-9: switch workspace tabs
      if ((e.metaKey || e.ctrlKey) && !isInput) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          const rm = getResourceManager();
          const tabs = rm.getTabs();
          if (tabs[num - 1]) {
            e.preventDefault();
            rm.setActive(tabs[num - 1].id);
          }
        }
      }

      if (!isInput && !e.metaKey && !e.ctrlKey) {
        if (e.key === "n") {
          e.preventDefault();
          router.push("/add-trade");
        }
        if (e.key === "/") {
          e.preventDefault();
          onPaletteToggle();
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, onPaletteToggle]);

  return <>{children}</>;
}
