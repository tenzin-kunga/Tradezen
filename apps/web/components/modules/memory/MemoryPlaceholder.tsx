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
      <div style={{ fontSize: 32 }}>🧠</div>
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
        Your AI's memory of your trading style, recurring mistakes, lessons
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
