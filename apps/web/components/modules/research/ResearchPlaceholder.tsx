"use client";

export default function ResearchPlaceholder() {
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
      <div style={{ fontSize: 32 }}>📚</div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary, #fafafa)",
        }}
      >
        Research Workspace
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
        Research documents, investment theses, and analysis tools are coming soon.
        You'll be able to create research notes, track valuations, and build
        knowledge graphs from your analysis.
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
