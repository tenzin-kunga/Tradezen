"use client";

import Link from "next/link";

type Props = {
  bestStrategy: string;
  bestDay: string;
  avgRR: number;
  profitFactor: number;
  loading?: boolean;
};

export default function AnalyticsPreviewWidget({ bestStrategy, bestDay, avgRR, profitFactor, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 100, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 14, width: "50%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  const hasData = bestStrategy.length > 0 || profitFactor > 0;

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">TOP INSIGHTS</span>
        <Link href="/analytics" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          Full →
        </Link>
      </div>
      {hasData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <InsightRow label="Best Strategy" value={bestStrategy || "--"} />
          <InsightRow label="Best Day" value={bestDay || "--"} />
          <InsightRow label="Avg R:R" value={avgRR > 0 ? `${avgRR.toFixed(1)}R` : "--"} />
          <InsightRow label="Profit Factor" value={profitFactor > 0 && profitFactor < 999 ? profitFactor.toFixed(2) : profitFactor >= 999 ? "∞" : "--"} />
        </div>
      ) : (
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Analytics preview will appear after 5+ trades.</p>
      )}
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
