"use client";
import { useEffect, useState } from "react";
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

function getSeverity(count: number): { label: string; color: string } {
  if (count > 5) return { label: "CRITICAL", color: "#ef4444" };
  if (count > 2) return { label: "MODERATE", color: "#e8603c" };
  return { label: "WARNING", color: "#888888" };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [dailyPnl, setDailyPnl] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAnalytics(), getDailyPnl()])
      .then(([analyticsRes, dailyRes]) => {
        setStats(analyticsRes);
        setDailyPnl(dailyRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxStratPnl = stats?.byStrategy ? Math.max(...stats.byStrategy.map((s: any) => Math.abs(s.pnl)), 1) : 1;

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
        {stats && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em" }}>NET P/L</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: stats.totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
              {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
              WIN RATE: <span style={{ color: "#ffffff" }}>{stats.winRate}%</span>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#888", padding: "60px 0", letterSpacing: "0.2em" }}>
          LOADING PROTOCOL DATA...
        </div>
      )}

      {!loading && !stats && (
        <div style={{ textAlign: "center", color: "#555", padding: "60px 0", letterSpacing: "0.2em" }}>
          NO TRADE DATA AVAILABLE
        </div>
      )}

      {!loading && stats && stats.totalTrades > 0 && (
        <>
          {/* Row 1: Strategy Efficiency + Asset Distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Strategy Efficiency */}
            <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px" }}>
              <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.15em", marginBottom: "16px" }}>
                STRATEGY EFFICIENCY BREAKDOWN
              </div>
              {stats.byStrategy.length === 0 ? (
                <div style={{ color: "#555", fontSize: "12px" }}>NO STRATEGY DATA</div>
              ) : (
                stats.byStrategy.map((s: any) => (
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
                <BarChart data={stats.byDayOfWeek || []} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
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
                const count = stats.behavioralStats.fomoCount;
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
                const count = stats.behavioralStats.vengeanceCount;
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
                const count = stats.behavioralStats.trendAlignedCount;
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
                value: `$${stats.expectancy.toFixed(2)}`,
                sub: "PER TRADE",
                valueColor: stats.expectancy >= 0 ? "#22c55e" : "#ef4444",
              },
              {
                label: "PROFIT FACTOR",
                value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
                sub: `BEST: $${stats.bestTrade} / WORST: $${stats.worstTrade}`,
                valueColor: stats.profitFactor >= 1.5 ? "#22c55e" : "#ef4444",
              },
              {
                label: "MAX DRAWDOWN",
                value: `$${stats.maxDrawdown.toFixed(2)}`,
                sub: "PEAK TO TROUGH",
                valueColor: stats.maxDrawdown > 500 ? "#ef4444" : stats.maxDrawdown > 200 ? "#e8603c" : "#22c55e",
              },
              {
                label: "STREAK",
                value: `W${stats.maxConsecutiveWins} / L${stats.maxConsecutiveLosses}`,
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
              ANALYTIC INSIGHT // {stats.totalTrades} EXECUTION{stats.totalTrades !== 1 ? "S" : ""} PROCESSED
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
