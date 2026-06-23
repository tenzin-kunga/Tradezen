"use client";
import { useEffect, useState, useCallback } from "react";
import { getAnalytics, getAdvancedAnalytics, getDailyPnl, getStrategyAnalytics, getStrategyPerformance, getRiskAnalytics } from "@/lib/api";
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
type Tab = "overview" | "strategy" | "time" | "behavioral" | "risk";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "OVERVIEW" },
  { key: "strategy", label: "STRATEGY" },
  { key: "time", label: "TIME" },
  { key: "behavioral", label: "BEHAVIORAL" },
  { key: "risk", label: "RISK" },
];

function getSeverity(count: number): { label: string; color: string } {
  if (count > 5) return { label: "CRITICAL", color: "var(--accent-loss)" };
  if (count > 2) return { label: "MODERATE", color: "var(--accent-warn)" };
  return { label: "WARNING", color: "var(--text-muted)" };
}

const tabBtn = (active: boolean) =>
  `text-xs tracking-widest px-3 py-2 rounded border-none cursor-pointer transition-all ${
    active
      ? "font-bold"
      : "opacity-50 hover:opacity-80"
  }`;

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
      Promise.all([getAnalytics(), getAdvancedAnalytics(), getDailyPnl(), getRiskAnalytics()]).then(
        ([analyticsRes, advancedRes, dailyRes, riskRes]) => {
          setStats(analyticsRes);
          setAdvanced(advancedRes);
          setDailyPnl(dailyRes);
          setRiskAnalytics(riskRes);
        },
      ),
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
        setError(err instanceof Error ? err.message : "Unable to load analytics data.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useRealtime('trade:created', loadAnalytics);
  useRealtime('trade:updated', loadAnalytics);
  useRealtime('trade:deleted', loadAnalytics);

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

  function renderTabContent() {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "strategy": return <StrategyTab />;
      case "time": return <TimeTab />;
      case "behavioral": return <BehavioralTab />;
      case "risk": return <RiskTab />;
    }
  }

  function OverviewTab() {
    return (
      <>
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            {
              label: "EXPECTANCY",
              value: `$${safeStats.expectancy.toFixed(2)}`,
              sub: "PER TRADE",
              valueColor: safeStats.expectancy >= 0 ? "var(--accent-profit)" : "var(--accent-loss)",
            },
            {
              label: "PROFIT FACTOR",
              value: safeStats.profitFactor === Infinity ? "∞" : safeStats.profitFactor.toFixed(2),
              sub: `BEST: $${safeStats.bestTrade} / WORST: $${safeStats.worstTrade}`,
              valueColor: safeStats.profitFactor >= 1.5 ? "var(--accent-profit)" : "var(--accent-loss)",
            },
            {
              label: "SHARPE RATIO",
              value: advanced?.sharpeRatio?.toFixed(2) ?? "--",
              sub: "RISK-ADJUSTED RETURN",
              valueColor: (advanced?.sharpeRatio ?? 0) >= 1 ? "var(--accent-profit)" : (advanced?.sharpeRatio ?? 0) >= 0 ? "var(--accent-warn)" : "var(--accent-loss)",
            },
            {
              label: "SORTINO RATIO",
              value: advanced?.sortinoRatio >= 99999 ? "∞" : advanced?.sortinoRatio?.toFixed(2) ?? "--",
              sub: "DOWNSIDE RISK",
              valueColor: (advanced?.sortinoRatio ?? 0) >= 1.5 ? "var(--accent-profit)" : (advanced?.sortinoRatio ?? 0) >= 0 ? "var(--accent-warn)" : "var(--accent-loss)",
            },
          ].map((card) => (
            <div key={card.label} className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{card.label}</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: card.valueColor ?? "var(--text-primary)" }}>{card.value}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Equity curve */}
        <div className="rounded p-4 md:p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            EQUITY CURVE
          </div>
          {hasEquityData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equityCurve} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-profit)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent-profit)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent-profit)" strokeWidth={2} fill="url(#equityFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-center py-10" style={{ color: "var(--text-dim)" }}>INSUFFICIENT DATA FOR EQUITY CURVE</div>
          )}
        </div>

        {/* Daily P&L */}
        <div className="rounded p-4 md:p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            DAILY P&L
          </div>
          {dailyPnl.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyPnl} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-center py-10" style={{ color: "var(--text-dim)" }}>NO DAILY DATA AVAILABLE</div>
          )}
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
                <div className="text-xs tracking-widest mb-1" style={{ color: isBest ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                  {isBest ? "BEST STRATEGY" : "WORST STRATEGY"}
                </div>
                <div className="text-sm font-bold tracking-wide">#{s.strategy}</div>
                <div className="text-lg md:text-xl font-bold mt-1" style={{ color: s.totalPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                  {s.totalPnl >= 0 ? "+" : ""}${(s.totalPnl ?? 0).toFixed(2)}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
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
        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            TOP SYMBOLS
          </div>
          {(advanced?.topSymbols ?? []).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {(advanced?.topSymbols ?? []).slice(0, 5).map((s: any) => (
                <div key={s.symbol} className="flex justify-between items-center py-0.5">
                  <span className="text-xs tracking-wide" style={{ color: "var(--accent-profit)" }}>▲ {s.symbol}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--accent-profit)" }}>+${s.pnl} ({s.trades})</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-center py-6" style={{ color: "var(--text-dim)" }}>NO SYMBOL DATA</div>
          )}
        </div>

        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            BOTTOM SYMBOLS
          </div>
          {(advanced?.bottomSymbols ?? []).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {(advanced?.bottomSymbols ?? []).slice(0, 5).map((s: any) => (
                <div key={s.symbol} className="flex justify-between items-center py-0.5">
                  <span className="text-xs tracking-wide" style={{ color: "var(--accent-loss)" }}>▼ {s.symbol}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--accent-loss)" }}>{s.pnl} ({s.trades})</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-center py-6" style={{ color: "var(--text-dim)" }}>NO SYMBOL DATA</div>
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
      {selectedStrategy && (() => {
        const s = stratData.find((x: any) => x.strategy === selectedStrategy);
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

  function TimeTab() {

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Day of Week */}
        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            DAY OF WEEK PERFORMANCE
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={safeStats.byDayOfWeek} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="pnl" fill="var(--text-primary)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* byMonth */}
        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            MONTHLY P&L
          </div>
          {safeStats.byMonth?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={safeStats.byMonth} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="pnl" fill="var(--text-primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-center py-6" style={{ color: "var(--text-dim)" }}>NO MONTHLY DATA</div>
          )}
        </div>
      </div>
    );
  }

  function BehavioralTab() {
    return (
      <>
        <div className="rounded p-4 md:p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
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
              <div key={item.label} className="rounded p-4" style={{
                backgroundColor: "var(--bg-primary)",
                border: item.label === "TREND ALIGNED" ? "1px solid var(--accent-profit)22" : `1px solid ${item.severity.color}22`,
              }}>
                <div className="text-xs tracking-widest mb-2" style={{ color: item.severity.color }}>
                  {item.severity.label}
                </div>
                <div className="text-sm font-bold mb-1">{item.label}</div>
                <div className="text-xl md:text-2xl font-bold" style={{ color: item.severity.color }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
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
              <div key={d.dir} className="rounded p-4 text-center" style={{ backgroundColor: "var(--bg-primary)" }}>
                <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{d.dir}</div>
                <div className="text-2xl font-bold" style={{ color: d.rate >= 50 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                  {d.rate}%
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{d.count} TRADES</div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function RiskTab() {
    const hasRiskData = riskAnalytics?.distribution?.length > 0;
    const ra = riskAnalytics || {};

    const riskCards = [
      {
        label: "AVG RISK / TRADE",
        value: ra.avgRiskPerTrade != null ? `$${ra.avgRiskPerTrade.toFixed(2)}` : "--",
        sub: "PER TRADE WITH SL",
        valueColor: ra.avgRiskPerTrade > 500 ? "var(--accent-warn)" : "var(--text-primary)",
      },
      {
        label: "MAX RISK / TRADE",
        value: ra.maxRiskPerTrade != null ? `$${ra.maxRiskPerTrade.toFixed(2)}` : "--",
        sub: "SINGLE TRADE",
        valueColor: ra.maxRiskPerTrade > 1000 ? "var(--accent-loss)" : "var(--accent-warn)",
      },
      {
        label: "AVG R-MULTIPLE",
        value: ra.avgRMultiple != null ? `${ra.avgRMultiple.toFixed(2)}R` : "--",
        sub: "PNL / RISK",
        valueColor: (ra.avgRMultiple ?? 0) >= 1 ? "var(--accent-profit)" : (ra.avgRMultiple ?? 0) >= 0 ? "var(--accent-warn)" : "var(--accent-loss)",
      },
      {
        label: "VaR (95%)",
        value: ra.var95 != null ? `${ra.var95 < 0 ? "-" : "+"}$${Math.abs(ra.var95).toFixed(2)}` : "--",
        sub: "HISTORICAL 5TH PERCENTILE",
        valueColor: ra.var95 < 0 ? "var(--accent-loss)" : "var(--accent-profit)",
      },
      {
        label: "RISK EFFICIENCY",
        value: ra.riskEfficiency != null ? `${ra.riskEfficiency.toFixed(2)}x` : "--",
        sub: "PNL / TOTAL RISK",
        valueColor: (ra.riskEfficiency ?? 0) >= 1 ? "var(--accent-profit)" : (ra.riskEfficiency ?? 0) >= 0 ? "var(--accent-warn)" : "var(--accent-loss)",
      },
      {
        label: "MAX DRAWDOWN",
        value: `$${safeStats.maxDrawdown.toFixed(2)}`,
        sub: "PEAK TO TROUGH",
        valueColor: safeStats.maxDrawdown > 500 ? "var(--accent-loss)" : safeStats.maxDrawdown > 200 ? "var(--accent-warn)" : "var(--accent-profit)",
      },
    ];

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          {riskCards.map((card) => (
            <div key={card.label} className="rounded p-3 md:p-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{card.label}</div>
              <div className="text-lg md:text-xl font-bold" style={{ color: card.valueColor ?? "var(--text-primary)" }}>{card.value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <RiskDistributionChart data={ra.distribution ?? []} />
          <RiskByWeekChart data={ra.byWeek ?? []} />
        </div>

        {ra.byStrategy?.length > 0 && (
          <div className="rounded p-4 md:p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              RISK BY STRATEGY
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
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
                    <tr key={s.strategy} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-2 pr-3 font-medium" style={{ color: "var(--text-primary)" }}>{s.strategy}</td>
                      <td className="text-right py-2 px-3" style={{ color: "var(--text-primary)" }}>${s.avgRisk.toFixed(2)}</td>
                      <td className="text-right py-2 px-3" style={{ color: "var(--accent-warn)" }}>${s.maxRisk.toFixed(2)}</td>
                      <td className="text-right py-2 px-3" style={{ color: "var(--text-muted)" }}>{s.count}</td>
                      <td className="text-right py-2 px-3" style={{ color: s.winRate >= 50 ? "var(--accent-profit)" : "var(--accent-loss)" }}>{s.winRate}%</td>
                      <td className="text-right py-2 pl-3" style={{ color: "var(--text-primary)" }}>{s.avgR.toFixed(2)}R</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {ra.riskByDirection && (
          <div className="rounded p-4 md:p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              RISK BY DIRECTION
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { dir: "LONG", data: ra.riskByDirection.long },
                { dir: "SHORT", data: ra.riskByDirection.short },
              ].map((d) => (
                <div key={d.dir} className="rounded p-4 text-center" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{d.dir}</div>
                  <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    ${d.data?.avgRisk?.toFixed(2) ?? "--"}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>AVG RISK</div>
                  <div className="mt-2" style={{ color: (d.data?.winRate ?? 0) >= 50 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                    {d.data?.winRate ?? 0}% WIN RATE
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>{d.data?.count ?? 0} TRADES</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(advanced?.sharpeRatio != null || advanced?.sortinoRatio != null || advanced?.calmarRatio != null) && (
          <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              RISK-ADJUSTED METRICS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "SHARPE RATIO", value: advanced?.sharpeRatio?.toFixed(2) ?? "--", threshold: 1, desc: "≥1.0 GOOD" },
                { label: "SORTINO RATIO", value: advanced?.sortinoRatio >= 99999 ? "∞" : advanced?.sortinoRatio?.toFixed(2) ?? "--", threshold: 1.5, desc: "≥1.5 EXCELLENT" },
                { label: "CALMAR RATIO", value: advanced?.calmarRatio?.toFixed(2) ?? "--", threshold: 1, desc: "≥1.0 GOOD" },
              ].map((m) => {
                const val = m.value === "--" ? null : Number(m.value);
                return (
                <div key={m.label} className="rounded p-4" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <div className="text-xs tracking-widest" style={{ color: "var(--text-dim)" }}>{m.label}</div>
                  <div className="text-2xl font-bold mt-1" style={{
                    color: val == null ? "var(--text-primary)" : val >= m.threshold ? "var(--accent-profit)" : val >= 0 ? "var(--accent-warn)" : "var(--accent-loss)",
                  }}>
                    {m.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{m.desc}</div>
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
    <div className="min-h-screen" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">PROTOCOL ANALYTICS</h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-dim)" }}>
            SYSTEM_VERSION_5.0 // ADVANCED_ANALYTICS
          </p>
        </div>
        {!error && (
          <div className="text-right">
            <div className="text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>NET P/L</div>
            <div className="text-xl md:text-2xl font-bold" style={{ color: safeStats.totalPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
              {safeStats.totalPnl >= 0 ? "+" : ""}${safeStats.totalPnl.toFixed(2)}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              WIN RATE: <span style={{ color: "var(--text-primary)" }}>{safeStats.winRate}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              color: activeTab === t.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === t.key ? "2px solid var(--accent-cyan)" : "2px solid transparent",
              marginBottom: -1,
            }}
            className={tabBtn(activeTab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-16 tracking-widest" style={{ color: "var(--text-muted)" }}>
          LOADING PROTOCOL DATA...
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16 tracking-widest" style={{ color: "var(--accent-warn)" }}>
          ERROR LOADING ANALYTICS: {error}
        </div>
      )}

      {!loading && !error && safeStats.totalTrades === 0 && (
        <div className="text-center py-16 tracking-widest" style={{ color: "var(--text-dim)" }}>
          NO TRADE DATA AVAILABLE
        </div>
      )}

      {!loading && !error && safeStats.totalTrades > 0 && (
        <>
          {renderTabContent()}

          <div className="rounded px-4 md:px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <span className="text-xs tracking-widest" style={{ color: "var(--text-dim)" }}>
              ANALYTIC INSIGHT // {safeStats.totalTrades} EXECUTION{safeStats.totalTrades !== 1 ? "S" : ""} PROCESSED
            </span>
            <div className="flex gap-4 md:gap-6">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                PROTOCOL INTEGRITY: <span style={{ color: "var(--accent-profit)" }}>VERIFIED</span>
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                SYSTEM STATUS: <span style={{ color: "var(--accent-profit)" }}>NOMINAL</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
