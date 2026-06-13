"use client";

import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [journalEntry, setJournalEntry] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
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
  };

  useEffect(() => { loadData(); }, []);

  const statsLoading = loading || !dashboard;
  const hasTrades = dashboard && (dashboard.equityCurve.length > 0 || recentTrades.length > 0);

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <DashboardHero
          tradesThisWeek={dashboard?.weeklyTrades ?? 0}
          weeklyPnl={dashboard?.weeklyPnl ?? 0}
          weeklyWinRate={dashboard?.weeklyWinRate ?? 0}
          loading={loading}
        />
      </div>

      {/* Stat cards — 4-column grid */}
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

      {/* Main content or empty state */}
      {!statsLoading && !hasTrades ? (
        <EmptyState
          title="Start Your Trading Journey"
          description="Log your first trade to unlock equity curves, daily summaries, and performance analytics."
          actionLabel="Log First Trade"
          actionHref="/add-trade"
        />
      ) : (
        <>
          {/* Equity + Daily Summary — 2-col on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 fade-up">
              <EquityCurve data={dashboard?.equityCurve ?? []} loading={loading} />
            </div>
            <div className="fade-up">
              <DailySummaryCard
                tradesToday={dashboard?.dailySummary.tradesToday ?? 0}
                winRateToday={dashboard?.dailySummary.winRateToday ?? 0}
                pnlToday={dashboard?.dailySummary.pnlToday ?? 0}
                openRisk={dashboard?.dailySummary.openRisk ?? 0}
                loading={loading}
              />
            </div>
          </div>

          {/* Recent Trades */}
          <div className="fade-up mb-6">
            <RecentTradesWidget trades={recentTrades} onDelete={loadData} loading={loading} />
          </div>

          {/* Journal + Behavior — 2-col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="fade-up">
              <JournalSnapshotWidget entry={journalEntry} loading={loading} />
            </div>
            <div className="fade-up">
              <BehaviorAnalyticsWidget
                disciplineScore={dashboard?.behaviorAnalytics.disciplineScore ?? 0}
                fomoScore={dashboard?.behaviorAnalytics.fomoScore ?? "Low"}
                revengeTradesThisMonth={dashboard?.behaviorAnalytics.revengeTradesThisMonth ?? 0}
                trendAlignment={dashboard?.behaviorAnalytics.trendAlignment ?? 0}
                loading={loading}
              />
            </div>
          </div>

          {/* Heatmap */}
          <div className="fade-up mb-6">
            <TradingHeatmap data={dashboard?.heatmap ?? []} loading={loading} />
          </div>

          {/* Insights */}
          <div className="fade-up mb-6">
            <AnalyticsPreviewWidget
              bestStrategy={dashboard?.insights.bestStrategy ?? ""}
              bestDay={dashboard?.insights.bestDay ?? ""}
              avgRR={dashboard?.insights.avgRR ?? 0}
              profitFactor={dashboard?.insights.profitFactor ?? 0}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}
