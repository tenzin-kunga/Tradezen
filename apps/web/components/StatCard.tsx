"use client";

type StatCardVariant = "profit" | "loss" | "blue" | "insight";

type StatCardProps = {
  title: string;
  value: string;
  trend?: { value: string; positive: boolean };
  variant?: StatCardVariant;
};

const variantStyles: Record<StatCardVariant, { bg: string; border: string }> = {
  profit: { bg: "rgba(34,197,94,0.08)", border: "var(--accent-profit)" },
  loss: { bg: "rgba(239,68,68,0.08)", border: "var(--accent-loss)" },
  blue: { bg: "rgba(59,130,246,0.08)", border: "var(--accent)" },
  insight: { bg: "rgba(139,92,246,0.08)", border: "var(--accent-insight)" },
};

export default function StatCard({
  title,
  value,
  trend,
  variant,
}: StatCardProps) {
  const active = variant ? variantStyles[variant] : null;

  return (
    <div
      className="glass-card-interactive rounded-xl p-5 flex flex-col gap-1"
      style={
        active
          ? {
              background: active.bg,
              borderTop: `3px solid ${active.border}`,
            }
          : undefined
      }
    >
      <div className="label-caps">{title}</div>
      <div className="text-3xl font-bold text-text-primary tracking-tight leading-tight">
        {value}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={
              trend.positive ? "var(--accent-profit)" : "var(--accent-loss)"
            }
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {trend.positive ? (
              <polyline points="18 15 12 9 6 15" />
            ) : (
              <polyline points="6 9 12 15 18 9" />
            )}
          </svg>
          <span
            className={`text-xs font-medium ${trend.positive ? "text-profit" : "text-loss"}`}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
