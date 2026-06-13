"use client";

import { useAuth } from "@/lib/auth-context";

export default function WelcomeBanner() {
  const { user } = useAuth();

  const firstName = user?.username?.split(" ")[0] || user?.username || "Trader";

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--bg-surface, #111214) 0%, rgba(59, 130, 246, 0.08) 100%)",
        border: "1px solid var(--border, #23252d)",
        borderRadius: 20,
        padding: "28px 32px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Welcome back, {firstName}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted, #9ca3af)", margin: "6px 0 0", lineHeight: 1.5 }}>
          Track your consistency, analyze your trades, and master your strategy.
        </p>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Focus
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #fafafa)" }}>
          Process over outcome
        </div>
      </div>
    </div>
  );
}
