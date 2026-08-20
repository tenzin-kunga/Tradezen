"use client";

import { useEffect, useState, useCallback, type ComponentProps } from "react";
import {
  getDashboardData,
  getJournalLatest,
  getTrades,
  type DashboardData,
  type Journal,
} from "@/lib/api";
import type { Trade } from "@tradezen/types";
import DashboardShell from "@/components/DashboardShell";
import DashboardHero from "@/components/DashboardHero";
import LiveSessionIndicator from "@/components/LiveSessionIndicator";
import EquityCurve from "@/components/EquityCurve";
import DailySummaryCard from "@/components/DailySummaryCard";
import RecentTradesWidget from "@/components/RecentTradesWidget";
import JournalSnapshotWidget from "@/components/JournalSnapshotWidget";
import TradingHeatmap from "@/components/TradingHeatmap";
import BehaviorAnalyticsWidget from "@/components/BehaviorAnalyticsWidget";
import AiCoachWidget from "@/components/AiCoachWidget";
import MarketNewsWidget from "@/components/MarketNewsWidget";
import EmptyState from "@/components/EmptyState";
import { SectionSurface } from "@/components/design-system";
import { getSection, type SectionId } from "@/lib/section-types";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import DashboardSettings from "@/components/DashboardSettings";
import type { PresetName } from "@/lib/layout-types";

function fmtPnl(value: number): string {
  if (value === 0) return "$0.00";
  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function abbreviatePnl(value: string): string {
  const match = value.match(/^([+-]?)\$([\d,]+)(\.\d+)?$/);
  if (!match) return value;
  const [, sign, intStr] = match;
  const num = parseInt(intStr.replace(/,/g, ""), 10);
  if (num >= 1_000_000) return `${sign}$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 10_000) return `${sign}$${(num / 1_000).toFixed(1)}K`;
  return value;
}

function PerformanceStrip({
  winRate,
  totalPnl,
  profitFactor,
  avgRR,
  loading,
}: {
  winRate: string;
  totalPnl: string;
  profitFactor: string;
  avgRR: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="surface-1 rounded-xl px-4 py-3 mb-4 flex items-center gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton" style={{ width: 48, height: 14 }} />
            <div className="skeleton" style={{ width: 36, height: 10 }} />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    { label: "Win Rate", value: winRate },
    { label: "Total P&L", value: abbreviatePnl(totalPnl) },
    { label: "Profit Factor", value: profitFactor },
    { label: "Avg R:R", value: avgRR },
  ];

  return (
    <div className="surface-1 rounded-xl px-4 py-3 mb-4">
      <div
        className="text-[10px] tracking-widest mb-2"
        style={{ color: "var(--text-dim)" }}
      >
        ALL-TIME
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {metrics.map((m, i) => (
          <div key={m.label} className="flex items-center gap-2">
            {i > 0 && (
              <span
                style={{
                  color: "var(--text-dim)",
                  fontSize: "var(--meta)",
                  userSelect: "none",
                }}
              >
                ·
              </span>
            )}
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              {m.value}
            </span>
            <span
              style={{
                fontSize: "var(--meta)",
                color: "var(--text-dim)",
                fontWeight: 500,
              }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [journalEntry, setJournalEntry] = useState<Journal | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    sections,
    preset,
    loaded,
    toggleVisibility,
    reorderInColumn,
    moveToColumn,
    applyPreset,
  } = useDashboardLayout();

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasTrades =
    dashboard && (dashboard.equityCurve.length > 0 || recentTrades.length > 0);

  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const leftSections = visibleSections.filter((s) => s.column === "left");
  const rightSections = visibleSections.filter((s) => s.column === "right");

  const renderSection = useCallback(
    (sectionId: SectionId) => {
      const section = getSection(sectionId);
      if (!section) return null;

      switch (sectionId) {
        case "equity-curve":
          return (
            <EquityCurve
              data={dashboard?.equityCurve ?? []}
              loading={loading}
            />
          );

        case "daily-summary":
          return (
            <DailySummaryCard
              tradesToday={dashboard?.dailySummary.tradesToday ?? 0}
              winRateToday={dashboard?.dailySummary.winRateToday ?? 0}
              pnlToday={dashboard?.dailySummary.pnlToday ?? 0}
              openRisk={dashboard?.dailySummary.openRisk ?? 0}
              loading={loading}
            />
          );

        case "recent-trades":
          return (
            <RecentTradesWidget
              trades={
                recentTrades as unknown as ComponentProps<
                  typeof RecentTradesWidget
                >["trades"]
              }
              onDelete={loadData}
              loading={loading}
            />
          );

        case "journal-snapshot":
          return (
            <JournalSnapshotWidget entry={journalEntry} loading={loading} />
          );

        case "behavior-analytics":
          return (
            <BehaviorAnalyticsWidget
              disciplineScore={
                dashboard?.behaviorAnalytics.disciplineScore ?? 0
              }
              fomoScore={dashboard?.behaviorAnalytics.fomoScore ?? "Low"}
              revengeTradesThisMonth={
                dashboard?.behaviorAnalytics.revengeTradesThisMonth ?? 0
              }
              trendAlignment={dashboard?.behaviorAnalytics.trendAlignment ?? 0}
              loading={loading}
            />
          );

        case "heatmap":
          return (
            <TradingHeatmap data={dashboard?.heatmap ?? []} loading={loading} />
          );

        case "ai-coach":
          return (
            <SectionSurface title={section.title}>
              <AiCoachWidget />
            </SectionSurface>
          );

        case "market-news":
          return <MarketNewsWidget loading={loading} />;

        default:
          return null;
      }
    },
    [dashboard, loading, recentTrades, journalEntry, loadData],
  );

  const statsLoading = loading || !dashboard;

  return (
    <DashboardShell>
      <div style={{ minHeight: "100%" }}>
        <DashboardHero
          todayPnl={dashboard?.dailySummary.pnlToday ?? 0}
          tradesToday={dashboard?.dailySummary.tradesToday ?? 0}
          winRateToday={dashboard?.dailySummary.winRateToday ?? 0}
          weeklyPnl={dashboard?.weeklyPnl ?? 0}
          weeklyWinRate={dashboard?.weeklyWinRate ?? 0}
          totalPnl={dashboard?.totalPnl ?? 0}
          loading={loading}
        />

        <LiveSessionIndicator />

        <PerformanceStrip
          winRate={hasTrades ? `${dashboard!.overallWinRate}%` : "--"}
          totalPnl={fmtPnl(dashboard?.totalPnl ?? 0)}
          profitFactor={
            dashboard?.insights.profitFactor != null &&
            dashboard.insights.profitFactor > 0 &&
            dashboard.insights.profitFactor < 999
              ? String(dashboard.insights.profitFactor)
              : (dashboard?.insights.profitFactor ?? 0) >= 999
                ? "∞"
                : "--"
          }
          avgRR={
            dashboard?.insights.avgRR != null && dashboard.insights.avgRR > 0
              ? `1:${dashboard.insights.avgRR.toFixed(1)}`
              : "--"
          }
          loading={statsLoading}
        />

        {!statsLoading && !hasTrades && loaded ? (
          <EmptyState
            title="Start Your Trading Journey"
            description="Log your first trade to unlock equity curves, daily summaries, and performance analytics."
            actionLabel="Log First Trade"
            actionHref="/add-trade"
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: "var(--label)",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  {preset === "custom"
                    ? "Custom"
                    : preset.charAt(0).toUpperCase() + preset.slice(1)}{" "}
                  layout
                </span>
                {preset !== "default" && (
                  <button
                    onClick={() => applyPreset("default" as PresetName)}
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-dim)",
                      background: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-dim)",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Customize
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
                gap: "var(--space-4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                {leftSections.map((s) => (
                  <div key={s.id}>{renderSection(s.id)}</div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                {rightSections.map((s) => (
                  <div key={s.id}>{renderSection(s.id)}</div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <DashboardSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sections={sections}
        preset={preset}
        onApplyPreset={(name: PresetName) => applyPreset(name)}
        onToggleVisibility={toggleVisibility}
        onReorder={reorderInColumn}
        onMoveColumn={moveToColumn}
      />
    </DashboardShell>
  );
}
