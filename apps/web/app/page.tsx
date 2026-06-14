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
import AnalyticsPreviewWidget from "@/components/AnalyticsPreviewWidget";
import EmptyState from "@/components/EmptyState";
import DashboardLayoutManager from "@/components/DashboardLayout";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import WidgetShell from "@/components/WidgetShell";

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
      const padding = widget.id === "equity-curve" ? "sm" as const : "md" as const;
      switch (widget.id) {
        case "equity-curve":
          return <WidgetShell title="Equity Curve" padding={padding}><EquityCurve data={dashboard?.equityCurve ?? []} loading={loading} /></WidgetShell>;
        case "daily-summary":
          return <WidgetShell title="Daily Summary" padding={padding}><DailySummaryCard tradesToday={dashboard?.dailySummary.tradesToday ?? 0} winRateToday={dashboard?.dailySummary.winRateToday ?? 0} pnlToday={dashboard?.dailySummary.pnlToday ?? 0} openRisk={dashboard?.dailySummary.openRisk ?? 0} loading={loading} /></WidgetShell>;
        case "recent-trades":
          return <WidgetShell title="Recent Trades" padding={padding}><RecentTradesWidget trades={recentTrades} onDelete={loadData} loading={loading} /></WidgetShell>;
        case "journal-snapshot":
          return <WidgetShell title="Journal" padding={padding}><JournalSnapshotWidget entry={journalEntry} loading={loading} /></WidgetShell>;
        case "behavior-analytics":
          return <WidgetShell title="Behavior Analytics" padding={padding}><BehaviorAnalyticsWidget disciplineScore={dashboard?.behaviorAnalytics.disciplineScore ?? 0} fomoScore={dashboard?.behaviorAnalytics.fomoScore ?? "Low"} revengeTradesThisMonth={dashboard?.behaviorAnalytics.revengeTradesThisMonth ?? 0} trendAlignment={dashboard?.behaviorAnalytics.trendAlignment ?? 0} loading={loading} /></WidgetShell>;
        case "heatmap":
          return <WidgetShell title="Trading Heatmap" padding={padding}><TradingHeatmap data={dashboard?.heatmap ?? []} loading={loading} /></WidgetShell>;
        case "analytics-preview":
          return <WidgetShell title="Analytics Preview" padding={padding}><AnalyticsPreviewWidget bestStrategy={dashboard?.insights.bestStrategy ?? ""} bestDay={dashboard?.insights.bestDay ?? ""} avgRR={dashboard?.insights.avgRR ?? 0} profitFactor={dashboard?.insights.profitFactor ?? 0} loading={loading} /></WidgetShell>;
        default:
          return null;
      }
    },
    [dashboard, loading, recentTrades, journalEntry, loadData],
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const w = layout.widgets.find((x) => x.id === id);
      if (w) updateWidget(id, { visible: !w.visible });
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
            <StatCard title="Total P&L" value={`${dashboard!.weeklyPnl >= 0 ? "+" : ""}$${Math.abs(dashboard!.weeklyPnl).toLocaleString()}`} />
            <StatCard title="Win Rate" value={`${dashboard!.weeklyWinRate}%`} />
            <StatCard title="Profit Factor" value={dashboard!.insights.profitFactor > 0 && dashboard!.insights.profitFactor < 999 ? String(dashboard!.insights.profitFactor) : dashboard!.insights.profitFactor >= 999 ? "∞" : "--"} />
            <StatCard title="Avg Risk:Reward" value={dashboard!.insights.avgRR > 0 ? `1:${dashboard!.insights.avgRR.toFixed(1)}` : "--"} />
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
        <DashboardLayoutManager
          layout={layout}
          onReorder={reorderWidgets}
          onUpdateWidget={updateWidget}
          onReset={resetLayout}
          onToggleVisibility={handleToggleVisibility}
          onCycleSize={handleCycleSize}
          renderWidget={renderWidget}
        />
      )}
    </div>
  );
}
