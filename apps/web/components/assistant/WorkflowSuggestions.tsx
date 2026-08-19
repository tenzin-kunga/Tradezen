"use client";

import {
  IconChart,
  IconJournal,
  IconResearch,
  IconSparkle,
} from "./icons";

interface WorkflowSuggestion {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  chart: IconChart,
  journal: IconJournal,
  research: IconResearch,
};

interface WorkflowSuggestionsProps {
  greeting: string;
  contextSummary: string;
  suggestions: WorkflowSuggestion[];
  onSelect: (prompt: string) => void;
}

export default function WorkflowSuggestions({
  greeting,
  contextSummary,
  suggestions,
  onSelect,
}: WorkflowSuggestionsProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 0,
        padding: 32,
        gap: 24,
      }}
    >
      {/* Greeting */}
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 8, color: "var(--text-muted, #9ca3af)" }}>
          <IconSparkle size={28} />
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
            marginBottom: 4,
          }}
        >
          {greeting}
        </h2>
        {contextSummary && (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted, #9ca3af)",
            }}
          >
            {contextSummary}
          </p>
        )}
      </div>

      {/* Suggestion cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 8,
          width: "100%",
          maxWidth: 520,
        }}
      >
        {suggestions.map((s, i) => {
          const IconComp = ICON_MAP[s.icon] || IconSparkle;
          return (
            <button
              key={i}
              onClick={() => onSelect(s.title)}
              className="tz-panel tz-lift"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                background: "var(--bg-surface-hover, #1a1b23)",
              }}
            >
              <span
                style={{ flexShrink: 0, color: "var(--text-muted, #9ca3af)" }}
              >
                <IconComp size={18} />
              </span>
              <div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary, #fafafa)",
                    display: "block",
                  }}
                >
                  {s.title}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted, #9ca3af)",
                  }}
                >
                  {s.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
