"use client";

import { SUGGESTED_PROMPTS } from "@/lib/assistant/prompts";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: 32,
        gap: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 28,
            marginBottom: 8,
          }}
        >
          ✦
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
            marginBottom: 4,
          }}
        >
          Trading Assistant
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted, #9ca3af)",
          }}
        >
          Ask about your trades, journal, or market patterns
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 8,
          width: "100%",
          maxWidth: 520,
        }}
      >
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.prompt)}
            className="glass-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border, #23252d)",
              background: "var(--bg-surface-hover, #1a1b23)",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent, #3b82f6)";
              e.currentTarget.style.background = "var(--bg-surface, #12131a)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border, #23252d)";
              e.currentTarget.style.background =
                "var(--bg-surface-hover, #1a1b23)";
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary, #fafafa)",
              }}
            >
              {p.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
