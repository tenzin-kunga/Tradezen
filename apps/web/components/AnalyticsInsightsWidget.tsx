"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WidgetShell } from "@/components/design-system";
import { getAnalytics, getAdvancedAnalytics } from "@/lib/api";
import type { AiInsight } from "@/lib/api";

type CategoryKey = "performance" | "discipline" | "risk" | "consistency";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "performance", label: "Performance" },
  { key: "discipline", label: "Discipline" },
  { key: "risk", label: "Risk" },
  { key: "consistency", label: "Consistency" },
];

function SmallSampleBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] leading-tight rounded" style={{ background: "var(--glass-bg-alt, rgba(255,255,255,0.06))", color: "var(--text-dim)" }}>
      small sample
    </span>
  );
}

function MetricRow({ label, value, sampleCount }: { label: string; value: string; sampleCount?: number }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-sm text-text-muted truncate">{label}</span>
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-semibold text-text-primary">{value}</span>
        {sampleCount !== undefined && sampleCount < 5 && <SmallSampleBadge />}
      </span>
    </div>
  );
}

function renderMetrics(category: CategoryKey, analytics: any, advanced: any): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  let key = 0;

  const push = (label: string, value: string, sampleCount?: number) => {
    rows.push(<MetricRow key={key++} label={label} value={value} sampleCount={sampleCount} />);
  };

  switch (category) {
    case "performance": {
      const byStrategy = analytics.byStrategy ?? [];
      const sorted = [...byStrategy].sort((a: any, b: any) => (b.pnl ?? 0) - (a.pnl ?? 0));
      for (const s of sorted) {
        const wr = s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0;
        push(s.name ?? "Unknown", `${s.trades} trades • ${wr}% WR`, s.trades);
      }
      if (sorted.length === 0) push("No strategies", "--");
      break;
    }
    case "discipline": {
      const behavioral = analytics.behavioralStats ?? {};
      const totalTrades = analytics.totalTrades ?? 0;
      const fomoPct = behavioral.fomoCount && totalTrades ? Math.round((behavioral.fomoCount / totalTrades) * 100) : 0;
      const vengeancePct = behavioral.vengeanceCount && totalTrades ? Math.round((behavioral.vengeanceCount / totalTrades) * 100) : 0;
      push("FOMO Entries", `${fomoPct}%`, totalTrades);
      push("Revenge Trades", `${vengeancePct}%`, totalTrades);
      push("Trend Alignment", behavioral.trendAlignedCount && totalTrades
        ? `${Math.round((behavioral.trendAlignedCount / totalTrades) * 100)}%` : "--", totalTrades);
      break;
    }
    case "risk": {
      const profitFactor = analytics.profitFactor ?? 0;
      push("Profit Factor", profitFactor > 0 && profitFactor < 999 ? profitFactor.toFixed(2) : profitFactor >= 999 ? "∞" : "--");
      push("Avg R:R", analytics.avgRR > 0 ? `1:${analytics.avgRR.toFixed(1)}` : "--");
      const sharpe = advanced?.sharpeRatio ?? 0;
      push("Sharpe Ratio", sharpe > 0 ? sharpe.toFixed(2) : "--");
      push("Largest Win", analytics.bestTrade > 0 ? `+$${Number(analytics.bestTrade).toFixed(0)}` : "--");
      push(
        "Largest Loss",
        analytics.worstTrade < 0
          ? `-$${Math.abs(Number(analytics.worstTrade)).toFixed(0)}`
          : "--"
      );
      break;
    }
    case "consistency": {
      const streak = advanced?.currentStreak;
      push("Win Streak", streak?.count && streak.count > 0 ? `${streak.type === "win" ? "🔥" : "❄️"} ${streak.count} trades` : "No active streak");
      const byDay = analytics.byDayOfWeek ?? [];
      const sortedDays = [...byDay].sort((a: any, b: any) => (b.winRate ?? 0) - (a.winRate ?? 0));
      for (const d of sortedDays) {
        const raw = d.winRate ?? 0;
        const wr = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
        push(d.day ?? "Unknown", `${d.trades} trades • ${wr}% WR`, d.trades);
      }
      if (sortedDays.length === 0) push("By Day of Week", "No data");
      break;
    }
  }

  return rows;
}

export default function AnalyticsInsightsWidget() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [advanced, setAdvanced] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAnalytics(), getAdvancedAnalytics()])
      .then(([a, adv]) => {
        setAnalytics(a);
        setAdvanced(adv);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const totalTrades = analytics?.totalTrades ?? 0;
  const isEmpty = !loading && totalTrades === 0;

  return (
    <WidgetShell
      title="ANALYTICS INSIGHTS"
      headerAction={<Link href="/analytics" className="text-xs text-accent no-underline">View Full Analytics →</Link>}
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage="Analytics insights will appear after 5+ trades."
    >
    {analytics && (
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4">
        {CATEGORIES.map((cat) => (
          <details key={cat.key} className="group sm:block">
            <summary className="flex items-center gap-2 cursor-pointer sm:cursor-default list-none sm:pointer-events-none select-none sm:select-auto py-1">
              <span className="sm:hidden text-xs text-text-muted" />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cat.label}</span>
            </summary>
            <div className="flex flex-col gap-1.5 mt-1 sm:block">
              {renderMetrics(cat.key, analytics, advanced)}
            </div>
          </details>
        ))}
      </div>
      )}
    </WidgetShell>
  );
}
