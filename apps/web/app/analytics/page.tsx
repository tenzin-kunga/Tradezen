"use client";
import { useEffect, useState, useCallback } from "react";
import { getAnalytics, getDailyPnl } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useRealtime } from "@/hooks/use-realtime";

function getSeverity(count: number): { label: string; color: string } {
  if (count > 5) return { label: "CRITICAL", color: "var(--accent-loss)" };
  if (count > 2) return { label: "MODERATE", color: "var(--accent-warn)" };
  return { label: "WARNING", color: "var(--text-muted)" };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [dailyPnl, setDailyPnl] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(() => {
    Promise.all([getAnalytics(), getDailyPnl()])
      .then(([analyticsRes, dailyRes]) => {
        setStats(analyticsRes);
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

  useRealtime('trade:created', () => {
    loadAnalytics();
  });

  useRealtime('trade:updated', () => {
    loadAnalytics();
  });

  useRealtime('trade:deleted', () => {
    loadAnalytics();
  });

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
    behavioralStats: {
      fomoCount: Number(stats?.behavioralStats?.fomoCount ?? 0),
      vengeanceCount: Number(stats?.behavioralStats?.vengeanceCount ?? 0),
      trendAlignedCount: Number(stats?.behavioralStats?.trendAlignedCount ?? 0),
    },
  };

  const maxStratPnl = safeStats.byStrategy.length > 0
    ? Math.max(...safeStats.byStrategy.map((s: any) => Math.abs(Number(s.pnl) || 0)), 1)
    : 1;

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            PROTOCOL ANALYTICS
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-dim)" }}>
            SYSTEM_VERSION_4.2 // AGGREGATED_DATA_7D
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
          {/* Row 1: Strategy + Day of Week */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Strategy Efficiency */}
            <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                STRATEGY EFFICIENCY BREAKDOWN
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
                      <div
                        className="h-1 rounded transition-all"
                        style={{
                          width: `${(Math.abs(s.pnl) / maxStratPnl) * 100}%`,
                          backgroundColor: s.pnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Day of Week */}
            <div className="rounded p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                DAY OF WEEK PERFORMANCE
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={safeStats.byDayOfWeek} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="pnl" fill="var(--text-primary)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Behavioral Errors */}
          <div className="rounded p-4 md:p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              BEHAVIORAL ERROR ANALYSIS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* FOMO */}
              {(() => {
                const count = safeStats.behavioralStats.fomoCount;
                const sev = getSeverity(count);
                return (
                  <div className="rounded p-4" style={{ backgroundColor: "var(--bg-primary)", border: `1px solid ${sev.color}22` }}>
                    <div className="text-xs tracking-widest mb-2" style={{ color: sev.color }}>
                      {sev.label}
                    </div>
                    <div className="text-sm font-bold mb-1">FOMO ENTRY</div>
                    <div className="text-xl md:text-2xl font-bold" style={{ color: sev.color }}>{count}</div>
                  </div>
                );
              })()}
              {/* VENGEANCE */}
              {(() => {
                const count = safeStats.behavioralStats.vengeanceCount;
                const sev = getSeverity(count);
                return (
                  <div className="rounded p-4" style={{ backgroundColor: "var(--bg-primary)", border: `1px solid ${sev.color}22` }}>
                    <div className="text-xs tracking-widest mb-2" style={{ color: sev.color }}>
                      {sev.label}
                    </div>
                    <div className="text-sm font-bold mb-1">VENGEANCE TRADE</div>
                    <div className="text-xl md:text-2xl font-bold" style={{ color: sev.color }}>{count}</div>
                  </div>
                );
              })()}
              {/* TREND ALIGNED */}
              {(() => {
                const count = safeStats.behavioralStats.trendAlignedCount;
                return (
                  <div className="rounded p-4" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--accent-profit)22" }}>
                    <div className="text-xs tracking-widest mb-2" style={{ color: "var(--accent-profit)" }}>
                      POSITIVE
                    </div>
                    <div className="text-sm font-bold mb-1">TREND ALIGNED</div>
                    <div className="text-xl md:text-2xl font-bold" style={{ color: "var(--accent-profit)" }}>{count}</div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Row 3: Bottom stat cards */}
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
                label: "MAX DRAWDOWN",
                value: `$${safeStats.maxDrawdown.toFixed(2)}`,
                sub: "PEAK TO TROUGH",
                valueColor: safeStats.maxDrawdown > 500 ? "var(--accent-loss)" : safeStats.maxDrawdown > 200 ? "var(--accent-warn)" : "var(--accent-profit)",
              },
              {
                label: "STREAK",
                value: `W${safeStats.maxConsecutiveWins} / L${safeStats.maxConsecutiveLosses}`,
                sub: "MAX CONSECUTIVE",
                valueColor: "var(--text-primary)",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded p-4 md:p-5"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  {card.label}
                </div>
                <div className="text-xl md:text-2xl font-bold" style={{ color: card.valueColor ?? "var(--text-primary)" }}>
                  {card.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Row 4: Daily PnL Chart */}
          <div className="rounded p-4 md:p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              DAILY P&L — EQUITY CURVE
            </div>
            {dailyPnl.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyPnl} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]} fill="var(--text-primary)" {...{}} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-center py-10" style={{ color: "var(--text-dim)" }}>
                NO DAILY DATA AVAILABLE
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="rounded px-4 md:px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <span className="text-xs tracking-widest" style={{ color: "var(--text-dim)" }}>
              ANALYTIC INSIGHT // {safeStats.totalTrades} EXECUTION{safeStats.totalTrades !== 1 ? "S" : ""} PROCESSED
            </span>
            <div className="flex gap-4 md:gap-6">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                PROTOCOL INTEGRITY:{" "}
                <span style={{ color: "var(--accent-profit)" }}>VERIFIED</span>
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                SYSTEM STATUS:{" "}
                <span style={{ color: "var(--accent-profit)" }}>NOMINAL</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
