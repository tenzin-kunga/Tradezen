"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboardData, getJournalLatest, getTrades, type DashboardData } from "@/lib/api";
import DashboardHero from "@/components/DashboardHero";
import EquityCurve from "@/components/EquityCurve";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/Skeleton";
import DailySummaryCard from "@/components/DailySummaryCard";
import RecentTradesWidget from "@/components/RecentTradesWidget";
import JournalSnapshotWidget from "@/components/JournalSnapshotWidget";
import TradingHeatmap from "@/components/TradingHeatmap";
import BehaviorAnalyticsWidget from "@/components/BehaviorAnalyticsWidget";
import AnalyticsInsightsWidget from "@/components/AnalyticsInsightsWidget";
import AiCoachWidget from "@/components/AiCoachWidget";
import EmptyState from "@/components/EmptyState";
import DashboardGridLayout from "@/components/DashboardLayout";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";

function formatPnl(value: number): string {
  if (value === 0) return "$0.00";
  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [journalEntry, setJournalEntry] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { layout, loaded, reorderWidgets, updateWidget, resetLayout } = useDashboardLayout();

  const loadData = useCallback(() => {
    Promise.all([
      getDashboardData(),
      getJournalLatest(),
      getTrades({ limit: 5, sort: "created_at", order: "desc" }),
    ])
      .then(([dash, journal, tradesRes]) => {
        setDashboard(dash);
        setJournalEntry(journal);
        setRecentTrades(tradesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const statsLoading = loading || !dashboard;
  const hasTrades = dashboard && (dashboard.equityCurve.length > 0 || recentTrades.length > 0);

  const renderWidget = useCallback(
    (widget: { id: string }) => {
      switch (widget.id) {
        case "equity-curve":
          return <EquityCurve data={dashboard?.equityCurve ?? []} loading={loading} />;
        case "daily-summary":
          return <DailySummaryCard tradesToday={dashboard?.dailySummary.tradesToday ?? 0} winRateToday={dashboard?.dailySummary.winRateToday ?? 0} pnlToday={dashboard?.dailySummary.pnlToday ?? 0} openRisk={dashboard?.dailySummary.openRisk ?? 0} loading={loading} />;
        case "recent-trades":
          return <RecentTradesWidget trades={recentTrades} onDelete={loadData} loading={loading} />;
        case "journal-snapshot":
          return <JournalSnapshotWidget entry={journalEntry} loading={loading} />;
        case "behavior-analytics":
          return <BehaviorAnalyticsWidget disciplineScore={dashboard?.behaviorAnalytics.disciplineScore ?? 0} fomoScore={dashboard?.behaviorAnalytics.fomoScore ?? "Low"} revengeTradesThisMonth={dashboard?.behaviorAnalytics.revengeTradesThisMonth ?? 0} trendAlignment={dashboard?.behaviorAnalytics.trendAlignment ?? 0} loading={loading} />;
        case "heatmap":
          return <TradingHeatmap data={dashboard?.heatmap ?? []} loading={loading} />;
        case "analytics-insights":
          return <AnalyticsInsightsWidget />;
        case "ai-coach":
          return <AiCoachWidget />;
        default:
          return null;
      }
    },
    [dashboard, loading, recentTrades, journalEntry, loadData],
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const w = layout.widgets.find((x) => x.id === id);
      if (!w) return;
      if (!w.visible) {
        const colWidgets = layout.widgets.filter(
          (x) => x.visible && x.column === w.column,
        );
        const maxOrder = colWidgets.length > 0
          ? Math.max(...colWidgets.map((x) => x.order))
          : -1;
        updateWidget(id, { visible: true, order: maxOrder + 1 });
      } else {
        updateWidget(id, { visible: false });
      }
    },
    [layout.widgets, updateWidget],
  );

  const handleCycleSize = useCallback(
    (id: string) => {
      const w = layout.widgets.find((x) => x.id === id);
      if (w) {
        const next = w.size === "S" ? "M" as const : w.size === "M" ? "L" as const : "S" as const;
        updateWidget(id, { size: next });
      }
    },
    [layout.widgets, updateWidget],
  );

  return (
    <div style={{ minHeight: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <DashboardHero
          tradesThisWeek={dashboard?.weeklyTrades ?? 0}
          weeklyPnl={dashboard?.weeklyPnl ?? 0}
          weeklyWinRate={dashboard?.weeklyWinRate ?? 0}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fade-up"><StatCardSkeleton /></div>
          ))
        ) : (
          <>
            <StatCard title="Total P&L" value={formatPnl(dashboard!.totalPnl)} variant={dashboard!.totalPnl >= 0 ? "profit" : "loss"} />
            <StatCard title="Win Rate" value={hasTrades ? `${dashboard!.overallWinRate}%` : "--"} variant="blue" />
            <StatCard title="Profit Factor" value={dashboard!.insights.profitFactor > 0 && dashboard!.insights.profitFactor < 999 ? String(dashboard!.insights.profitFactor) : dashboard!.insights.profitFactor >= 999 ? "∞" : "--"} variant="amber" />
            <StatCard title="Avg Risk:Reward" value={dashboard!.insights.avgRR > 0 ? `1:${dashboard!.insights.avgRR.toFixed(1)}` : "--"} variant="cyan" />
          </>
        )}
      </div>

      {!statsLoading && !hasTrades && loaded ? (
        <EmptyState
          title="Start Your Trading Journey"
          description="Log your first trade to unlock equity curves, daily summaries, and performance analytics."
          actionLabel="Log First Trade"
          actionHref="/add-trade"
        />
      ) : (
        <DashboardGridLayout
          layout={layout}
          onReorder={reorderWidgets}
          onReset={resetLayout}
          onToggleVisibility={handleToggleVisibility}
          onCycleSize={handleCycleSize}
          renderWidget={renderWidget}
        />
      )}
    </div>
  );
}
