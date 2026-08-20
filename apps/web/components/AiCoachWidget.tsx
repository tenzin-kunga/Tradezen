"use client";

import { WidgetShell } from "@/components/design-system";
import { useAiInsights } from "@/hooks/useAiInsights";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  performance: { bg: "rgba(34, 197, 94, 0.12)", text: "rgb(34, 197, 94)" },
  discipline: { bg: "rgba(59, 130, 246, 0.12)", text: "rgb(59, 130, 246)" },
  risk: { bg: "rgba(239, 68, 68, 0.12)", text: "rgb(239, 68, 68)" },
  consistency: { bg: "rgba(234, 179, 8, 0.12)", text: "rgb(234, 179, 8)" },
};

export default function AiCoachWidget() {
  const { insights, narrative, loading } = useAiInsights();

  return (
    <WidgetShell
      title="AI Coach"
      loading={loading}
      isEmpty={!loading && insights.length === 0}
      emptyMessage="Complete 5 trades to unlock coaching insights."
    >
      {narrative && (
        <div
          className="mb-3 rounded-lg px-3 py-2.5"
          style={{ background: "var(--bg-primary)" }}
        >
          <div
            className="text-[10px] font-semibold tracking-wider mb-1"
            style={{ color: "var(--text-dim)" }}
          >
            Portfolio Summary
          </div>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--text-muted)", margin: 0 }}
          >
            {narrative}
          </p>
        </div>
      )}

      {insights.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: "var(--bg-primary)" }}
          >
            <div
              className="text-[10px] font-semibold tracking-wider mb-1"
              style={{ color: "var(--text-dim)" }}
            >
              Today&apos;s Observation
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              No insights yet. Keep journaling your trades.
            </div>
          </div>
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: "var(--bg-primary)" }}
          >
            <div
              className="text-[10px] font-semibold tracking-wider mb-1"
              style={{ color: "var(--text-dim)" }}
            >
              Recommendation
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Log 5+ trades with notes to receive your first coaching insight.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="flex flex-col gap-1.5 p-3 rounded-lg"
              style={{ background: "var(--bg-primary)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    background:
                      CATEGORY_COLORS[insight.category]?.bg ??
                      "rgba(255,255,255,0.06)",
                    color:
                      CATEGORY_COLORS[insight.category]?.text ??
                      "var(--text-dim)",
                  }}
                >
                  {insight.category}
                </span>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-primary)", margin: 0 }}
              >
                {insight.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
