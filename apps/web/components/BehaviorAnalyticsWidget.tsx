"use client";

import { WidgetShell } from "@/components/design-system";

type Props = {
  disciplineScore: number;
  fomoScore: "Low" | "Medium" | "High";
  revengeTradesThisMonth: number;
  trendAlignment: number;
  loading?: boolean;
};

function BarRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-text-muted">{label}</span>
        <span className="text-base font-semibold text-text-primary">
          {value}
        </span>
      </div>
      <div className="h-1.5 bg-bg-surface-hover rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function BehaviorAnalyticsWidget({
  disciplineScore,
  fomoScore,
  revengeTradesThisMonth,
  trendAlignment,
  loading,
}: Props) {
  const fomoColor =
    fomoScore === "Low"
      ? "var(--accent-profit)"
      : fomoScore === "Medium"
        ? "var(--accent-warn)"
        : "var(--accent-loss)";

  return (
    <WidgetShell title="BEHAVIOR ANALYTICS" loading={loading}>
      <div className="flex flex-col gap-3">
        <BarRow
          label="Discipline"
          value={`${disciplineScore}/100`}
          pct={disciplineScore}
          color={
            disciplineScore >= 70
              ? "var(--accent-profit)"
              : disciplineScore >= 40
                ? "var(--accent-warn)"
                : "var(--accent-loss)"
          }
        />
        <div className="flex justify-between items-center">
          <span className="text-sm text-text-muted">FOMO Score</span>
          <span
            className="text-base font-semibold"
            style={{ color: fomoColor }}
          >
            {fomoScore}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-text-muted">Revenge Trades</span>
          <span
            className={`text-base font-semibold ${revengeTradesThisMonth > 0 ? "text-loss" : "text-profit"}`}
          >
            {revengeTradesThisMonth} this month
          </span>
        </div>
        <BarRow
          label="Trend Alignment"
          value={`${trendAlignment}%`}
          pct={trendAlignment}
          color={
            trendAlignment >= 60 ? "var(--accent-profit)" : "var(--accent-warn)"
          }
        />
      </div>
    </WidgetShell>
  );
}
