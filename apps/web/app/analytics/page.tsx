"use client";
import { useEffect, useState, useCallback } from "react";
import { getAnalytics, getAdvancedAnalytics, getDailyPnl } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(() => {
    Promise.all([getAnalytics(), getAdvancedAnalytics(), getDailyPnl()])
      .then(([analyticsRes, advancedRes, dailyRes]) => {
        setStats(analyticsRes);
        setAdvanced(advancedRes);
        setDailyPnl(dailyRes);
      })
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

  const maxStratPnl = safeStats.byStrategy.length > 0
    ? Math.max(...safeStats.byStrategy.map((s: any) => Math.abs(Number(s.pnl) || 0)), 1)
    : 1;

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
    return (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Strategy Efficiency */}
        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            STRATEGY EFFICIENCY
          </div>
          {safeStats.byStrategy.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--text-dim)" }}>NO STRATEGY DATA</div>
          ) : (
            safeStats.byStrategy.map((s: any) => (
              <div key={s.name} className="mb-3.5">
                <div className="flex justify-between mb-1">
                  <span className="text-xs tracking-wide" style={{ color: "var(--text-primary)" }}>#{s.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {(s.winRate * 100).toFixed(0)}% WIN · {s.trades} TRADES
                  </span>
                </div>
                <div className="h-1 rounded" style={{ backgroundColor: "var(--border)" }}>
                  <div className="h-1 rounded transition-all" style={{
                    width: `${(Math.abs(s.pnl) / maxStratPnl) * 100}%`,
                    backgroundColor: s.pnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)",
                  }} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Top / Bottom Symbols */}
        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            TOP / BOTTOM SYMBOLS
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            {(advanced?.topSymbols ?? []).slice(0, 5).map((s: any) => (
              <div key={s.symbol} className="flex justify-between items-center py-0.5">
                <span className="text-xs tracking-wide" style={{ color: "var(--accent-profit)" }}>▲ {s.symbol}</span>
                <span className="text-xs font-mono" style={{ color: "var(--accent-profit)" }}>+${s.pnl} ({s.trades})</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {(advanced?.bottomSymbols ?? []).slice(0, 5).map((s: any) => (
              <div key={s.symbol} className="flex justify-between items-center py-0.5">
                <span className="text-xs tracking-wide" style={{ color: "var(--accent-loss)" }}>▼ {s.symbol}</span>
                <span className="text-xs font-mono" style={{ color: "var(--accent-loss)" }}>{s.pnl} ({s.trades})</span>
              </div>
            ))}
          </div>
          {(!advanced?.topSymbols?.length && !advanced?.bottomSymbols?.length) && (
            <div className="text-xs text-center py-6" style={{ color: "var(--text-dim)" }}>NO SYMBOL DATA</div>
          )}
        </div>
      </div>

      {/* Strategy comparison table */}
      {safeStats.byStrategy.length > 1 && (
        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            STRATEGY COMPARISON
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["STRATEGY", "TRADES", "WIN RATE", "P&L", "AVG P&L / TRADE"].map((h) => (
                    <th key={h} className="tracking-widest py-2 pr-4 text-left" style={{ color: "var(--text-dim)", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {safeStats.byStrategy.map((s: any) => (
                  <tr key={s.name} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2.5 pr-4 font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>#{s.name}</td>
                    <td className="py-2.5 pr-4" style={{ color: "var(--text-muted)" }}>{s.trades}</td>
                    <td className="py-2.5 pr-4 font-mono" style={{ color: (s.winRate * 100) >= 50 ? "var(--accent-profit)" : "var(--accent-loss)" }}>{(s.winRate * 100).toFixed(0)}%</td>
                    <td className="py-2.5 pr-4 font-mono" style={{ color: s.pnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>{s.pnl >= 0 ? "+" : ""}${Number(s.pnl).toFixed(2)}</td>
                    <td className="py-2.5 pr-4 font-mono" style={{ color: (s.pnl / s.trades) >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>{(s.pnl / s.trades) >= 0 ? "+" : ""}${(s.pnl / s.trades).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            {
              label: "MAX DRAWDOWN",
              value: `$${safeStats.maxDrawdown.toFixed(2)}`,
              sub: "PEAK TO TROUGH",
              valueColor: safeStats.maxDrawdown > 500 ? "var(--accent-loss)" : safeStats.maxDrawdown > 200 ? "var(--accent-warn)" : "var(--accent-profit)",
            },
            {
              label: "CALMAR RATIO",
              value: advanced?.calmarRatio?.toFixed(2) ?? "--",
              sub: "RETURN / DRAWDOWN",
              valueColor: (advanced?.calmarRatio ?? 0) >= 1 ? "var(--accent-profit)" : (advanced?.calmarRatio ?? 0) >= 0 ? "var(--accent-warn)" : "var(--accent-loss)",
            },
            {
              label: "CURRENT STREAK",
              value: (advanced?.currentStreak?.type ?? "none") === "none" ? "--" : `${advanced.currentStreak.type === "win" ? "🔥" : "❄️"} ${advanced.currentStreak.count}`,
              sub: (advanced?.currentStreak?.type ?? "none") === "none" ? "NO STREAK" : `${advanced.currentStreak.type.toUpperCase()} STREAK`,
              valueColor: advanced?.currentStreak?.type === "win" ? "var(--accent-profit)" : advanced?.currentStreak?.type === "loss" ? "var(--accent-loss)" : "var(--text-muted)",
            },
            {
              label: "MAX STREAK",
              value: `W${safeStats.maxConsecutiveWins} / L${safeStats.maxConsecutiveLosses}`,
              sub: "CONSECUTIVE",
              valueColor: "var(--text-primary)",
            },
          ].map((card) => (
            <div key={card.label} className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{card.label}</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: card.valueColor ?? "var(--text-primary)" }}>{card.value}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            RISK METRICS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "SHARPE RATIO", value: advanced?.sharpeRatio?.toFixed(2) ?? "--", threshold: 1, desc: "≥1.0 GOOD" },
              { label: "SORTINO RATIO", value: advanced?.sortinoRatio >= 99999 ? "∞" : advanced?.sortinoRatio?.toFixed(2) ?? "--", threshold: 1.5, desc: "≥1.5 EXCELLENT" },
              { label: "CALMAR RATIO", value: advanced?.calmarRatio?.toFixed(2) ?? "--", threshold: 1, desc: "≥1.0 GOOD" },
            ].map((m) => (
              <div key={m.label} className="rounded p-4" style={{ backgroundColor: "var(--bg-primary)" }}>
                <div className="text-xs tracking-widest" style={{ color: "var(--text-dim)" }}>{m.label}</div>
                <div className="text-2xl font-bold mt-1" style={{
                  color: Number(m.value) >= m.threshold ? "var(--accent-profit)" : Number(m.value) >= 0 ? "var(--accent-warn)" : "var(--accent-loss)",
                }}>
                  {m.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
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
