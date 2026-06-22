"use client";

import { WidgetShell } from "@/components/design-system";
import { useAiInsights } from "@/hooks/useAiInsights";
import type { AiInsight } from "@/lib/api";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  performance: { bg: "rgba(34, 197, 94, 0.12)", text: "rgb(34, 197, 94)" },
  discipline: { bg: "rgba(59, 130, 246, 0.12)", text: "rgb(59, 130, 246)" },
  risk: { bg: "rgba(239, 68, 68, 0.12)", text: "rgb(239, 68, 68)" },
  consistency: { bg: "rgba(234, 179, 8, 0.12)", text: "rgb(234, 179, 8)" },
};

function CategoryTag({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? { bg: "rgba(255,255,255,0.06)", text: "var(--text-dim)" };
  return (
    <span
      className="inline-block text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: colors.bg, color: colors.text }}
    >
      {category}
    </span>
  );
}

function InsightCard({ insight }: { insight: AiInsight }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: "var(--glass-bg-alt, rgba(255,255,255,0.03))" }}>
      <div className="flex items-center gap-2">
        <CategoryTag category={insight.category} />
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {insight.message}
      </p>
    </div>
  );
}

export default function AiCoachWidget() {
  const { insights, loading } = useAiInsights();

  return (
    <WidgetShell
      title="AI COACH"
      loading={loading}
      isEmpty={!loading && insights.length === 0}
      emptyMessage="Coaching insights will appear after 5+ trades."
    >
      {insights.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
