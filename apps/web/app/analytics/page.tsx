"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import DashboardShell from "@/components/DashboardShell";
import EmptyState from "@/components/EmptyState";
import {
  getAnalytics,
  getAdvancedAnalytics,
  getDailyPnl,
  getStrategyAnalytics,
  getStrategyPerformance,
  getRiskAnalytics,
} from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useRealtime } from "@/hooks/use-realtime";
import StrategyBarCharts from "@/components/StrategyBarCharts";
import StrategyTrendChart from "@/components/StrategyTrendChart";
import StrategyComparisonTable from "@/components/StrategyComparisonTable";
import StrategyDrawer from "@/components/StrategyDrawer";
import RiskDistributionChart from "@/components/RiskDistributionChart";
import RiskByWeekChart from "@/components/RiskByWeekChart";
import PositionSizeCalculator from "@/components/PositionSizeCalculator";
type Tab = "overview" | "strategy" | "risk" | "calculator";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "strategy", label: "Strategy" },
  { key: "risk", label: "Risk" },
  { key: "calculator", label: "Calculator" },
];

function getSeverity(count: number): { label: string; color: string } {
  if (count > 5) return { label: "CRITICAL", color: "var(--accent-loss)" };
  if (count > 2) return { label: "MODERATE", color: "var(--accent-warn)" };
  return { label: "WARNING", color: "var(--text-muted)" };
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [advanced, setAdvanced] = useState<any>(null);
  const [dailyPnl, setDailyPnl] = useState<any[]>([]);
  const [strategyAnalytics, setStrategyAnalytics] = useState<any>(null);
  const [strategyTrendSeries, setStrategyTrendSeries] = useState<any[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [riskAnalytics, setRiskAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(() => {
    setError(null);
    Promise.all([
      Promise.all([
        getAnalytics(),
        getAdvancedAnalytics(),
        getDailyPnl(),
        getRiskAnalytics(),
      ]).then(([analyticsRes, advancedRes, dailyRes, riskRes]) => {
        setStats(analyticsRes);
        setAdvanced(advancedRes);
        setDailyPnl(dailyRes);
        setRiskAnalytics(riskRes);
      }),
      getStrategyAnalytics()
        .then((stratRes) => {
          setStrategyAnalytics(stratRes);
          const strategies = stratRes?.byStrategy ?? [];
          if (strategies.length > 0) {
            return Promise.all(
              strategies.map((s: any) => getStrategyPerformance(s.strategy)),
            ).then((results) => {
              setStrategyTrendSeries(
                results.map((r, i) => ({
                  strategy: strategies[i].strategy,
                  monthly: r.monthly ?? [],
                })),
              );
            });
          }
        })
        .catch(() => {}),
    ])
      .catch((err) => {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Unable to load analytics data.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useRealtime("trade:created", loadAnalytics);
  useRealtime("trade:updated", loadAnalytics);
  useRealtime("trade:deleted", loadAnalytics);

  const safeStats = {
    totalTrades: stats?.totalTrades ?? 0,
    totalPnl: Number(stats?.totalPnl ?? 0),
    winRate: Number(stats?.winRate ?? 0),
    profitFactor: Number(stats?.profitFactor ?? 0),
    avgRR: Number(stats?.avgRR ?? 0),
    expectancy: Number(stats?.expectancy ?? 0),
    bestTrade: Number(stats?.bestTrade ?? 0),
    worstTrade: Number(stats?.worstTrade ?? 0),
    maxDrawdown: Number(stats?.maxDrawdown ?? 0),
    maxConsecutiveWins: Number(stats?.maxConsecutiveWins ?? 0),
    maxConsecutiveLosses: Number(stats?.maxConsecutiveLosses ?? 0),
    byStrategy: Array.isArray(stats?.byStrategy) ? stats.byStrategy : [],
    byDayOfWeek: Array.isArray(stats?.byDayOfWeek) ? stats.byDayOfWeek : [],
    byMonth: Array.isArray(stats?.byMonth) ? stats.byMonth : [],
    behavioralStats: {
      fomoCount: Number(stats?.behavioralStats?.fomoCount ?? 0),
      vengeanceCount: Number(stats?.behavioralStats?.vengeanceCount ?? 0),
      trendAlignedCount: Number(stats?.behavioralStats?.trendAlignedCount ?? 0),
    },
  };

  const equityCurve = advanced?.equityCurve ?? [];
  const hasEquityData = equityCurve.length > 1;

  const now = new Date();
  const currentYear = now.getFullYear();

  const weekDayData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const result = days.map((day) => ({ day, pnl: 0 }));

    const startOfWeek = new Date(now);
    const dayOfWeek = (now.getDay() + 6) % 7;
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    dailyPnl.forEach((entry) => {
      const d = new Date(entry.date);
      if (d >= startOfWeek && d <= endOfWeek) {
        const idx = (d.getDay() + 6) % 7;
        result[idx].pnl += entry.pnl ?? entry.totalPnl ?? 0;
      }
    });

    return result;
  }, [dailyPnl]);

  const yearMonthData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const result = months.map((month) => ({ month, pnl: 0 }));

    dailyPnl.forEach((entry) => {
      const d = new Date(entry.date);
      if (d.getFullYear() === currentYear) {
        result[d.getMonth()].pnl += entry.pnl ?? entry.totalPnl ?? 0;
      }
    });

    return result;
  }, [dailyPnl, currentYear]);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekRangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  function renderTabContent() {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "strategy":
        return <StrategyTab />;
      case "risk":
        return <RiskTab />;
      case "calculator":
        return <CalculatorTab />;
    }
  }

  function CalculatorTab() {
    return (
      <div className="surface-1 rounded-xl p-5 md:p-6 fade-up">
        <div
          style={{
            fontSize: "var(--section-title)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-4)",
          }}
        >
          Position Size Calculator
        </div>
        <PositionSizeCalculator />
      </div>
    );
  }

  function OverviewTab() {
    return (
      <>
        {/* Equity curve — dominant */}
        <div className="surface-1 rounded-xl p-5 md:p-6 mb-4 fade-up">
          <div
            style={{
              fontSize: "var(--section-title)",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            Equity Curve
          </div>
          {hasEquityData ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={equityCurve}
                margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
              >
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent-profit)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent-profit)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                    fontSize: "11px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent-profit)"
                  strokeWidth={2}
                  fill="url(#equityFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="text-sm text-center py-16"
              style={{ color: "var(--text-dim)" }}
            >
              Insufficient data for equity curve
            </div>
          )}
        </div>

        {/* Compact stat row */}
        <div className="surface-1 rounded-xl px-6 py-4 mb-4 fade-up">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {[
              {
                value: `$${safeStats.expectancy.toFixed(2)}`,
                label: "Expectancy",
                color:
                  safeStats.expectancy >= 0
                    ? "var(--accent-profit)"
                    : "var(--accent-loss)",
              },
              {
                value:
                  safeStats.profitFactor === Infinity
                    ? "∞"
                    : safeStats.profitFactor.toFixed(2),
                label: "Profit Factor",
                color:
                  safeStats.profitFactor >= 1.5
                    ? "var(--accent-profit)"
                    : safeStats.profitFactor < 1
                      ? "var(--accent-loss)"
                      : "var(--text-primary)",
              },
              {
                value: advanced?.sharpeRatio?.toFixed(2) ?? "--",
                label: "Sharpe",
                color:
                  (advanced?.sharpeRatio ?? 0) >= 1
                    ? "var(--accent-profit)"
                    : "var(--text-primary)",
              },
              {
                value:
                  advanced?.sortinoRatio >= 99999
                    ? "∞"
                    : (advanced?.sortinoRatio?.toFixed(2) ?? "--"),
                label: "Sortino",
                color:
                  (advanced?.sortinoRatio ?? 0) >= 1.5
                    ? "var(--accent-profit)"
                    : "var(--text-primary)",
              },
            ].map((m, i) => (
              <div key={m.label} className="flex items-center gap-3">
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
                    fontSize: "var(--metric-secondary)",
                    fontWeight: 700,
                    color: m.color,
                  }}
                >
                  {m.value}
                </span>
                <span
                  style={{
                    fontSize: "var(--meta)",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Time Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Day of Week */}
          <div className="surface-1 rounded-xl p-4 md:p-5">
            <div
              className="text-xs tracking-widest mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              THIS WEEK'S PERFORMANCE
            </div>
            <div
              className="text-[10px] mb-4"
              style={{ color: "var(--text-dim)" }}
            >
              {weekRangeLabel}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={weekDayData}
                margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                    fontSize: "11px",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar
                  dataKey="pnl"
                  fill="var(--text-primary)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly P&L */}
          <div className="surface-1 rounded-xl p-4 md:p-5">
            <div
              className="text-xs tracking-widest mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              MONTHLY P&L — {currentYear}
            </div>
            <div
              className="text-[10px] mb-4"
              style={{ color: "var(--text-dim)" }}
            >
              Jan — Dec {currentYear}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={yearMonthData}
                margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                    fontSize: "11px",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar
                  dataKey="pnl"
                  fill="var(--text-primary)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Behavioral */}
        <div className="surface-1 rounded-xl p-4 md:p-5 mb-4">
          <div
            className="text-xs tracking-widest mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            BEHAVIORAL ERROR ANALYSIS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: "FOMO ENTRY",
                count: safeStats.behavioralStats.fomoCount,
                severity: getSeverity(safeStats.behavioralStats.fomoCount),
              },
              {
                label: "VENGEANCE TRADE",
                count: safeStats.behavioralStats.vengeanceCount,
                severity: getSeverity(safeStats.behavioralStats.vengeanceCount),
              },
              {
                label: "TREND ALIGNED",
                count: safeStats.behavioralStats.trendAlignedCount,
                severity: { label: "POSITIVE", color: "var(--accent-profit)" },
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded p-4"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  border:
                    item.label === "TREND ALIGNED"
                      ? "1px solid var(--accent-profit)22"
                      : `1px solid ${item.severity.color}22`,
                }}
              >
                <div
                  className="text-xs tracking-widest mb-2"
                  style={{ color: item.severity.color }}
                >
                  {item.severity.label}
                </div>
                <div className="text-sm font-bold mb-1">{item.label}</div>
                <div
                  className="text-xl md:text-2xl font-bold"
                  style={{ color: item.severity.color }}
                >
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-1 rounded-xl p-4 md:p-5 mb-4">
          <div
            className="text-xs tracking-widest mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            DIRECTION WIN RATE
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                dir: "LONG",
                rate: advanced?.winRateByDirection?.buy?.rate ?? 0,
                count: advanced?.winRateByDirection?.buy?.count ?? 0,
              },
              {
                dir: "SHORT",
                rate: advanced?.winRateByDirection?.sell?.rate ?? 0,
                count: advanced?.winRateByDirection?.sell?.count ?? 0,
              },
            ].map((d) => (
              <div
                key={d.dir}
                className="rounded p-4 text-center"
                style={{ backgroundColor: "var(--bg-primary)" }}
              >
                <div
                  className="text-xs tracking-widest mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {d.dir}
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color:
                      d.rate >= 50
                        ? "var(--accent-profit)"
                        : "var(--accent-loss)",
                  }}
                >
                  {d.rate}%
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-dim)" }}
                >
                  {d.count} TRADES
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function StrategyTab() {
    const stratRaw = strategyAnalytics?.byStrategy ?? safeStats.byStrategy;
    const stratData = stratRaw.map((s: any) => ({
      strategy: s.strategy ?? s.name ?? "Unknown",
      totalTrades: s.totalTrades ?? s.trades ?? 0,
      winRate: s.winRate ?? 0,
      profitFactor: s.profitFactor ?? 0,
      expectancy: s.expectancy ?? 0,
      avgRr: s.avgRr ?? 0,
      maxDrawdown: s.maxDrawdown ?? 0,
      totalPnl: s.totalPnl ?? s.pnl ?? 0,
    }));
    const best = strategyAnalytics?.bestStrategy ?? "";
    const worst = strategyAnalytics?.worstStrategy ?? "";

    return (
      <>
        {/* Best / Worst cards */}
        {stratData.length > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[best, worst].filter(Boolean).map((name) => {
              const s = stratData.find((x: any) => x.strategy === name);
              if (!s) return null;
              const isBest = name === best && name !== worst;
              return (
                <div
                  key={name}
                  className="rounded p-4"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: `1px solid ${isBest ? "var(--accent-profit)44" : "var(--accent-loss)44"}`,
                  }}
                >
                  <div
                    className="text-xs tracking-widest mb-1"
                    style={{
                      color: isBest
                        ? "var(--accent-profit)"
                        : "var(--accent-loss)",
                    }}
                  >
                    {isBest ? "BEST STRATEGY" : "WORST STRATEGY"}
                  </div>
                  <div className="text-sm font-bold tracking-wide">
                    #{s.strategy}
                  </div>
                  <div
                    className="text-lg md:text-xl font-bold mt-1"
                    style={{
                      color:
                        s.totalPnl >= 0
                          ? "var(--accent-profit)"
                          : "var(--accent-loss)",
                    }}
                  >
                    {s.totalPnl >= 0 ? "+" : ""}${(s.totalPnl ?? 0).toFixed(2)}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {s.totalTrades} TRADES · {s.winRate}% WIN RATE
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bar charts */}
        <StrategyBarCharts
          strategies={stratData.map((s: any) => ({
            strategy: s.strategy,
            winRate: s.winRate,
            profitFactor: s.profitFactor,
            expectancy: s.expectancy,
            avgRr: s.avgRr,
            maxDrawdown: s.maxDrawdown,
            totalPnl: s.totalPnl,
          }))}
        />

        {/* Multi-line trend chart */}
        <StrategyTrendChart series={strategyTrendSeries} />

        {/* Top / Bottom Symbols */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="surface-1 rounded-xl p-4 md:p-5">
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              TOP SYMBOLS
            </div>
            {(advanced?.topSymbols ?? []).length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {(advanced?.topSymbols ?? []).slice(0, 5).map((s: any) => (
                  <div
                    key={s.symbol}
                    className="flex justify-between items-center py-0.5"
                  >
                    <span
                      className="text-xs tracking-wide"
                      style={{ color: "var(--accent-profit)" }}
                    >
                      ▲ {s.symbol}
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: "var(--accent-profit)" }}
                    >
                      +${s.pnl} ({s.trades})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="text-xs text-center py-6"
                style={{ color: "var(--text-dim)" }}
              >
                NO SYMBOL DATA
              </div>
            )}
          </div>

          <div className="surface-1 rounded-xl p-4 md:p-5">
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              BOTTOM SYMBOLS
            </div>
            {(advanced?.bottomSymbols ?? []).length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {(advanced?.bottomSymbols ?? []).slice(0, 5).map((s: any) => (
                  <div
                    key={s.symbol}
                    className="flex justify-between items-center py-0.5"
                  >
                    <span
                      className="text-xs tracking-wide"
                      style={{ color: "var(--accent-loss)" }}
                    >
                      ▼ {s.symbol}
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: "var(--accent-loss)" }}
                    >
                      {s.pnl} ({s.trades})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="text-xs text-center py-6"
                style={{ color: "var(--text-dim)" }}
              >
                NO SYMBOL DATA
              </div>
            )}
          </div>
        </div>

        {/* Strategy comparison table */}
        {stratData.length > 1 && (
          <StrategyComparisonTable
            strategies={stratData}
            onSelect={setSelectedStrategy}
            bestStrategy={best}
            worstStrategy={worst}
          />
        )}

        {/* Strategy detail drawer */}
        {selectedStrategy &&
          (() => {
            const s = stratData.find(
              (x: any) => x.strategy === selectedStrategy,
            );
            if (!s) return null;
            return (
              <StrategyDrawer
                strategy={selectedStrategy}
                metrics={{
                  totalTrades: s.totalTrades,
                  winRate: s.winRate,
                  profitFactor: s.profitFactor,
                  expectancy: s.expectancy,
                  avgRr: s.avgRr,
                  maxDrawdown: s.maxDrawdown,
                  totalPnl: s.totalPnl,
                }}
                onClose={() => setSelectedStrategy(null)}
              />
            );
          })()}
      </>
    );
  }

  function RiskTab() {
    const hasRiskData = riskAnalytics?.distribution?.length > 0;
    const ra = riskAnalytics || {};

    const riskCards = [
      {
        label: "AVG RISK / TRADE",
        value:
          ra.avgRiskPerTrade != null
            ? `$${ra.avgRiskPerTrade.toFixed(2)}`
            : "--",
        sub: "PER TRADE WITH SL",
        valueColor:
          ra.avgRiskPerTrade > 500
            ? "var(--accent-warn)"
            : "var(--text-primary)",
      },
      {
        label: "MAX RISK / TRADE",
        value:
          ra.maxRiskPerTrade != null
            ? `$${ra.maxRiskPerTrade.toFixed(2)}`
            : "--",
        sub: "SINGLE TRADE",
        valueColor:
          ra.maxRiskPerTrade > 1000
            ? "var(--accent-loss)"
            : "var(--accent-warn)",
      },
      {
        label: "AVG R-MULTIPLE",
        value:
          ra.avgRMultiple != null ? `${ra.avgRMultiple.toFixed(2)}R` : "--",
        sub: "PNL / RISK",
        valueColor:
          (ra.avgRMultiple ?? 0) >= 1
            ? "var(--accent-profit)"
            : (ra.avgRMultiple ?? 0) >= 0
              ? "var(--accent-warn)"
              : "var(--accent-loss)",
      },
      {
        label: "VaR (95%)",
        value:
          ra.var95 != null
            ? `${ra.var95 < 0 ? "-" : "+"}$${Math.abs(ra.var95).toFixed(2)}`
            : "--",
        sub: "HISTORICAL 5TH PERCENTILE",
        valueColor:
          ra.var95 < 0 ? "var(--accent-loss)" : "var(--accent-profit)",
      },
      {
        label: "RISK EFFICIENCY",
        value:
          ra.riskEfficiency != null ? `${ra.riskEfficiency.toFixed(2)}x` : "--",
        sub: "PNL / TOTAL RISK",
        valueColor:
          (ra.riskEfficiency ?? 0) >= 1
            ? "var(--accent-profit)"
            : (ra.riskEfficiency ?? 0) >= 0
              ? "var(--accent-warn)"
              : "var(--accent-loss)",
      },
      {
        label: "MAX DRAWDOWN",
        value: `$${safeStats.maxDrawdown.toFixed(2)}`,
        sub: "PEAK TO TROUGH",
        valueColor:
          safeStats.maxDrawdown > 500
            ? "var(--accent-loss)"
            : safeStats.maxDrawdown > 200
              ? "var(--accent-warn)"
              : "var(--accent-profit)",
      },
    ];

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          {riskCards.map((card) => (
            <div key={card.label} className="surface-1 rounded-xl p-3 md:p-4">
              <div
                className="text-xs tracking-widest mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                {card.label}
              </div>
              <div
                className="text-lg md:text-xl font-bold"
                style={{ color: card.valueColor ?? "var(--text-primary)" }}
              >
                {card.value}
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--text-dim)" }}
              >
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <RiskDistributionChart data={ra.distribution ?? []} />
          <RiskByWeekChart data={ra.byWeek ?? []} />
        </div>

        {ra.byStrategy?.length > 0 && (
          <div className="surface-1 rounded-xl p-4 md:p-5 mb-4">
            <div
              className="text-xs tracking-widest mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              RISK BY STRATEGY
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr
                    style={{
                      color: "var(--text-dim)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <th className="text-left py-2 pr-3">STRATEGY</th>
                    <th className="text-right py-2 px-3">AVG RISK</th>
                    <th className="text-right py-2 px-3">MAX RISK</th>
                    <th className="text-right py-2 px-3">TRADES</th>
                    <th className="text-right py-2 px-3">WIN RATE</th>
                    <th className="text-right py-2 pl-3">AVG R</th>
                  </tr>
                </thead>
                <tbody>
                  {ra.byStrategy.map((s: any) => (
                    <tr
                      key={s.strategy}
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                      <td
                        className="py-2 pr-3 font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.strategy}
                      </td>
                      <td
                        className="text-right py-2 px-3"
                        style={{ color: "var(--text-primary)" }}
                      >
                        ${s.avgRisk.toFixed(2)}
                      </td>
                      <td
                        className="text-right py-2 px-3"
                        style={{ color: "var(--accent-warn)" }}
                      >
                        ${s.maxRisk.toFixed(2)}
                      </td>
                      <td
                        className="text-right py-2 px-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {s.count}
                      </td>
                      <td
                        className="text-right py-2 px-3"
                        style={{
                          color:
                            s.winRate >= 50
                              ? "var(--accent-profit)"
                              : "var(--accent-loss)",
                        }}
                      >
                        {s.winRate}%
                      </td>
                      <td
                        className="text-right py-2 pl-3"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.avgR.toFixed(2)}R
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {ra.riskByDirection && (
          <div className="surface-1 rounded-xl p-4 md:p-5 mb-4">
            <div
              className="text-xs tracking-widest mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              RISK BY DIRECTION
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { dir: "LONG", data: ra.riskByDirection.long },
                { dir: "SHORT", data: ra.riskByDirection.short },
              ].map((d) => (
                <div
                  key={d.dir}
                  className="rounded p-4 text-center"
                  style={{ backgroundColor: "var(--bg-primary)" }}
                >
                  <div
                    className="text-xs tracking-widest mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {d.dir}
                  </div>
                  <div
                    className="text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ${d.data?.avgRisk?.toFixed(2) ?? "--"}
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    AVG RISK
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      color:
                        (d.data?.winRate ?? 0) >= 50
                          ? "var(--accent-profit)"
                          : "var(--accent-loss)",
                    }}
                  >
                    {d.data?.winRate ?? 0}% WIN RATE
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {d.data?.count ?? 0} TRADES
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(advanced?.sharpeRatio != null ||
          advanced?.sortinoRatio != null ||
          advanced?.calmarRatio != null) && (
          <div className="surface-1 rounded-xl p-4 md:p-5">
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              RISK-ADJUSTED METRICS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "SHARPE RATIO",
                  value: advanced?.sharpeRatio?.toFixed(2) ?? "--",
                  threshold: 1,
                  desc: "≥1.0 GOOD",
                },
                {
                  label: "SORTINO RATIO",
                  value:
                    advanced?.sortinoRatio >= 99999
                      ? "∞"
                      : (advanced?.sortinoRatio?.toFixed(2) ?? "--"),
                  threshold: 1.5,
                  desc: "≥1.5 EXCELLENT",
                },
                {
                  label: "CALMAR RATIO",
                  value: advanced?.calmarRatio?.toFixed(2) ?? "--",
                  threshold: 1,
                  desc: "≥1.0 GOOD",
                },
              ].map((m) => {
                const val = m.value === "--" ? null : Number(m.value);
                return (
                  <div
                    key={m.label}
                    className="rounded p-4"
                    style={{ backgroundColor: "var(--bg-primary)" }}
                  >
                    <div
                      className="text-xs tracking-widest"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {m.label}
                    </div>
                    <div
                      className="text-2xl font-bold mt-1"
                      style={{
                        color:
                          val == null
                            ? "var(--text-primary)"
                            : val >= m.threshold
                              ? "var(--accent-profit)"
                              : val >= 0
                                ? "var(--accent-warn)"
                                : "var(--accent-loss)",
                      }}
                    >
                      {m.value}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {m.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <DashboardShell>
      <div
        className="min-h-screen"
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-display)",
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
              PROTOCOL ANALYTICS
            </h1>
            <p
              className="text-xs mt-1 tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              SYSTEM_VERSION_5.0 // ADVANCED_ANALYTICS
            </p>
          </div>
          {!error && (
            <div className="text-right">
              <div
                className="text-xs tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                NET P/L
              </div>
              <div
                className="text-xl md:text-2xl font-bold"
                style={{
                  color:
                    safeStats.totalPnl >= 0
                      ? "var(--accent-profit)"
                      : "var(--accent-loss)",
                }}
              >
                {safeStats.totalPnl >= 0 ? "+" : ""}$
                {safeStats.totalPnl.toFixed(2)}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                WIN RATE:{" "}
                <span style={{ color: "var(--text-primary)" }}>
                  {safeStats.winRate}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--bg-primary)",
            padding: "8px 0",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                background:
                  activeTab === t.key ? "var(--accent)" : "transparent",
                color: activeTab === t.key ? "#fff" : "var(--text-muted)",
                border: "none",
                padding: "6px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-sm)",
                fontWeight: activeTab === t.key ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s var(--ease-out)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="surface-1 rounded-xl p-6 py-14">
            <div className="space-y-3">
              <div
                className="h-3 rounded"
                style={{ background: "var(--border-subtle)", width: "35%" }}
              />
              <div
                className="h-3 rounded"
                style={{ background: "var(--border-subtle)", width: "60%" }}
              />
              <div
                className="h-3 rounded"
                style={{ background: "var(--border-subtle)", width: "45%" }}
              />
              <div
                className="h-40 rounded-lg mt-4"
                style={{ background: "var(--border-subtle)" }}
              />
            </div>
          </div>
        )}

        {!loading && error && (
          <div
            className="text-center py-16 tracking-widest"
            style={{ color: "var(--accent-warn)" }}
          >
            ERROR LOADING ANALYTICS: {error}
          </div>
        )}

        {!loading && !error && activeTab === "calculator" && (
          <>
            {renderTabContent()}
            <div className="surface-1 rounded-xl px-4 md:px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
              <span
                className="text-xs tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                POSITION SIZE CALCULATOR // RISK-BASED SIZING TOOL
              </span>
            </div>
          </>
        )}

        {!loading && !error && safeStats.totalTrades === 0 && activeTab !== "calculator" && (
          <EmptyState
            title="NO TRADE DATA AVAILABLE"
            description="Start journaling your trades to unlock advanced protocol analytics, equity curves, and strategy breakdowns."
            actionLabel="NEW TRADE"
            actionHref="/trades/new"
          />
        )}

        {!loading && !error && safeStats.totalTrades > 0 && (
          <>
            {renderTabContent()}

            <div className="surface-1 rounded-xl px-4 md:px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
              <span
                className="text-xs tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                ANALYTIC INSIGHT // {safeStats.totalTrades} EXECUTION
                {safeStats.totalTrades !== 1 ? "S" : ""} PROCESSED
              </span>
              <div className="flex gap-4 md:gap-6">
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  PROTOCOL INTEGRITY:{" "}
                  <span style={{ color: "var(--accent-profit)" }}>
                    VERIFIED
                  </span>
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  SYSTEM STATUS:{" "}
                  <span style={{ color: "var(--accent-profit)" }}>NOMINAL</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
