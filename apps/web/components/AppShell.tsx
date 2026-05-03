"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";

const PUBLIC_ROUTES = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

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

  // Loading state
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

  // Public routes (login/register) — no sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Not logged in and not on public route — will redirect
  if (!user) {
    return null;
  }

  // Authenticated layout with sidebar
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px",
          background: "var(--bg-primary)",
        }}
      >
        {children}
      </main>
      <ChatPanel />
    </div>
  );
}
