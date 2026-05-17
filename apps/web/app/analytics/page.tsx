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
  if (count > 5) return { label: "CRITICAL", color: "#ef4444" };
  if (count > 2) return { label: "MODERATE", color: "#e8603c" };
  return { label: "WARNING", color: "#888888" };
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
    <div style={{ minHeight: "100vh", backgroundColor: "#111111", color: "#ffffff", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>
            PROTOCOL ANALYTICS
          </h1>
          <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            SYSTEM_VERSION_4.2 // AGGREGATED_DATA_7D
          </p>
        </div>
        {!error && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em" }}>NET P/L</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: safeStats.totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
              {safeStats.totalPnl >= 0 ? "+" : ""}${safeStats.totalPnl.toFixed(2)}
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
              WIN RATE: <span style={{ color: "#ffffff" }}>{safeStats.winRate}%</span>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#888", padding: "60px 0", letterSpacing: "0.2em" }}>
          LOADING PROTOCOL DATA...
        </div>
      )}

      {!loading && error && (
        <div style={{ textAlign: "center", color: "#ff7f50", padding: "60px 0", letterSpacing: "0.2em" }}>
          ERROR LOADING ANALYTICS: {error}
        </div>
      )}

      {!loading && !error && safeStats.totalTrades === 0 && (
        <div style={{ textAlign: "center", color: "#555", padding: "60px 0", letterSpacing: "0.2em" }}>
          NO TRADE DATA AVAILABLE
        </div>
      )}

      {!loading && !error && safeStats.totalTrades > 0 && (
        <>
          {/* Row 1: Strategy Efficiency + Asset Distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Strategy Efficiency */}
            <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px" }}>
              <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
                STRATEGY EFFICIENCY BREAKDOWN
              </div>
              {safeStats.byStrategy.length === 0 ? (
                <div style={{ color: "#555", fontSize: "12px" }}>NO STRATEGY DATA</div>
              ) : (
                safeStats.byStrategy.map((s: any) => (
                  <div key={s.name} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#ccc" }}>#{s.name}</span>
                      <span style={{ fontSize: "11px", color: "#888" }}>
                        {(s.winRate * 100).toFixed(0)}% WIN · {s.trades} TRADES
                      </span>
                    </div>
                    <div style={{ height: "4px", backgroundColor: "#2a2a2a", borderRadius: "2px" }}>
                      <div
                        style={{
                          height: "4px",
                          borderRadius: "2px",
                          width: `${(Math.abs(s.pnl) / maxStratPnl) * 100}%`,
                          backgroundColor: s.pnl >= 0 ? "#22c55e" : "#ef4444",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Day of Week Distribution */}
            <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px" }}>
              <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
                DAY OF WEEK PERFORMANCE
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={safeStats.byDayOfWeek} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", color: "#fff", fontFamily: "monospace", fontSize: "11px" }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="pnl" fill="#ffffff" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Behavioral Errors */}
          <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
              BEHAVIORAL ERROR ANALYSIS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {/* FOMO */}
              {(() => {
                const count = safeStats.behavioralStats.fomoCount;
                const sev = getSeverity(count);
                return (
                  <div style={{ backgroundColor: "#111", border: `1px solid ${sev.color}22`, borderRadius: "4px", padding: "16px" }}>
                    <div style={{ fontSize: "10px", color: sev.color, letterSpacing: "0.12em", marginBottom: "8px" }}>
                      {sev.label}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>FOMO ENTRY</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: sev.color }}>{count}</div>
                  </div>
                );
              })()}
              {/* VENGEANCE */}
              {(() => {
                const count = safeStats.behavioralStats.vengeanceCount;
                const sev = getSeverity(count);
                return (
                  <div style={{ backgroundColor: "#111", border: `1px solid ${sev.color}22`, borderRadius: "4px", padding: "16px" }}>
                    <div style={{ fontSize: "10px", color: sev.color, letterSpacing: "0.12em", marginBottom: "8px" }}>
                      {sev.label}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>VENGEANCE TRADE</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: sev.color }}>{count}</div>
                  </div>
                );
              })()}
              {/* TREND ALIGNED */}
              {(() => {
                const count = safeStats.behavioralStats.trendAlignedCount;
                return (
                  <div style={{ backgroundColor: "#111", border: "1px solid #22c55e22", borderRadius: "4px", padding: "16px" }}>
                    <div style={{ fontSize: "10px", color: "#22c55e", letterSpacing: "0.12em", marginBottom: "8px" }}>
                      POSITIVE
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>TREND ALIGNED</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#22c55e" }}>{count}</div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Row 3: Bottom stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "16px" }}>
            {[
              {
                label: "EXPECTANCY",
                value: `$${safeStats.expectancy.toFixed(2)}`,
                sub: "PER TRADE",
                valueColor: safeStats.expectancy >= 0 ? "#22c55e" : "#ef4444",
              },
              {
                label: "PROFIT FACTOR",
                value: safeStats.profitFactor === Infinity ? "∞" : safeStats.profitFactor.toFixed(2),
                sub: `BEST: $${safeStats.bestTrade} / WORST: $${safeStats.worstTrade}`,
                valueColor: safeStats.profitFactor >= 1.5 ? "#22c55e" : "#ef4444",
              },
              {
                label: "MAX DRAWDOWN",
                value: `$${safeStats.maxDrawdown.toFixed(2)}`,
                sub: "PEAK TO TROUGH",
                valueColor: safeStats.maxDrawdown > 500 ? "#ef4444" : safeStats.maxDrawdown > 200 ? "#e8603c" : "#22c55e",
              },
              {
                label: "STREAK",
                value: `W${safeStats.maxConsecutiveWins} / L${safeStats.maxConsecutiveLosses}`,
                sub: "MAX CONSECUTIVE",
                valueColor: "#ffffff",
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px" }}
              >
                <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "8px" }}>
                  {card.label}
                </div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: card.valueColor ?? "#ffffff" }}>
                  {card.value}
                </div>
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Row 4: Daily PnL Chart */}
          <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
              DAILY P&L — EQUITY CURVE
            </div>
            {dailyPnl.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyPnl} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", color: "#fff", fontFamily: "monospace", fontSize: "11px" }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar
                    dataKey="pnl"
                    radius={[2, 2, 0, 0]}
                    fill="#ffffff"
                    /* color bars by sign */
                    {...{}}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: "#555", fontSize: "11px", textAlign: "center", padding: "40px 0" }}>
                NO DAILY DATA AVAILABLE
              </div>
            )}
          </div>

          {/* Footer status */}
          <div
            style={{
              backgroundColor: "#1c1c1c",
              border: "1px solid #2a2a2a",
              borderRadius: "4px",
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "#555", letterSpacing: "0.1em" }}>
              ANALYTIC INSIGHT // {safeStats.totalTrades} EXECUTION{safeStats.totalTrades !== 1 ? "S" : ""} PROCESSED
            </span>
            <div style={{ display: "flex", gap: "24px" }}>
              <span style={{ fontSize: "11px", color: "#888" }}>
                PROTOCOL INTEGRITY:{" "}
                <span style={{ color: "#22c55e" }}>VERIFIED</span>
              </span>
              <span style={{ fontSize: "11px", color: "#888" }}>
                SYSTEM STATUS:{" "}
                <span style={{ color: "#22c55e" }}>NOMINAL</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
