"use client";

type Props = {
  disciplineScore: number;
  fomoScore: "Low" | "Medium" | "High";
  revengeTradesThisMonth: number;
  trendAlignment: number;
  loading?: boolean;
};

export default function BehaviorAnalyticsWidget({
  disciplineScore,
  fomoScore,
  revengeTradesThisMonth,
  trendAlignment,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 140, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 14, width: "70%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  const fomoColor = fomoScore === "Low" ? "var(--accent-profit)" : fomoScore === "Medium" ? "var(--accent-warn)" : "var(--accent-loss)";

  return (
    <div className="glass-card p-6">
      <div className="label-caps" style={{ marginBottom: 16 }}>BEHAVIOR ANALYTICS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <BarRow label="Discipline" value={`${disciplineScore}/100`} pct={disciplineScore} color={disciplineScore >= 70 ? "var(--accent-profit)" : disciplineScore >= 40 ? "var(--accent-warn)" : "var(--accent-loss)"} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>FOMO Score</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: fomoColor }}>{fomoScore}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Revenge Trades</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: revengeTradesThisMonth > 0 ? "var(--accent-loss)" : "var(--accent-profit)" }}>
            {revengeTradesThisMonth} this month
          </span>
        </div>
        <BarRow label="Trend Alignment" value={`${trendAlignment}%`} pct={trendAlignment} color={trendAlignment >= 60 ? "var(--accent-profit)" : "var(--accent-warn)"} />
      </div>
    </div>
  );
}

function BarRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-surface-hover)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}
