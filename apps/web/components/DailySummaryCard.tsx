"use client";

type Props = {
  tradesToday: number;
  winRateToday: number;
  pnlToday: number;
  openRisk: number;
  loading?: boolean;
};

export default function DailySummaryCard({ tradesToday, winRateToday, pnlToday, openRisk, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 120, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 16, width: "60%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  const hasData = tradesToday > 0;

  return (
    <div className="glass-card p-6">
      <div className="label-caps" style={{ marginBottom: 16 }}>TODAY'S TRADING</div>
      {hasData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Row label="Trades Taken" value={String(tradesToday)} />
          <Row label="Win Rate" value={`${winRateToday}%`} />
          <Row label="Current P&L" value={`${pnlToday >= 0 ? "+" : ""}$${Math.abs(pnlToday).toLocaleString()}`} color={pnlToday >= 0 ? "var(--accent-profit)" : "var(--accent-loss)"} />
          <Row label="Open Risk" value={`$${openRisk.toLocaleString()}`} color="var(--accent-warn)" />
        </div>
      ) : (
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No trading activity today.</p>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: color || "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
