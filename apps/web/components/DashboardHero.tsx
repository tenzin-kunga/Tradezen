"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

type Props = {
  tradesThisWeek: number;
  weeklyPnl: number;
  weeklyWinRate: number;
  loading?: boolean;
};

export default function DashboardHero({ tradesThisWeek, weeklyPnl, weeklyWinRate, loading }: Props) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #1e293b 100%)" }}>
        <div style={{ height: 24, width: 200, background: "var(--bg-surface)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 40, width: 100, background: "var(--bg-surface)", borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  const hasData = tradesThisWeek > 0;

  return (
    <div className="rounded-xl p-6" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #1e293b 100%)" }}>
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)", marginBottom: 16 }}>
        Welcome back, {user?.username || "Trader"} 👋
      </h1>
      {hasData ? (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>TRADES THIS WEEK</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{tradesThisWeek}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>WEEKLY P&L</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: weeklyPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
              {weeklyPnl >= 0 ? "+" : ""}${Math.abs(weeklyPnl).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>WIN RATE</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{weeklyWinRate}%</div>
          </div>
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Start this week strong —{" "}
          <Link href="/add-trade" style={{ color: "var(--text-primary)", textDecoration: "underline" }}>
            log your first trade
          </Link>.
        </p>
      )}
    </div>
  );
}
