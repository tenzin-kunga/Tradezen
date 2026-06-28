"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

type Props = {
  tradesThisWeek: number;
  weeklyPnl: number;
  weeklyWinRate: number;
  loading?: boolean;
};

export default function DashboardHero({
  tradesThisWeek,
  weeklyPnl,
  weeklyWinRate,
  loading,
}: Props) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: "linear-gradient(135deg, var(--accent) 0%, #1e293b 100%)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="skeleton h-6 w-48" />
          <div className="flex gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 w-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasData = tradesThisWeek > 0;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "linear-gradient(135deg, var(--accent) 0%, #1e293b 100%)",
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">
          Welcome back, {user?.username || "Trader"}
        </h1>
        {hasData ? (
          <div className="flex gap-6 flex-wrap">
            <div>
              <div className="label-caps mb-1">TRADES THIS WEEK</div>
              <div className="text-2xl font-bold text-text-primary">
                {tradesThisWeek}
              </div>
            </div>
            <div>
              <div className="label-caps mb-1">WEEKLY P&L</div>
              <div
                className={`text-2xl font-bold ${weeklyPnl >= 0 ? "text-profit" : "text-loss"}`}
              >
                {weeklyPnl >= 0 ? "+" : ""}$
                {Math.abs(weeklyPnl).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="label-caps mb-1">WIN RATE</div>
              <div className="text-2xl font-bold text-text-primary">
                {weeklyWinRate}%
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Start this week strong —{" "}
            <Link href="/add-trade" className="text-text-primary underline">
              log your first trade
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
