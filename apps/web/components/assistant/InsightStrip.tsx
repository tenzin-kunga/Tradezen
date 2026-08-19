"use client";

interface InsightChip {
  label: string;
  value: string;
  color?: "default" | "profit" | "loss" | "warning";
}

interface InsightStripProps {
  chips: InsightChip[];
}

const COLOR_MAP = {
  default: "var(--text-primary, #fafafa)",
  profit: "var(--accent-profit, #22c55e)",
  loss: "var(--accent-loss, #ef4444)",
  warning: "var(--accent-warning, #f59e0b)",
};

export default function InsightStrip({ chips }: InsightStripProps) {
  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "8px 16px",
        borderTop: "1px solid var(--border, #23252d)",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {chips.map((chip, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-dim, #6b7280)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {chip.label}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: COLOR_MAP[chip.color ?? "default"],
            }}
          >
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
}
