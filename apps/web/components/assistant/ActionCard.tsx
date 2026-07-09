"use client";

import { IconChart, IconJournal, IconResearch, IconPortfolio, IconWatchlist, IconKnowledge, IconSparkle, IconCheck } from "./icons";

interface ActionCardProps {
  icon: string;
  title: string;
  description?: string;
  state?: "suggested" | "opened";
  onClick: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  chart: IconChart,
  journal: IconJournal,
  research: IconResearch,
  portfolio: IconPortfolio,
  watchlist: IconWatchlist,
  knowledge: IconKnowledge,
  sparkle: IconSparkle,
};

export default function ActionCard({
  icon,
  title,
  description,
  state = "suggested",
  onClick,
}: ActionCardProps) {
  const isOpened = state === "opened";
  const IconComp = isOpened ? IconCheck : (ICON_MAP[icon] || IconSparkle);

  return (
    <button
      onClick={onClick}
      disabled={isOpened}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid",
        borderColor: isOpened
          ? "var(--accent-profit, #22c55e)"
          : "var(--border, #23252d)",
        background: isOpened
          ? "rgba(34, 197, 94, 0.08)"
          : "var(--bg-surface-hover, #1a1b23)",
        cursor: isOpened ? "default" : "pointer",
        textAlign: "left",
        transition: "border-color 0.15s, background 0.15s",
        opacity: isOpened ? 0.7 : 1,
        minWidth: 160,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!isOpened) {
          e.currentTarget.style.borderColor = "var(--accent, #3b82f6)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isOpened) {
          e.currentTarget.style.borderColor = "var(--border, #23252d)";
        }
      }}
    >
      <span style={{ flexShrink: 0, color: isOpened ? "var(--accent-profit, #22c55e)" : "var(--text-muted, #9ca3af)" }}>
        <IconComp size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isOpened
              ? "var(--accent-profit, #22c55e)"
              : "var(--text-primary, #fafafa)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted, #9ca3af)",
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </button>
  );
}
