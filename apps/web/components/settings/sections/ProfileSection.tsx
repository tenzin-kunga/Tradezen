"use client";

import { useAuth } from "@/lib/auth-context";

export function ProfileSection() {
  const { user } = useAuth();

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-5)",
        padding: "var(--space-4) 0",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--bg-surface-hover)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--accent)",
          fontFamily: "var(--font-display)",
          flexShrink: 0,
        }}
      >
        {user?.username?.charAt(0)?.toUpperCase() ?? "?"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--label)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {user?.username ?? "—"}
        </div>
        <div
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-muted)",
            marginTop: 2,
          }}
        >
          {user?.email ?? "—"}
        </div>
        {memberSince && (
          <div
            style={{
              fontSize: "var(--meta)",
              color: "var(--text-dim)",
              marginTop: 2,
            }}
          >
            Member since {memberSince}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "var(--space-1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent-profit)",
              boxShadow: "0 0 6px var(--accent-profit)",
            }}
          />
          <span
            style={{
              fontSize: "var(--meta)",
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            LIVE
          </span>
        </div>
        <div
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-muted)",
          }}
        >
          London Session
        </div>
      </div>
    </div>
  );
}
