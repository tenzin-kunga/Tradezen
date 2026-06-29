"use client";

import { useState } from "react";
import { getWeeklyReport, downloadCSV as downloadCSVApi } from "../../lib/api";

interface WeeklyReport {
  period: string;
  summary: {
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
  };
  behavioral: {
    fomoScore: number;
    discipline: number;
    consistency: number;
  };
  coaching: {
    message: string;
    severity: string;
  } | null;
  topInsights: string[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeeklyReport = async () => {
    setLoading(true);
    try {
      const data = await getWeeklyReport();
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const blob = await downloadCSVApi();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trades.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download CSV:", error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            WEEKLY REPORTS
          </h1>
          <p
            className="text-xs mt-1 tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            PERFORMANCE ANALYSIS // AUTOMATED INSIGHTS
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchWeeklyReport}
            disabled={loading}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {loading ? "GENERATING..." : "GENERATE"}
          </button>
          <button onClick={downloadCSV} className="btn-glass text-xs">
            DOWNLOAD
          </button>
        </div>
      </div>

      {!report && !loading && (
        <div
          className="text-center py-16 tracking-widest"
          style={{ color: "var(--text-dim)" }}
        >
          NO REPORT DATA AVAILABLE
        </div>
      )}

      {loading && (
        <div
          className="text-center py-16 tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          GENERATING PROTOCOL REPORT...
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="glass-card p-4 md:p-6">
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              WEEKLY SUMMARY — {report.period}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <div className="label-caps mb-1">TRADES</div>
                <div className="mono-data text-xl md:text-2xl font-bold">
                  {report.summary.totalTrades}
                </div>
              </div>
              <div>
                <div className="label-caps mb-1">P&L</div>
                <div
                  className="mono-data text-xl md:text-2xl font-bold"
                  style={{
                    color:
                      report.summary.totalPnl >= 0
                        ? "var(--accent-profit)"
                        : "var(--accent-loss)",
                  }}
                >
                  {report.summary.totalPnl >= 0 ? "+" : ""}$
                  {report.summary.totalPnl.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="label-caps mb-1">WIN RATE</div>
                <div className="mono-data text-xl md:text-2xl font-bold">
                  {report.summary.winRate}%
                </div>
              </div>
              <div>
                <div className="label-caps mb-1">PROFIT FACTOR</div>
                <div
                  className="mono-data text-xl md:text-2xl font-bold"
                  style={{
                    color:
                      report.summary.profitFactor >= 1.5
                        ? "var(--accent-profit)"
                        : "var(--accent-loss)",
                  }}
                >
                  {report.summary.profitFactor}
                </div>
              </div>
              <div>
                <div className="label-caps mb-1">EXPECTANCY</div>
                <div
                  className="mono-data text-xl md:text-2xl font-bold"
                  style={{
                    color:
                      report.summary.expectancy >= 0
                        ? "var(--accent-profit)"
                        : "var(--accent-loss)",
                  }}
                >
                  ${report.summary.expectancy.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Behavioral Scores */}
          <div className="glass-card p-4 md:p-6">
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              BEHAVIORAL ANALYSIS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-card p-4">
                <div className="label-caps mb-2">FOMO INDEX</div>
                <div
                  className="mono-data text-xl md:text-2xl font-bold"
                  style={{
                    color:
                      report.behavioral.fomoScore > 70
                        ? "var(--accent-loss)"
                        : "var(--accent-profit)",
                  }}
                >
                  {report.behavioral.fomoScore}/100
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="label-caps mb-2">DISCIPLINE</div>
                <div
                  className="mono-data text-xl md:text-2xl font-bold"
                  style={{
                    color:
                      report.behavioral.discipline < 50
                        ? "var(--accent-loss)"
                        : "var(--accent-profit)",
                  }}
                >
                  {report.behavioral.discipline}/100
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="label-caps mb-2">CONSISTENCY</div>
                <div
                  className="mono-data text-xl md:text-2xl font-bold"
                  style={{
                    color:
                      report.behavioral.consistency < 60
                        ? "var(--accent-loss)"
                        : "var(--accent-profit)",
                  }}
                >
                  {report.behavioral.consistency}/100
                </div>
              </div>
            </div>
          </div>

          {/* Coaching */}
          {report.coaching && (
            <div
              className="glass-card p-4 md:p-6"
              style={{
                borderColor:
                  report.coaching.severity === "critical"
                    ? "var(--accent-loss)"
                    : report.coaching.severity === "medium"
                      ? "var(--accent-warn)"
                      : "var(--border)",
                background:
                  report.coaching.severity === "critical"
                    ? "rgba(239, 68, 68, 0.05)"
                    : report.coaching.severity === "medium"
                      ? "rgba(245, 158, 11, 0.05)"
                      : "var(--bg-glass)",
              }}
            >
              <div
                className="text-xs tracking-widest mb-2"
                style={{
                  color:
                    report.coaching.severity === "critical"
                      ? "var(--accent-loss)"
                      : report.coaching.severity === "medium"
                        ? "var(--accent-warn)"
                        : "var(--text-muted)",
                }}
              >
                COACHING — {report.coaching.severity.toUpperCase()}
              </div>
              <p
                className="text-sm"
                style={{ color: "var(--text-primary)", margin: 0 }}
              >
                {report.coaching.message}
              </p>
            </div>
          )}

          {/* Insights */}
          <div className="glass-card p-4 md:p-6">
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              KEY INSIGHTS
            </div>
            <div className="flex flex-col gap-3">
              {report.topInsights.map((insight, i) => (
                <div key={i} className="glass-card p-3">
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {insight}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
