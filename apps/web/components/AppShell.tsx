"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";
import KeyboardShortcutProvider from "./KeyboardShortcutProvider";
import MobileBottomNav from "./MobileBottomNav";
import FabButton from "./FabButton";

const PUBLIC_ROUTES = ["/login", "/register", "/auth/callback"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicRoute) {
      router.replace("/login");
    }
    if (user && isPublicRoute) {
      router.replace("/");
    }
  }, [user, loading, isPublicRoute, router]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          color: "var(--text-muted)",
          fontSize: 12,
          letterSpacing: "0.2em",
        }}
      >
        INITIALIZING SYSTEM...
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: "100vh" }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile header */}
      <header
        className="md:hidden flex items-center justify-between px-4"
        style={{ height: 48, background: "var(--bg-surface, #111214)", borderBottom: "1px solid var(--border, #23252d)", flexShrink: 0 }}
      >
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: "none", border: "none", color: "var(--text-primary, #fafafa)", cursor: "pointer", padding: 8, display: "flex" }}
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-primary, #fafafa)" }}>
          TRADEZEN
        </span>
        <div style={{ width: 34 }} />
      </header>

      {/* Sidebar - desktop always visible, mobile in overlay */}
      <div
        className={`md:relative md:flex-shrink-0 ${
          mobileMenuOpen ? "fixed inset-y-0 left-0 z-50" : "hidden md:block"
        }`}
        style={{ transition: "transform 0.2s ease" }}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
        <TopBar onSearchClick={() => setPaletteOpen(true)} />
        <main className="pb-14 md:pb-0" style={{ flex: 1, overflowY: "auto", padding: 32, background: "var(--bg-primary, #09090b)" }}>
          <KeyboardShortcutProvider onPaletteToggle={() => setPaletteOpen((v) => !v)}>
            {children}
          </KeyboardShortcutProvider>
        </main>
        {!isPublicRoute && <MobileBottomNav />}
        {!isPublicRoute && <FabButton />}
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </div>
  );
}
