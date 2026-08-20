"use client";

export default function MemoryPlaceholder() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 16,
        padding: 32,
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ color: "var(--accent)" }}
      >
        <path d="M12 2a4 4 0 0 0-4 4 4 4 0 0 0-2 7 4 4 0 0 0 2 7 4 4 0 0 0 8 0 4 4 0 0 0 2-7 4 4 0 0 0-2-7 4 4 0 0 0-4-4z" />
        <circle cx="12" cy="8" r="1.5" />
        <circle cx="9" cy="13" r="1.5" />
        <circle cx="15" cy="13" r="1.5" />
      </svg>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary, #fafafa)",
        }}
      >
        AI Memory
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-muted, #9ca3af)",
          textAlign: "center",
          maxWidth: 400,
          lineHeight: 1.6,
        }}
      >
        Your AI&apos;s memory of your trading style, recurring mistakes, lessons
        learned, and best setups will be browsable and editable here. The
        semantic search engine is already built — the UI is coming soon.
      </p>
      <div
        className="glass-card"
        style={{
          padding: "12px 20px",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--text-dim, #6b7280)",
        }}
      >
        Architecture ready — Phase 2
      </div>
    </div>
  );
}
