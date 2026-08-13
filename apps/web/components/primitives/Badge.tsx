import type { CSSProperties, ReactNode } from "react";

type Tone = "neutral" | "accent" | "profit" | "loss" | "warn";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}

const tones: Record<Tone, CSSProperties> = {
  neutral: {
    background: "var(--bg-surface-hover)",
    color: "var(--text-muted)",
    borderColor: "var(--border-soft)",
  },
  accent: {
    background: "rgba(59, 130, 246, 0.12)",
    color: "var(--accent)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  profit: {
    background: "rgba(34, 197, 94, 0.12)",
    color: "var(--accent-profit)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  loss: {
    background: "rgba(239, 68, 68, 0.12)",
    color: "var(--accent-loss)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  warn: {
    background: "rgba(245, 158, 11, 0.12)",
    color: "var(--accent-warn)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
};

export function Badge({
  tone = "neutral",
  children,
  style,
  className = "",
  onClick,
}: BadgeProps) {
  return (
    <span
      className={className}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        border: "1px solid transparent",
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
