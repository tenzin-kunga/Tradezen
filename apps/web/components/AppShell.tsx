"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";

const PUBLIC_ROUTES = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          color: "#555",
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
    <div className="flex flex-col md:flex-row min-h-screen" style={{ overflow: "hidden" }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b" style={{ background: "#111111", borderColor: "#2a2a2a" }}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2"
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect x="2" y="4" width="16" height="2" />
            <rect x="2" y="9" width="16" height="2" />
            <rect x="2" y="14" width="16" height="2" />
          </svg>
        </button>
        <span className="text-white font-bold tracking-widest" style={{ fontSize: 14, letterSpacing: "0.2em" }}>
          TRADEZEN
        </span>
        <div style={{ width: 36 }} />
      </header>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:w-auto md:flex-shrink-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto p-4 md:p-10"
        style={{ background: "var(--bg-primary)" }}
      >
        {children}
      </main>

      <ChatPanel />
    </div>
  );
}
