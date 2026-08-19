"use client";

import { useAuth } from "@/lib/auth-context";
import { AnimatedNumber } from "./AnimatedNumber";
type Props = {
  todayPnl: number;
  tradesToday: number;
  winRateToday: number;
  weeklyPnl: number;
  weeklyWinRate: number;
  totalPnl: number;
  loading?: boolean;
};

export default function DashboardHero({
  todayPnl,
  tradesToday,
  winRateToday,
  weeklyPnl,
  weeklyWinRate,
  totalPnl,
  loading,
}: Props) {
  const { user } = useAuth();
  const balance = (user?.initial_capital ?? 0) + (totalPnl || 0);

  if (loading) {
    return (
      <div className="surface-1 rounded-xl p-8 mb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="skeleton" style={{ width: 160, height: 36 }} />
            <div className="skeleton" style={{ width: 180, height: 14 }} />
          </div>
          <div className="flex gap-8">
            <div className="skeleton" style={{ width: 80, height: 40 }} />
            <div className="skeleton" style={{ width: 80, height: 40 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-1 rounded-xl p-8 mb-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-col">
          <span
            className="font-bold tracking-tight"
            style={{
              fontSize: "var(--text-4xl)",
              lineHeight: "var(--text-4xl--line-height)",
              letterSpacing: "var(--text-4xl--letter-spacing)",
              color:
                todayPnl > 0
                  ? "var(--accent-profit)"
                  : todayPnl < 0
                    ? "var(--accent-loss)"
                    : "var(--text-muted)",
            }}
          >
            {todayPnl >= 0 ? "+" : "-"}$
            <AnimatedNumber
              value={Math.abs(todayPnl)}
              decimals={2}
              duration={600}
            />
          </span>
          <span
            className="mt-1"
            style={{
              fontSize: "var(--label)",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Today&apos;s P&L
            {tradesToday > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--text-dim)" }}>·</span>{" "}
                {tradesToday} trade{tradesToday !== 1 ? "s" : ""}{" "}
                <span style={{ color: "var(--text-dim)" }}>·</span>{" "}
                {winRateToday}% win
              </>
            )}
          </span>
        </div>

        <div className="flex gap-8">
          <div className="flex flex-col">
            <span
              style={{
                fontSize: "var(--metric-primary)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              ${balance >= 0 ? "" : "-"}
              <AnimatedNumber
                value={Math.abs(balance)}
                decimals={0}
                duration={600}
              />
            </span>
            <span
              className="mt-0.5"
              style={{
                fontSize: "var(--meta)",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Balance
            </span>
          </div>
          <div className="flex flex-col">
            <span
              style={{
                fontSize: "var(--metric-primary)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {weeklyPnl >= 0 ? "+" : "-"}$
              <AnimatedNumber
                value={Math.abs(weeklyPnl)}
                decimals={0}
                duration={600}
              />
            </span>
            <span
              className="mt-0.5"
              style={{
                fontSize: "var(--meta)",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              This week
            </span>
          </div>
          <div className="flex flex-col">
            <span
              style={{
                fontSize: "var(--metric-primary)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              <AnimatedNumber value={weeklyWinRate} duration={600} />%
            </span>
            <span
              className="mt-0.5"
              style={{
                fontSize: "var(--meta)",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Week win rate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
